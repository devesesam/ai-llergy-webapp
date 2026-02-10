"use client";

import { SelectedAllergen, getAllergenById } from "@/lib/allergens";

interface SelectionSummaryProps {
  selectedAllergens: SelectedAllergen[];
}

export default function SelectionSummary({
  selectedAllergens,
}: SelectionSummaryProps) {
  if (selectedAllergens.length === 0) {
    return null;
  }

  // Separate allergies and preferences
  const allergies = selectedAllergens.filter(s => s.type === "allergy");
  const preferences = selectedAllergens.filter(s => s.type === "preference");

  return (
    <div className="selection-summary">
      <h3 className="selection-summary__title">Your Selections</h3>

      {allergies.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--allergy">
            Allergies
          </span>
          <div className="selection-summary__pills">
            {allergies.map(selection => {
              const allergen = getAllergenById(selection.id);
              if (!allergen) return null;
              return (
                <span
                  key={selection.id}
                  className="selection-pill selection-pill--allergy"
                >
                  <span className="selection-pill__icon">{allergen.icon}</span>
                  <span className="selection-pill__label">{allergen.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {preferences.length > 0 && (
        <div className="selection-summary__group">
          <span className="selection-summary__label selection-summary__label--preference">
            Preferences
          </span>
          <div className="selection-summary__pills">
            {preferences.map(selection => {
              const allergen = getAllergenById(selection.id);
              if (!allergen) return null;
              return (
                <span
                  key={selection.id}
                  className="selection-pill selection-pill--preference"
                >
                  <span className="selection-pill__icon">{allergen.icon}</span>
                  <span className="selection-pill__label">{allergen.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
