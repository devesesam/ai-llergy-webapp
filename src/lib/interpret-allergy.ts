/**
 * AI-powered custom allergy text interpreter
 * Uses Claude to map free-form text to known allergen IDs
 */

import Anthropic from "@anthropic-ai/sdk";
import { ALL_FILTERS } from "./allergens";

const KNOWN_ALLERGENS = ALL_FILTERS.map((a) => a.id);

// Common synonyms and related terms for each allergen
const SYNONYM_MAP: Record<string, string[]> = {
  // Dietary preferences
  vegetarian: ["veggie", "no meat", "meatless"],
  vegan: ["plant-based", "plant based", "no animal"],

  // Big 9 allergens
  peanuts: ["peanut", "groundnut", "groundnuts", "arachis"],
  treenuts: ["tree nut", "tree nuts", "nuts", "nut allergy"],
  eggs: ["egg", "ova", "albumin", "mayonnaise", "mayo", "meringue"],
  dairy: ["milk", "lactose", "cheese", "butter", "cream", "yogurt", "whey", "casein"],
  gluten: ["barley", "rye", "celiac", "coeliac"],
  soy: ["soya", "soybean", "soybeans", "tofu", "edamame"],
  fish: ["cod", "salmon", "tuna", "anchovy", "anchovies", "sardine", "sardines", "tilapia", "halibut"],
  shellfish: ["shrimp", "crab", "lobster", "prawn", "prawns", "crawfish", "crayfish", "scampi"],
  sesame: ["tahini", "sesame seeds"],

  // Specific nuts
  almond: ["almonds"],
  walnut: ["walnuts"],
  pistachio: ["pistachios"],

  // Less common / regional
  wheat: ["semolina", "durum", "spelt", "farina", "farro", "bulgur"],
  mustard: ["dijon"],
  sulfites: ["sulfite", "sulphite", "sulphites", "so2", "preservatives"],
  garlic: [],
  onion: ["onions", "shallot", "shallots", "leek", "leeks"],
  celery: ["celeriac"],
  chili: ["chilli", "chillies", "chilies", "spicy", "hot pepper"],
  capsicum: ["bell pepper", "bell peppers", "peppers"],
  lupin: ["lupine", "lupini", "lupin beans"],
  molluscs: ["mollusk", "mollusks", "squid", "octopus", "clam", "clams", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops", "snail", "snails"],
};

/**
 * Quick local matching before calling AI
 * Returns matched allergen IDs or null if AI is needed
 */
function quickMatch(text: string): string[] | null {
  const normalized = text.toLowerCase().trim();
  const matches: Set<string> = new Set();

  // Check direct allergen names
  for (const allergen of KNOWN_ALLERGENS) {
    if (normalized.includes(allergen)) {
      matches.add(allergen);
    }
  }

  // Check synonyms
  for (const [allergen, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const synonym of synonyms) {
      if (normalized.includes(synonym)) {
        matches.add(allergen);
      }
    }
  }

  // If we found matches, return them
  if (matches.size > 0) {
    return Array.from(matches);
  }

  // Return null to indicate AI should be used
  return null;
}

/**
 * Use Claude to interpret complex or misspelled allergy text
 */
async function aiInterpret(text: string): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set, skipping AI interpretation");
    return [];
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are an allergy text interpreter for a restaurant menu system.

Map the following user text to any matching allergens from this list:
${KNOWN_ALLERGENS.join(", ")}

User text: "${text}"

Rules:
- Handle spelling errors (e.g., "dary" → dairy, "glutin" → gluten)
- Handle synonyms (e.g., "lactose" → dairy, "wheat" → gluten)
- Handle related terms (e.g., "tree nuts" → pistachio, walnut, almond)
- Only return allergens from the known list
- If no matches, return empty array

Respond with ONLY a JSON array of matching allergen IDs, nothing else.
Example: ["dairy", "gluten"]`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") return [];

    // Parse the JSON response
    const parsed = JSON.parse(content.text);
    if (!Array.isArray(parsed)) return [];

    // Validate each ID is in our known list
    return parsed.filter((id: string) => KNOWN_ALLERGENS.includes(id));
  } catch (error) {
    console.error("AI interpretation failed:", error);
    return [];
  }
}

export interface InterpretResult {
  matchedAllergens: string[];
  unmatchedText: string | null; // Text that couldn't be matched
  method: "local" | "ai" | "none";
}

/**
 * Interpret custom allergy text
 * First tries quick local matching, falls back to AI for complex cases
 */
export async function interpretCustomAllergy(text: string): Promise<InterpretResult> {
  if (!text || text.trim().length === 0) {
    return { matchedAllergens: [], unmatchedText: null, method: "none" };
  }

  const trimmed = text.trim();

  // Try quick local match first
  const quickMatches = quickMatch(trimmed);
  if (quickMatches !== null) {
    return {
      matchedAllergens: quickMatches,
      unmatchedText: null,
      method: "local",
    };
  }

  // Fall back to AI for complex/misspelled text
  const aiMatches = await aiInterpret(trimmed);

  return {
    matchedAllergens: aiMatches,
    unmatchedText: aiMatches.length === 0 ? trimmed : null,
    method: "ai",
  };
}
