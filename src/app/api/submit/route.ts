import { NextRequest, NextResponse } from "next/server";
import type { SelectedAllergen, CustomTag } from "@/lib/allergens";
import { ALLERGEN_TO_COLUMN, getAllergenById } from "@/lib/allergens";
import { getMenu, getCacheStatus, getAvailableColumns, getSubstitutions } from "@/lib/menu-service";
import { getVenueBySlug } from "@/lib/venues";
import {
  filterMenu,
  filterMenuWithConfidence,
  hasConfidenceScores,
  formatWarnings,
  FilteredItem,
} from "@/lib/filter-menu";
import { aiVerdicts } from "@/lib/ai-filter";
import { applyIngredientTags, type Buckets } from "@/lib/ingredient-filter";
import type { AllergenWithSeverity } from "@/lib/confidence";

interface SubmissionBody {
  allergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
  venueSlug?: string;
}

interface ItemOut {
  name: string;
  ingredients: string;
  price: number;
  warnings: string[];
}

export interface MenuResponse {
  success: boolean;
  safeItems: ItemOut[];
  /** Sheet "CAN BE": the kitchen can make it suit the guest ("Can be made Gluten-free on request"). */
  cautionItems: ItemOut[];
  /** The AI backup wasn't sure: "May contain truffle. Please check with staff." */
  checkItems: ItemOut[];
  modifiedItems: Array<ItemOut & { modifications: string[] }>;
  excludedCount: number;
  meta: {
    totalItems: number;
    allergenFilters: string[];
    /** At least one ingredient tag was checked against the sheet's ingredient lists. */
    ingredientsChecked: boolean;
    cacheStatus: { cached: boolean; age: number };
  };
}

const base = (f: FilteredItem) => ({ name: f.item.name, ingredients: f.item.ingredients, price: f.item.price });

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SubmissionBody = await request.json();
    const { allergens, customAllergenIds, customTags, venueSlug } = body;

    // Validate input
    if (!Array.isArray(allergens)) {
      return NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }

    // Resolve which venue's menu to filter. Default to "kisa" for backwards
    // compatibility with any caller that doesn't send a venueSlug.
    const venue = getVenueBySlug(venueSlug || "kisa");
    if (!venue) {
      return NextResponse.json(
        { error: `Unknown venue: ${venueSlug}` },
        { status: 400 }
      );
    }

    // Extract allergen IDs and preserve severity for confidence-based filtering
    const allergenIds = allergens.map((a: SelectedAllergen) => a.id);
    const allergensWithSeverity: AllergenWithSeverity[] = allergens.map((a) => ({
      id: a.id,
      type: a.type || "preference", // Default to preference if not specified
    }));

    // Combine button selections with custom allergen IDs (already validated tags)
    const allAllergens = [...allergenIds];
    if (customAllergenIds && Array.isArray(customAllergenIds)) {
      for (const id of customAllergenIds) {
        if (!allAllergens.includes(id)) allAllergens.push(id);
      }
    }

    // Get menu (from cache or fresh) and the chef's substitutions for this venue
    const menu = await getMenu(venue);
    const cacheStatus = getCacheStatus(venue);
    const substitutions = await getSubstitutions(venue);
    const availableColumns = getAvailableColumns(venue);

    // Allergens with a sheet column are filtered by the column; the rest need the AI.
    const columnAllergens: string[] = [];
    const aiAllergens: string[] = [];
    for (const id of allAllergens) {
      const columnName = ALLERGEN_TO_COLUMN[id];
      if (columnName && availableColumns.has(columnName)) columnAllergens.push(id);
      else aiAllergens.push(id);
    }

    // Typed restrictions: ingredients picked from the menu's own lists are checked
    // against the sheet (no AI); only free text the sheet doesn't know goes to the AI.
    const tags = Array.isArray(customTags) ? customTags : [];
    const ingredientTags = tags.filter((t) => t.ingredient);
    const aiTags: CustomTag[] = [
      ...aiAllergens.map((id) => {
        const label = getAllergenById(id)?.label || id;
        return { id: `pending_${id}`, text: label, displayLabel: label, type: "allergy" as const };
      }),
      ...tags.filter((t) => !t.ingredient),
    ];

    let buckets: Buckets;
    if (hasConfidenceScores(menu) && aiTags.length === 0 && ingredientTags.length === 0) {
      // CONFIDENCE PATH (legacy Supabase venues with stored confidence scores)
      buckets = filterMenuWithConfidence(menu, allergensWithSeverity);
    } else {
      // 1. Sheet columns (YES / NO / CAN BE + chef substitution rescue).
      buckets = filterMenu(menu, columnAllergens, substitutions, allAllergens);
      // 2. Ingredient tags against the sheet's ingredient lists, across EVERY bucket.
      buckets = applyIngredientTags(buckets, ingredientTags, substitutions, allAllergens);
    }

    // 3. AI backup, only for what the sheet can't answer. It never removes a sheet note:
    // a CAN BE dish or a chef-modified dish keeps its notes, and the AI can only exclude
    // it or add "check with staff".
    const aiNote = new Map<string, string>();
    if (aiTags.length > 0) {
      const all = [...buckets.safeItems, ...buckets.cautionItems, ...buckets.modifiableItems];
      const verdicts = await aiVerdicts(all.map((f) => f.item), aiTags);
      const what = aiTags.map((t) => t.displayLabel.toLowerCase()).join(", ");
      const note = `May contain ${what}. Please check with staff.`;
      const keep = (f: FilteredItem) => {
        const v = verdicts.get(f.item.name) ?? "excluded";
        if (v === "excluded") {
          buckets.excludedCount++;
          return false;
        }
        if (v === "caution") aiNote.set(f.item.name, note);
        return true;
      };
      buckets = {
        safeItems: buckets.safeItems.filter(keep),
        cautionItems: buckets.cautionItems.filter(keep),
        modifiableItems: buckets.modifiableItems.filter(keep),
        excludedCount: buckets.excludedCount,
      };
    }

    // Unsure dishes (AI caution) go to "Check with staff" with every note they carry.
    const check = (f: FilteredItem) => aiNote.has(f.item.name);
    const withNotes = (f: FilteredItem): ItemOut => ({
      ...base(f),
      warnings: [...formatWarnings(f.warnings), ...(aiNote.has(f.item.name) ? [aiNote.get(f.item.name)!] : [])],
    });

    const response: MenuResponse = {
      success: true,
      safeItems: buckets.safeItems.filter((f) => !check(f)).map((f) => ({ ...base(f), warnings: [] })),
      cautionItems: buckets.cautionItems.filter((f) => !check(f)).map(withNotes),
      checkItems: [...buckets.safeItems, ...buckets.cautionItems].filter(check).map(withNotes),
      // A modified dish shows its swaps plus any CAN BE / check notes it also carries.
      modifiedItems: buckets.modifiableItems.map((f) => ({
        ...withNotes(f),
        modifications: f.modifications ?? [],
      })),
      excludedCount: buckets.excludedCount,
      meta: {
        totalItems: menu.length,
        allergenFilters: allAllergens,
        ingredientsChecked: ingredientTags.length > 0,
        cacheStatus: {
          cached: cacheStatus.cached,
          age: cacheStatus.age,
        },
      },
    };

    console.log(`Menu filtered in ${Date.now() - startTime}ms:`, {
      allergens: allAllergens,
      columnAllergens,
      aiAllergens,
      ingredientTags: ingredientTags.map((t) => t.ingredient),
      aiTags: aiTags.map((t) => t.text),
      usedAI: aiTags.length > 0,
      safeCount: response.safeItems.length,
      cautionCount: response.cautionItems.length,
      checkCount: response.checkItems.length,
      modifiableCount: response.modifiedItems.length,
      excludedCount: response.excludedCount,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error processing allergen submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
