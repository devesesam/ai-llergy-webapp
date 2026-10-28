/**
 * Sheet-first filtering for ingredient tags ("coriander" picked from the dropdown).
 *
 * Deterministic, no LLM: a dish whose name or listed ingredients contain the term is
 * excluded, unless the chef's Substitutions tab has a row for that dish that removes or
 * swaps out that ingredient (and introduces nothing else the guest avoids); then the
 * dish moves to "Can be modified" with that instruction. Applied to every bucket the
 * column filter produced, so a dish rescued for gluten that still contains coriander
 * is never offered.
 */
import type { CustomTag } from "./allergens";
import type { FilteredItem } from "./filter-menu";
import { Substitution, normalizeDishName } from "./substitutions";
import { dishMatches, normPhrase, termVariants, textContains } from "./ingredients";

export interface Buckets {
  safeItems: FilteredItem[];
  cautionItems: FilteredItem[]; // CAN BE (warnings are allergen ids)
  modifiableItems: FilteredItem[];
  excludedCount: number;
}

/** "Ask to remove Coriander (makes it coriander-free)" / "Swap A → B (makes it coriander-free)". */
function ingredientMod(sub: Substitution, label: string): string {
  const free = `(makes it ${label.toLowerCase()}-free)`;
  if (sub.action === "remove") return `Ask to remove ${sub.ingredient || label} ${free}`;
  return `Swap ${sub.ingredient || label} → ${sub.substitute || "an alternative"} ${free}`;
}

export function applyIngredientTags(
  buckets: Buckets,
  tags: CustomTag[],
  substitutionsByDish: Map<string, Substitution[]>,
  selectedAllergenIds: string[]
): Buckets {
  const terms = tags.filter((t) => t.ingredient);
  if (terms.length === 0) return buckets;
  const selected = new Set(selectedAllergenIds.map((a) => a.toLowerCase()));

  const out: Buckets = { safeItems: [], cautionItems: [], modifiableItems: [], excludedCount: buckets.excludedCount };

  const check = (f: FilteredItem, keep: (f: FilteredItem) => void) => {
    const hits = terms.filter((t) => dishMatches(f.item.name, f.item.ingredients, t.ingredient!));
    if (hits.length === 0) return keep(f);
    const dishSubs = substitutionsByDish.get(normalizeDishName(f.item.name)) ?? [];
    const mods: string[] = [];
    for (const t of hits) {
      const variants = termVariants(t.ingredient!);
      const sub = dishSubs.find(
        (s) =>
          variants.some((v) => textContains(normPhrase(s.ingredient), v)) &&
          !s.introduces.some((i) => selected.has(i))
      );
      if (!sub) {
        out.excludedCount++;
        return;
      }
      mods.push(ingredientMod(sub, t.displayLabel));
    }
    // Rescued. Its column CAN BE ids stay in `warnings`; the route shows them with the swaps.
    out.modifiableItems.push({ ...f, modifications: [...(f.modifications ?? []), ...mods] });
  };

  buckets.safeItems.forEach((f) => check(f, (x) => out.safeItems.push(x)));
  buckets.cautionItems.forEach((f) => check(f, (x) => out.cautionItems.push(x)));
  buckets.modifiableItems.forEach((f) => check(f, (x) => out.modifiableItems.push(x)));
  return out;
}
