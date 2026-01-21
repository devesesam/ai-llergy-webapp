export interface Allergen {
  id: string;
  label: string;
  icon: string;
}

export const ALLERGENS: Allergen[] = [
  { id: "dairy", label: "Dairy", icon: "\u{1F95B}" },
  { id: "gluten", label: "Gluten", icon: "\u{1F33E}" },
  { id: "nuts", label: "Nuts", icon: "\u{1F95C}" },
  { id: "eggs", label: "Eggs", icon: "\u{1F95A}" },
  { id: "soy", label: "Soy", icon: "\u{1FAD8}" },
  { id: "shellfish", label: "Shellfish", icon: "\u{1F41A}" },
  { id: "fish", label: "Fish", icon: "\u{1F41F}" },
  { id: "sesame", label: "Sesame", icon: "\u{1F96F}" },
];

export interface AllergenSubmission {
  allergens: string[];
  customAllergy?: string;
}
