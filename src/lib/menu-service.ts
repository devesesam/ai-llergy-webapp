/**
 * Menu service with in-memory caching
 * Fetches from Google Sheets and caches for performance
 */

import { fetchMenuFromSheets, RawMenuItem } from "./google-sheets";
import { ALL_FILTERS } from "./allergens";

export interface MenuItem {
  name: string;
  ingredients: string;
  price: number;
  allergenProfile: Record<string, "YES" | "NO" | "CAN BE">;
}

// Cache configuration
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory cache
let menuCache: MenuItem[] | null = null;
let cacheTimestamp: number = 0;

/**
 * Transform raw sheet data into structured MenuItem
 */
function transformMenuItem(raw: RawMenuItem): MenuItem {
  const allergenProfile: Record<string, "YES" | "NO" | "CAN BE"> = {};

  for (const allergen of ALL_FILTERS) {
    const col = allergen.columnName;
    const value = raw[col]?.toUpperCase().trim() || "";
    if (value === "YES") {
      allergenProfile[col] = "YES";
    } else if (value === "CAN BE") {
      allergenProfile[col] = "CAN BE";
    } else {
      allergenProfile[col] = "NO";
    }
  }

  return {
    name: raw.Item || "",
    ingredients: raw.Ingredients || "",
    price: parseFloat(raw.Price) || 0,
    allergenProfile,
  };
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!menuCache) return false;
  return Date.now() - cacheTimestamp < CACHE_TTL_MS;
}

/**
 * Get menu items (from cache or fresh fetch)
 */
export async function getMenu(): Promise<MenuItem[]> {
  if (isCacheValid() && menuCache) {
    return menuCache;
  }

  const rawItems = await fetchMenuFromSheets();
  menuCache = rawItems.map(transformMenuItem).filter((item) => item.name); // Filter out empty items
  cacheTimestamp = Date.now();

  return menuCache;
}

/**
 * Force refresh the cache
 */
export async function refreshMenu(): Promise<MenuItem[]> {
  menuCache = null;
  cacheTimestamp = 0;
  return getMenu();
}

/**
 * Get cache status (for debugging/monitoring)
 */
export function getCacheStatus(): { cached: boolean; age: number; itemCount: number } {
  return {
    cached: menuCache !== null,
    age: menuCache ? Date.now() - cacheTimestamp : 0,
    itemCount: menuCache?.length || 0,
  };
}
