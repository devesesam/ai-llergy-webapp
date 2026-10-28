/**
 * AI-powered menu filtering for custom allergen tags
 * Uses Claude to analyze menu item ingredients against custom restrictions
 * Now includes confidence scores for severity-based filtering
 */

import Anthropic from "@anthropic-ai/sdk";
import { MenuItem } from "./menu-service";
import { CustomTag, SeverityType } from "./allergens";
import { SEVERITY_THRESHOLDS, getFilterCategory } from "./confidence";

interface AIFilterResponse {
  itemName: string;
  status: "safe" | "caution" | "excluded";
  confidence: number; // 0-100 confidence score
  warnings: string[];
  reason: string;
}

// Structured output schema for analyzeItemBatch (root must be an object)
const AI_FILTER_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          itemName: { type: "string" },
          status: { type: "string", enum: ["safe", "caution", "excluded"] },
          confidence: { type: "integer" },
          warnings: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
        required: ["itemName", "status", "confidence", "warnings", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/**
 * Get the strictest severity from a list of severities
 * Order: life_threatening > allergy > preference
 */
function getStrictestSeverity(severities: SeverityType[]): SeverityType {
  if (severities.includes("life_threatening")) return "life_threatening";
  if (severities.includes("allergy")) return "allergy";
  return "preference";
}

export type AIVerdict = "safe" | "caution" | "excluded";

/**
 * The AI BACKUP check, for restrictions the sheet can't answer: free text that isn't
 * an allergen or an ingredient on this menu, and allergens with no sheet column.
 * Returns one verdict per dish name; the caller keeps every sheet-derived note (CAN BE,
 * chef swaps) and only adds this verdict on top. A dish the AI didn't return, or
 * returned with its own warnings, is never "safe": missing → excluded, warnings → caution.
 */
export async function aiVerdicts(items: MenuItem[], tags: CustomTag[]): Promise<Map<string, AIVerdict>> {
  const verdicts = new Map<string, AIVerdict>();
  if (items.length === 0 || tags.length === 0) return verdicts;

  const aiResults = await analyzeMenuItemsWithAI(items, tags.map((t) => t.text));
  const strictestSeverity = getStrictestSeverity(tags.map((t) => t.type || "preference"));
  const threshold = SEVERITY_THRESHOLDS[strictestSeverity];
  console.log(`[ai-filter] Using severity threshold: ${strictestSeverity} (${threshold * 100}%)`);

  for (const item of items) {
    const aiResult = aiResults.get(item.name);
    if (!aiResult) {
      verdicts.set(item.name, "excluded");
      continue;
    }
    const category = getFilterCategory(aiResult.confidence / 100, threshold);
    verdicts.set(item.name, category === "safe" && aiResult.warnings.length > 0 ? "caution" : category);
  }
  return verdicts;
}

/**
 * Analyze menu items with AI for custom restrictions
 * Batches items to reduce API calls
 */
async function analyzeMenuItemsWithAI(
  items: MenuItem[],
  customRestrictions: string[]
): Promise<Map<string, AIFilterResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured for AI filtering");
    // Return all as caution - safest fallback
    return fallbackToCaution(items, customRestrictions);
  }

  const client = new Anthropic({ apiKey });

  // Batch items (max 20 per call to stay within token limits)
  const BATCH_SIZE = 20;
  const results = new Map<string, AIFilterResponse>();

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    try {
      const batchResults = await analyzeItemBatch(client, batch, customRestrictions);
      batchResults.forEach((v, k) => results.set(k, v));
    } catch (error) {
      console.error("AI batch analysis failed:", error);
      // On failure, mark batch as caution with 50% confidence
      for (const item of batch) {
        results.set(item.name, {
          itemName: item.name,
          status: "caution",
          confidence: 50,
          warnings: ["AI analysis unavailable - please verify with staff"],
          reason: "Unable to analyze automatically",
        });
      }
    }
  }

  return results;
}

/**
 * Analyze a batch of items with AI
 */
async function analyzeItemBatch(
  client: Anthropic,
  items: MenuItem[],
  restrictions: string[]
): Promise<Map<string, AIFilterResponse>> {
  const itemDescriptions = items.map(item => ({
    name: item.name,
    ingredients: item.ingredients,
  }));

  const prompt = `You are a food safety analyzer for a restaurant. Analyze each menu item for the following dietary restrictions:

RESTRICTIONS: ${restrictions.join(", ")}

MENU ITEMS:
${JSON.stringify(itemDescriptions, null, 2)}

For each item, provide:
1. "status": Your assessment
   - "safe": The item clearly does NOT contain any of the restricted ingredients
   - "caution": The item MIGHT contain restricted items, or it's unclear
   - "excluded": The item DEFINITELY contains one or more restricted ingredients

2. "confidence": A score from 0-100 indicating how certain you are that the item is FREE of the restrictions
   - 90-100: Ingredients clearly show no presence of restricted items
   - 70-89: Likely safe, but ingredient list may be incomplete
   - 40-69: Uncertain, might contain hidden sources
   - 0-39: Likely contains or definitely contains restricted items

Consider when determining confidence:
- Is the ingredient list detailed and complete?
- Are there common hidden sources of these ingredients?
- Could this dish typically contain these items even if not listed?

Common knowledge:
- FODMAPs include onions, garlic, wheat, certain fruits, legumes, honey, etc.
- Nightshades include tomatoes, potatoes, peppers, eggplant, paprika
- Cruciferous vegetables include broccoli, cauliflower, cabbage, kale, brussels sprouts
- Stone fruits include peaches, plums, cherries, apricots
- Citrus includes oranges, lemons, limes, grapefruit

Be conservative - if you're not sure, lower the confidence score.

Return one entry per menu item, using the exact item name as "itemName".`;

  const response = await client.messages.create({
    model: "claude-haiku-5-5",
    // Haiku 5.5 thinks by default and thinking counts toward max_tokens
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: AI_FILTER_SCHEMA },
    },
    messages: [{ role: "user", content: prompt }],
  });

  // Refusal or truncation: throw so the caller marks the batch as caution
  if (response.stop_reason !== "end_turn") {
    throw new Error(`AI analysis stopped early: ${response.stop_reason}`);
  }

  // The response can begin with thinking blocks - find the text block by type
  const content = response.content.find(block => block.type === "text");
  if (!content) {
    throw new Error("No text in AI response");
  }

  const parsed: { items: AIFilterResponse[] } = JSON.parse(content.text);
  const resultMap = new Map<string, AIFilterResponse>();

  for (const result of parsed.items) {
    resultMap.set(result.itemName, {
      ...result,
      confidence: Math.min(100, Math.max(0, result.confidence)),
    });
  }

  // Ensure all items have a result (fallback to caution if missing)
  for (const item of items) {
    if (!resultMap.has(item.name)) {
      resultMap.set(item.name, {
        itemName: item.name,
        status: "caution",
        confidence: 50,
        warnings: ["Unable to determine - please ask staff"],
        reason: "Item not analyzed",
      });
    }
  }

  return resultMap;
}

/**
 * Fallback: mark all items as caution when AI is unavailable
 * Uses 50% confidence - will pass for preference, fail for allergy/life_threatening
 */
function fallbackToCaution(
  items: MenuItem[],
  restrictions: string[]
): Map<string, AIFilterResponse> {
  const results = new Map<string, AIFilterResponse>();
  for (const item of items) {
    results.set(item.name, {
      itemName: item.name,
      status: "caution",
      confidence: 50, // Uncertain - will be filtered based on severity threshold
      warnings: [`Please verify with staff regarding: ${restrictions.join(", ")}`],
      reason: "AI analysis unavailable",
    });
  }
  return results;
}
