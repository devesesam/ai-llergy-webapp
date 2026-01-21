/**
 * Menu filtering logic based on allergen selections
 * Handles YES/NO/CAN BE values from the sheet
 */

import { MenuItem } from "./menu-service";
import { ALLERGEN_TO_COLUMN } from "./allergens";

export interface FilteredItem {
  item: MenuItem;
  safe: boolean;
  warnings: string[]; // Allergens marked as "CAN BE"
  excluded: string[]; // Allergens that caused exclusion (for debugging)
}

export interface FilterResult {
  safeItems: FilteredItem[];
  cautionItems: FilteredItem[]; // Items with "CAN BE" warnings
  excludedCount: number;
}

/**
 * Filter menu based on user's allergen selections
 *
 * Logic:
 * - YES = item is safe for this allergen (passes)
 * - NO = item contains this allergen (excluded)
 * - CAN BE = item may be made safe (included with warning)
 *
 * @param menu - Full menu from the cache
 * @param selectedAllergens - Array of allergen IDs the user selected
 * @returns Filtered results with safe items, caution items, and excluded count
 */
export function filterMenu(menu: MenuItem[], selectedAllergens: string[]): FilterResult {
  if (selectedAllergens.length === 0) {
    // No filters selected - return all items as safe
    return {
      safeItems: menu.map((item) => ({ item, safe: true, warnings: [], excluded: [] })),
      cautionItems: [],
      excludedCount: 0,
    };
  }

  const safeItems: FilteredItem[] = [];
  const cautionItems: FilteredItem[] = [];
  let excludedCount = 0;

  for (const item of menu) {
    const warnings: string[] = [];
    const excluded: string[] = [];
    let isExcluded = false;

    for (const allergenId of selectedAllergens) {
      const columnName = ALLERGEN_TO_COLUMN[allergenId];
      if (!columnName) continue; // Unknown allergen ID

      const value = item.allergenProfile[columnName];

      if (value === "NO") {
        // Item is NOT safe for this allergen
        isExcluded = true;
        excluded.push(allergenId);
      } else if (value === "CAN BE") {
        // Item CAN BE made safe - add warning
        warnings.push(allergenId);
      }
      // value === "YES" means safe, no action needed
    }

    if (isExcluded) {
      excludedCount++;
    } else if (warnings.length > 0) {
      cautionItems.push({ item, safe: false, warnings, excluded });
    } else {
      safeItems.push({ item, safe: true, warnings: [], excluded: [] });
    }
  }

  return { safeItems, cautionItems, excludedCount };
}

/**
 * Format warnings for display
 * Converts allergen IDs to human-readable messages
 */
export function formatWarnings(warnings: string[]): string[] {
  const allergenLabels: Record<string, string> = {
    dairy: "Dairy",
    pistachio: "Pistachio",
    walnut: "Walnut",
    almond: "Almond",
    soy: "Soy",
    gluten: "Gluten",
    sesame: "Sesame",
    garlic: "Garlic",
    onion: "Onion",
    capsicum: "Capsicum",
    chili: "Chili",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
  };

  // Dietary preferences don't use "-free" suffix
  const dietaryPreferences = new Set(["vegan", "vegetarian"]);

  return warnings.map((w) => {
    const label = allergenLabels[w] || w;
    if (dietaryPreferences.has(w)) {
      return `Can be made ${label} on request`;
    }
    return `Can be made ${label}-free on request`;
  });
}
