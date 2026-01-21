import { NextRequest, NextResponse } from "next/server";
import type { AllergenSubmission } from "@/lib/allergens";
import { getMenu, getCacheStatus } from "@/lib/menu-service";
import { filterMenu, formatWarnings, FilteredItem } from "@/lib/filter-menu";
import { interpretCustomAllergy } from "@/lib/interpret-allergy";

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
  customAllergyNote?: string;
  meta: {
    totalItems: number;
    allergenFilters: string[];
    cacheStatus: { cached: boolean; age: number };
    interpretMethod?: "local" | "ai" | "none";
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
    const body: AllergenSubmission = await request.json();
    const { allergens, customAllergy } = body;

    // Validate input
    if (!Array.isArray(allergens)) {
      return NextResponse.json(
        { error: "allergens must be an array" },
        { status: 400 }
      );
    }

    // Combine button selections with custom allergy interpretation
    let allAllergens = [...allergens];
    let customAllergyNote: string | undefined;
    let interpretMethod: "local" | "ai" | "none" = "none";

    if (customAllergy && customAllergy.trim()) {
      const interpretation = await interpretCustomAllergy(customAllergy);
      interpretMethod = interpretation.method;

      // Add matched allergens to the filter list
      for (const matched of interpretation.matchedAllergens) {
        if (!allAllergens.includes(matched)) {
          allAllergens.push(matched);
        }
      }

      // If some text couldn't be matched, add a note for the user
      if (interpretation.unmatchedText) {
        customAllergyNote = `Please ask staff about: ${interpretation.unmatchedText}`;
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
      customAllergyNote,
      meta: {
        totalItems: menu.length,
        allergenFilters: allAllergens,
        cacheStatus: {
          cached: cacheStatus.cached,
          age: cacheStatus.age,
        },
        interpretMethod,
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
