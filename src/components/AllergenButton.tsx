"use client";

import type { Allergen } from "@/lib/allergens";

interface AllergenButtonProps {
  allergen: Allergen;
  isSelected: boolean;
  selectionType?: "allergy" | "preference";
  onToggle: (id: string) => void;
}

export default function AllergenButton({
  allergen,
  isSelected,
  selectionType,
  onToggle,
}: AllergenButtonProps) {
  const getClassName = () => {
    let className = "allergen-option";
    if (isSelected) {
      className += " selected";
      if (selectionType === "allergy") {
        className += " selected--allergy";
      } else if (selectionType === "preference") {
        className += " selected--preference";
      }
    }
    return className;
  };

  return (
    <button
      className={getClassName()}
      onClick={() => onToggle(allergen.id)}
      type="button"
    >
      <span className="icon">{allergen.icon}</span>
      <span className="label">{allergen.label}</span>
      {isSelected && selectionType && (
        <span className={`type-badge type-badge--${selectionType}`}>
          {selectionType === "allergy" ? "A" : "P"}
        </span>
      )}
    </button>
  );
}
