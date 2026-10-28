/**
 * AI-powered custom allergy text interpreter
 * Uses Claude to map free-form text to known allergen IDs
 */

import Anthropic from "@anthropic-ai/sdk";
import { ALL_FILTERS } from "./allergens";
import { STOP_WORDS, normWord } from "./ingredients";

const KNOWN_ALLERGENS = ALL_FILTERS.map((a) => a.id);

// Common synonyms and related terms for each allergen
export const SYNONYM_MAP: Record<string, string[]> = {
  // Dietary preferences
  vegetarian: ["veggie", "no meat", "meatless"],
  vegan: ["plant-based", "plant based", "no animal"],
  halal: ["halaal", "zabiha", "no pork", "no alcohol"],

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
  // Not plain "peppers": black / white / Sichuan pepper are not capsicum.
  capsicum: ["bell pepper", "bell peppers"],
  nightshades: ["nightshade", "tomato", "potato", "eggplant", "aubergine", "paprika"],
  lupin: ["lupine", "lupini", "lupin beans"],
  molluscs: ["mollusk", "mollusks", "squid", "octopus", "clam", "clams", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops", "snail", "snails"],
};

export interface SearchResult {
  allergenId: string;
  matchedTerm: string; // The synonym or name that matched
  isExactMatch: boolean;
  isFuzzyMatch?: boolean; // True if matched via Levenshtein distance
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Is `query` a likely misspelling of `target`? One edit for 4 to 7 letters, two for
 * 8+; never for shorter words. Only used when nothing else matched (see searchSynonyms),
 * so a real ingredient ("mint", "salt", "cumin") is never "corrected" to an allergen.
 */
function isFuzzyMatch(query: string, target: string): boolean {
  if (query.length < 4) return false;
  const maxDistance = query.length >= 8 ? 2 : 1;
  if (Math.abs(query.length - target.length) > maxDistance) return false;
  const distance = levenshteinDistance(query, target);
  return distance <= maxDistance && distance > 0; // distance > 0 means not exact
}

/** Every searchable allergen term: ids, labels and synonyms, lowercased. */
function allTerms(): { allergenId: string; term: string }[] {
  const terms: { allergenId: string; term: string }[] = [];
  for (const a of ALL_FILTERS) {
    terms.push({ allergenId: a.id, term: a.id });
    terms.push({ allergenId: a.id, term: a.label.toLowerCase() });
  }
  for (const [allergen, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const synonym of synonyms) terms.push({ allergenId: allergen, term: synonym });
  }
  return terms;
}

/**
 * Allergen suggestions for what the guest typed.
 *
 * The WHOLE query is matched (filler words like "no" / "free" / "allergy" stripped):
 *   1. exact: the query is an allergen name or synonym ("egg" → Eggs, and nothing else);
 *   2. word-prefix: the query starts a word of a term ("glut" → Gluten, "pepper" → Capsicum);
 *   3. fuzzy (a misspelling, "glutin" → Gluten): only when nothing else matched.
 * A multi-word query with no whole match ("peanuts or dairy") falls back to exact matches
 * of its words. Words are never matched inside other words, so "coriander seed" no longer
 * suggests Sesame and "egg" no longer suggests Nightshades (eggplant).
 *
 * `ingredient` says whether the query is an ingredient on this venue's menu (from
 * searchIngredients): "exact" → exact allergen matches only (so "pea" doesn't suggest
 * Peanuts, "coconut milk" doesn't suggest Dairy); "partial" → no fuzzy and no word
 * fallback; "none" (default) → everything above.
 */
export function searchSynonyms(
  query: string,
  opts: { ingredient?: "exact" | "partial" | "none" } = {}
): SearchResult[] {
  const ingredient = opts.ingredient ?? "none";
  const tokens = query
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
  const q = tokens.join(" ");
  if (!q) return [];

  const terms = allTerms();
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const add = (allergenId: string, term: string, kind: "exact" | "prefix" | "fuzzy") => {
    if (seen.has(allergenId)) return;
    seen.add(allergenId);
    results.push({ allergenId, matchedTerm: term, isExactMatch: kind === "exact", isFuzzyMatch: kind === "fuzzy" });
  };
  const byName = (a: SearchResult, b: SearchResult) => a.allergenId.localeCompare(b.allergenId);

  // Plurals count as exact ("peanut" = "peanuts", "eggs" = "egg").
  const fold = (s: string) => s.split(" ").map(normWord).join(" ");
  const fq = fold(q);
  for (const { allergenId, term } of terms) if (term === q || fold(term) === fq) add(allergenId, term, "exact");
  if (results.length > 0 || ingredient === "exact") return results.sort(byName);

  if (q.length >= 2) {
    for (const { allergenId, term } of terms) {
      if (term.startsWith(q) || term.split(" ").some((w) => w.startsWith(q))) add(allergenId, term, "prefix");
    }
    if (results.length > 0) return results.sort(byName);
  }

  if (ingredient !== "none") return results;

  if (tokens.length > 1) {
    for (const t of tokens) {
      for (const { allergenId, term } of terms) if (term === t || fold(term) === normWord(t)) add(allergenId, term, "exact");
    }
    if (results.length > 0) return results.sort(byName);
  }

  if (tokens.length === 1) {
    for (const { allergenId, term } of terms) {
      if (!term.includes(" ") && isFuzzyMatch(q, term)) add(allergenId, term, "fuzzy");
    }
  }
  return results.sort(byName);
}

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
- If no matches, return an empty list`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-5-5",
      // Room for thinking (counts toward max_tokens) plus the short answer
      max_tokens: 1024,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              allergens: {
                type: "array",
                items: { type: "string", enum: KNOWN_ALLERGENS },
              },
            },
            required: ["allergens"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content: prompt }],
    });

    // Refusal or truncation: no usable answer
    if (response.stop_reason !== "end_turn") {
      console.error("AI interpretation stopped early:", response.stop_reason);
      return [];
    }

    // The response can begin with thinking blocks - find the text block by type
    const content = response.content.find(block => block.type === "text");
    if (!content) return [];

    const parsed: { allergens: string[] } = JSON.parse(content.text);

    // Validate each ID is in our known list
    return parsed.allergens.filter(id => KNOWN_ALLERGENS.includes(id));
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
