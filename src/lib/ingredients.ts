/**
 * Ingredient matching against the sheet's Ingredients column (no LLM).
 *
 * A guest who types an ingredient ("coriander") is matched against each dish's
 * name + listed ingredients: whole words only, case-insensitive, plurals folded
 * ("tomatoes" = "tomato"), so "egg" never matches "eggplant" and "nut" never
 * matches "nutmeg". Words the sheet doesn't know fall back to the AI check
 * (see route.ts). Shared by the dropdown (client) and the submit route (server),
 * so this file must stay free of server-only imports.
 */

/** Filler words stripped from a typed query ("no coriander please" → "coriander"). */
export const STOP_WORDS = new Set([
  "i", "im", "i'm", "my", "me", "we", "our", "you", "your",
  "a", "an", "the", "and", "or", "but", "to", "of", "in", "on", "at", "for", "with",
  "can", "can't", "cant", "cannot", "don't", "dont", "do", "does", "doesn't",
  "have", "has", "had", "am", "is", "are", "was", "were", "be", "been",
  "eat", "eating", "consume", "consuming", "take", "taking",
  "allergic", "allergy", "allergies", "intolerant", "intolerance", "sensitive", "sensitivity",
  "no", "not", "avoid", "avoiding", "free", "without",
  "please", "need", "want", "like", "would",
]);

// Same ingredient, different name. Both directions are listed.
const SYNONYMS: Record<string, string[]> = {
  cilantro: ["coriander"],
  coriander: ["cilantro"],
  aubergine: ["eggplant"],
  eggplant: ["aubergine"],
  courgette: ["zucchini"],
  zucchini: ["courgette"],
  scallion: ["spring onion"],
  "spring onion": ["scallion"],
  chili: ["chilli"],
  chilli: ["chili"],
};

/** Fold one word: lowercase, letters only, simple plural → singular. */
export function normWord(w: string): string {
  let s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (s.length > 4 && s.endsWith("ies")) s = s.slice(0, -3) + "y";
  else if (s.length > 4 && s.endsWith("oes")) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us")) s = s.slice(0, -1);
  return s;
}

/** A phrase as folded words joined by single spaces. */
export function normPhrase(text: string): string {
  return text
    .split(/[^A-Za-z']+/)
    .map(normWord)
    .filter(Boolean)
    .join(" ");
}

/** What the guest typed, minus filler words, folded. "No coriander please" → "coriander". */
export function cleanQuery(text: string): string {
  return text
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
    .map(normWord)
    .filter(Boolean)
    .join(" ");
}

/** The term plus its synonyms, all folded. */
export function termVariants(term: string): string[] {
  const t = normPhrase(term);
  return [t, ...(SYNONYMS[t] ?? []).map(normPhrase)];
}

/** Whole-word phrase containment on folded text. */
export function textContains(normText: string, normTerm: string): boolean {
  return normTerm.length > 0 && ` ${normText} `.includes(` ${normTerm} `);
}

/** Does this dish (name + listed ingredients) contain the term or a synonym of it? */
export function dishMatches(name: string, ingredients: string, term: string): boolean {
  const text = normPhrase(`${name} ${ingredients}`);
  return termVariants(term).some((v) => textContains(text, v));
}

/**
 * Split an Ingredients cell into phrases: commas outside brackets separate items,
 * and each bracket's contents are items too.
 * "Soybean Paste (Water, Salt), Coriander" → ["Soybean Paste", "Water", "Salt", "Coriander"].
 */
export function splitIngredients(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const push = () => {
    const p = cur.trim();
    if (p) out.push(p);
    cur = "";
  };
  for (const ch of text) {
    if (ch === "(" || ch === "[") {
      depth++;
      push();
    } else if (ch === ")" || ch === "]") {
      depth = Math.max(0, depth - 1);
      push();
    } else if (ch === "," || ch === ";" || ch === ".") {
      push();
    } else cur += ch;
  }
  push();
  return out;
}

export interface IngredientIndex {
  /** One entry per dish: its folded name + ingredients text. */
  dishes: string[];
  /** Searchable terms (folded key → display label), from every listed phrase and word. */
  terms: { key: string; label: string }[];
}

const titleCase = (s: string) => s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/** Build the per-venue index served by /api/ingredients. */
export function buildIngredientIndex(items: { name: string; ingredients: string }[]): IngredientIndex {
  const labels = new Map<string, string>();
  const add = (raw: string) => {
    const key = normPhrase(raw);
    if (key.length < 3 || key.split(" ").length > 4 || labels.has(key)) return;
    labels.set(key, titleCase(raw.trim()));
  };
  for (const item of items) {
    for (const phrase of splitIngredients(item.ingredients)) {
      add(phrase);
      for (const w of phrase.split(/\s+/)) if (!STOP_WORDS.has(w.toLowerCase())) add(w);
    }
  }
  return {
    dishes: items.map((i) => normPhrase(`${i.name} ${i.ingredients}`)),
    terms: [...labels].map(([key, label]) => ({ key, label })),
  };
}

export interface IngredientMatch {
  key: string; // folded term, sent to the server as the tag's `ingredient`
  label: string; // "Coriander"
  count: number; // dishes on this menu that contain it
}

const countDishes = (index: IngredientIndex, key: string) => {
  const variants = termVariants(key);
  return index.dishes.filter((d) => variants.some((v) => textContains(d, v))).length;
};

/**
 * Ingredient options for the dropdown: the exact term first, then terms that start
 * with what's typed ("corian" → Coriander), most common first. Only terms found in
 * at least one dish.
 */
export function searchIngredients(index: IngredientIndex, query: string, limit = 3): IngredientMatch[] {
  const q = cleanQuery(query);
  if (q.length < 3) return [];
  const found = new Map<string, IngredientMatch>();
  const consider = (key: string, label: string) => {
    if (found.has(key)) return;
    const count = countDishes(index, key);
    if (count > 0) found.set(key, { key, label, count });
  };
  // A synonym ("cilantro") or a typed phrase that isn't a listed term still counts.
  const exact = index.terms.find((t) => t.key === q);
  consider(q, exact?.label ?? titleCase(query.trim()));
  for (const t of index.terms) {
    if (t.key !== q && (t.key.startsWith(q) || t.key.split(" ").some((w) => w.startsWith(q)))) consider(t.key, t.label);
  }
  const all = [...found.values()];
  const head = all.filter((m) => m.key === q);
  // An exact term already covers every phrase containing it ("coriander" ⊇ "ground coriander").
  if (head.length > 0) return head;
  const rest = all
    .filter((m) => m.key !== q)
    .sort((a, b) => b.count - a.count || a.key.length - b.key.length || a.key.localeCompare(b.key));
  return [...head, ...rest].slice(0, limit);
}
