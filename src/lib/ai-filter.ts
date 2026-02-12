/**
 * AI-powered menu filtering for custom allergen tags
 * Uses Claude to analyze menu item ingredients against custom restrictions
 */

import Anthropic from "@anthropic-ai/sdk";
import { MenuItem } from "./menu-service";
import { FilterResult, FilteredItem, filterMenu } from "./filter-menu";
import { CustomTag } from "./allergens";

interface AIFilterResponse {
  itemName: string;
  status: "safe" | "caution" | "excluded";
  warnings: string[];
  reason: string;
}

/**
 * Filter menu using AI for custom tags
 * First applies standard column-based filtering, then uses AI for custom restrictions
 */
export async function filterMenuWithAI(
  menu: MenuItem[],
  standardAllergens: string[],
  customTags: CustomTag[]
): Promise<FilterResult> {
  // First, apply standard column-based filtering for known allergens
  let preFilteredItems = menu;
  let standardExcludedCount = 0;
  const standardWarnings = new Map<string, string[]>();

  if (standardAllergens.length > 0) {
    const standardResult = filterMenu(menu, standardAllergens);
    standardExcludedCount = standardResult.excludedCount;

    // Keep safe and caution items for AI analysis
    preFilteredItems = [
      ...standardResult.safeItems.map(f => f.item),
      ...standardResult.cautionItems.map(f => f.item)
    ];

    // Track standard warnings for caution items
    for (const cautionItem of standardResult.cautionItems) {
      standardWarnings.set(cautionItem.item.name, cautionItem.warnings);
    }
  }

  // If no items left after standard filtering, return early
  if (preFilteredItems.length === 0) {
    return {
      safeItems: [],
      cautionItems: [],
      excludedCount: standardExcludedCount,
    };
  }

  // Analyze remaining items with AI for custom tags
  const customTagTexts = customTags.map(t => t.text);
  const aiResults = await analyzeMenuItemsWithAI(preFilteredItems, customTagTexts);

  // Build final results
  const safeItems: FilteredItem[] = [];
  const cautionItems: FilteredItem[] = [];
  let aiExcludedCount = 0;

  for (const item of preFilteredItems) {
    const aiResult = aiResults.get(item.name);
    const existingWarnings = standardWarnings.get(item.name) || [];

    if (!aiResult || aiResult.status === "excluded") {
      aiExcludedCount++;
      continue;
    }

    // Combine standard warnings with AI warnings
    const combinedWarnings = [...existingWarnings];
    if (aiResult.warnings.length > 0) {
      combinedWarnings.push(...aiResult.warnings);
    }

    if (aiResult.status === "safe" && combinedWarnings.length === 0) {
      safeItems.push({
        item,
        safe: true,
        warnings: [],
        excluded: [],
      });
    } else {
      // caution or has warnings from standard filtering
      cautionItems.push({
        item,
        safe: false,
        warnings: combinedWarnings.length > 0 ? combinedWarnings : customTagTexts,
        excluded: [],
      });
    }
  }

  return {
    safeItems,
    cautionItems,
    excludedCount: standardExcludedCount + aiExcludedCount,
  };
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
      // On failure, mark batch as caution
      for (const item of batch) {
        results.set(item.name, {
          itemName: item.name,
          status: "caution",
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

For each item, determine:
- "safe": The item clearly does NOT contain any of the restricted ingredients based on the listed ingredients
- "caution": The item MIGHT contain restricted items, or it's unclear from the ingredients - customer should ask staff
- "excluded": The item DEFINITELY contains one or more restricted ingredients based on the listed ingredients

Consider common knowledge:
- FODMAPs include onions, garlic, wheat, certain fruits, legumes, honey, etc.
- Nightshades include tomatoes, potatoes, peppers, eggplant, paprika
- Cruciferous vegetables include broccoli, cauliflower, cabbage, kale, brussels sprouts
- Stone fruits include peaches, plums, cherries, apricots
- Citrus includes oranges, lemons, limes, grapefruit

Be conservative - if you're not sure, use "caution" rather than "safe".

Respond with ONLY a valid JSON array in this exact format, no other text:
[
  {
    "itemName": "Exact Item Name",
    "status": "safe",
    "warnings": [],
    "reason": "No restricted ingredients found"
  }
]`;

  const response = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  // Parse the JSON response
  const parsed: AIFilterResponse[] = JSON.parse(content.text);
  const resultMap = new Map<string, AIFilterResponse>();

  for (const result of parsed) {
    resultMap.set(result.itemName, result);
  }

  // Ensure all items have a result (fallback to caution if missing)
  for (const item of items) {
    if (!resultMap.has(item.name)) {
      resultMap.set(item.name, {
        itemName: item.name,
        status: "caution",
        warnings: ["Unable to determine - please ask staff"],
        reason: "Item not analyzed",
      });
    }
  }

  return resultMap;
}

/**
 * Fallback: mark all items as caution when AI is unavailable
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
      warnings: [`Please verify with staff regarding: ${restrictions.join(", ")}`],
      reason: "AI analysis unavailable",
    });
  }
  return results;
}
