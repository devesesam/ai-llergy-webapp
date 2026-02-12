import { NextRequest, NextResponse } from "next/server";
import type { SelectedAllergen, CustomTag } from "@/lib/allergens";
import { getMenu, getCacheStatus } from "@/lib/menu-service";
import { filterMenu, formatWarnings, FilteredItem } from "@/lib/filter-menu";
import { filterMenuWithAI } from "@/lib/ai-filter";

interface SubmissionBody {
  allergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
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

function formatItem(item: FilteredItem, useAIWarnings: boolean = false) {
  return {
    name: item.item.name,
    ingredients: item.item.ingredients,
    price: item.item.price,
    // AI warnings are already formatted strings; standard warnings need formatting
    warnings: useAIWarnings ? item.warnings : formatWarnings(item.warnings),
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: SubmissionBody = await request.json();
    const { allergens, customAllergenIds, customTags } = body;

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

    // Determine if we need AI filtering (when custom tags exist)
    const hasCustomTags = customTags && Array.isArray(customTags) && customTags.length > 0;

    // Filter the menu
    const result = hasCustomTags
      ? await filterMenuWithAI(menu, allAllergens, customTags)
      : filterMenu(menu, allAllergens);

    const response: MenuResponse = {
      success: true,
      safeItems: result.safeItems.map(item => formatItem(item, hasCustomTags)),
      cautionItems: result.cautionItems.map(item => formatItem(item, hasCustomTags)),
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
      customTags: customTags?.map(t => t.text) || [],
      usedAI: hasCustomTags,
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
