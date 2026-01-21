export interface Allergen {
  id: string;
  label: string;
  icon: string;
  columnName: string; // Maps to Google Sheet column header
}

// Dietary preferences
export const DIETARY_PREFERENCES: Allergen[] = [
  { id: "vegetarian", label: "Vegetarian", icon: "🥗", columnName: "Vegetarian" },
  { id: "vegan", label: "Vegan", icon: "🥦", columnName: "Vegan" },
];

// Allergens (ordered by prevalence - most common first)
export const ALLERGENS: Allergen[] = [
  // Tier 2: Most Common (Big 9)
  { id: "peanuts", label: "Peanuts", icon: "🥜", columnName: "PEANUT FREE" },
  { id: "treenuts", label: "Tree Nuts", icon: "🌰", columnName: "TREE NUT FREE" },
  { id: "eggs", label: "Eggs", icon: "🥚", columnName: "EGG FREE" },
  { id: "dairy", label: "Dairy", icon: "🥛", columnName: "DAIRY FREE" },
  { id: "gluten", label: "Gluten", icon: "🌾", columnName: "GLUTEN FREE" },
  { id: "soy", label: "Soy", icon: "🌱", columnName: "SOY FREE" },
  { id: "fish", label: "Fish", icon: "🐟", columnName: "FISH FREE" },
  { id: "shellfish", label: "Shellfish", icon: "🦐", columnName: "SHELLFISH FREE" },
  { id: "sesame", label: "Sesame", icon: "🥯", columnName: "SESAME FREE" },

  // Tier 3: Specific Nuts
  { id: "almond", label: "Almond", icon: "🌰", columnName: "ALMOND FREE" },
  { id: "walnut", label: "Walnut", icon: "🌰", columnName: "WALNUT FREE" },
  { id: "pistachio", label: "Pistachio", icon: "🥜", columnName: "PISTACHIO FREE" },

  // Tier 4: Less Common / Regional
  { id: "wheat", label: "Wheat", icon: "🌾", columnName: "WHEAT FREE" },
  { id: "mustard", label: "Mustard", icon: "🟡", columnName: "MUSTARD FREE" },
  { id: "sulfites", label: "Sulfites", icon: "🧪", columnName: "SULFITE FREE" },
  { id: "garlic", label: "Garlic", icon: "🧄", columnName: "GARLIC FREE" },
  { id: "onion", label: "Onion", icon: "🧅", columnName: "ONION FREE" },
  { id: "celery", label: "Celery", icon: "🥬", columnName: "CELERY FREE" },
  { id: "chili", label: "Chili", icon: "🔥", columnName: "CHILI FREE" },
  { id: "capsicum", label: "Capsicum", icon: "🌶️", columnName: "CAPSICUM FREE" },
  { id: "lupin", label: "Lupin", icon: "🌸", columnName: "LUPIN FREE" },
  { id: "molluscs", label: "Molluscs", icon: "🦑", columnName: "MOLLUSC FREE" },
];

// Combined list for the form
export const ALL_FILTERS: Allergen[] = [...DIETARY_PREFERENCES, ...ALLERGENS];

// Map allergen ID to column name for quick lookup
export const ALLERGEN_TO_COLUMN: Record<string, string> = Object.fromEntries(
  ALL_FILTERS.map((a) => [a.id, a.columnName])
);

export interface AllergenSubmission {
  allergens: string[];
  customAllergy?: string;
}
