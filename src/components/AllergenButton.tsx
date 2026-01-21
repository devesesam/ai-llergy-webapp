"use client";

import type { Allergen } from "@/lib/allergens";

interface AllergenButtonProps {
  allergen: Allergen;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export default function AllergenButton({
  allergen,
  isSelected,
  onToggle,
}: AllergenButtonProps) {
  return (
    <button
      className={`allergen-option ${isSelected ? "selected" : ""}`}
      onClick={() => onToggle(allergen.id)}
      type="button"
    >
      <span className="icon">{allergen.icon}</span>
      <span className="label">{allergen.label}</span>
    </button>
  );
}
