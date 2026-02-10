import { NextRequest, NextResponse } from "next/server";
import type { SelectedAllergen } from "@/lib/allergens";
import { getMenu, getCacheStatus } from "@/lib/menu-service";
import { filterMenu, formatWarnings, FilteredItem } from "@/lib/filter-menu";

interface SubmissionBody {
  allergens: SelectedAllergen[];
  customAllergenIds?: string[];
}

export interface MenuResponse {
  success: boolean;
  safeItems: Array<{
    name: string;
    ingredients: string;
    price: number;
    warnings: string[];
  }>;
  cautionItems: Array<{
    name: string;
    ingredients: string;
    price: number;
    warnings: string[];
  }>;
  excludedCount: number;
  meta: {
    totalItems: number;
    allergenFilters: string[];
    cacheStatus: { cached: boolean; age: number };
  };
}

function formatItem(item: FilteredItem) {
  return {
    name: item.item.name,
    ingredients: item.item.ingredients,
    price: item.item.price,
    warnings: formatWarnings(item.warnings),
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SubmissionBody = await request.json();
    const { allergens, customAllergenIds } = body;

    // Validate input
    if (!Array.isArray(allergens)) {
      return NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }

    // Extract allergen IDs from the SelectedAllergen objects
    // The type distinction is for UI only; filtering treats all the same
    const allergenIds = allergens.map((a: SelectedAllergen) => a.id);

    // Combine button selections with custom allergen IDs (already validated tags)
    const allAllergens = [...allergenIds];

    // Add custom allergen IDs (these were validated client-side via autocomplete/AI)
    if (customAllergenIds && Array.isArray(customAllergenIds)) {
      for (const id of customAllergenIds) {
        if (!allAllergens.includes(id)) {
          allAllergens.push(id);
        }
      }
    }

    // Get menu (from cache or fresh)
    const menu = await getMenu();
    const cacheStatus = getCacheStatus();

    // Filter the menu
    const result = filterMenu(menu, allAllergens);

    const response: MenuResponse = {
      success: true,
      safeItems: result.safeItems.map(formatItem),
      cautionItems: result.cautionItems.map(formatItem),
      excludedCount: result.excludedCount,
      meta: {
        totalItems: menu.length,
        allergenFilters: allAllergens,
        cacheStatus: {
          cached: cacheStatus.cached,
          age: cacheStatus.age,
        },
      },
    };

    console.log(`Menu filtered in ${Date.now() - startTime}ms:`, {
      allergens: allAllergens,
      safeCount: result.safeItems.length,
      cautionCount: result.cautionItems.length,
      excludedCount: result.excludedCount,
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
