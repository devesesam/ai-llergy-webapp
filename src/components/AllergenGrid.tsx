"use client";

import { ALLERGENS } from "@/lib/allergens";
import AllergenButton from "./AllergenButton";

interface AllergenGridProps {
  selectedAllergens: Set<string>;
  onToggle: (id: string) => void;
}

export default function AllergenGrid({
  selectedAllergens,
  onToggle,
}: AllergenGridProps) {
  return (
    <div className="allergen-grid">
      {ALLERGENS.map((allergen) => (
        <AllergenButton
          key={allergen.id}
          allergen={allergen}
          isSelected={selectedAllergens.has(allergen.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
