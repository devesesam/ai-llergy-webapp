"use client";

import {
  DIETARY_PREFERENCES,
  STANDALONE_ALLERGENS,
  ALLERGEN_GROUPS,
  Allergen,
  SelectedAllergen,
} from "@/lib/allergens";
import AllergenButton from "./AllergenButton";
import AllergenGroup from "./AllergenGroup";

interface AllergenGridProps {
  selectedAllergens: SelectedAllergen[];
  onAllergenClick: (allergen: Allergen) => void;
}

export default function AllergenGrid({
  selectedAllergens,
  onAllergenClick,
}: AllergenGridProps) {
  // Get selection type for an allergen
  const getSelectionType = (id: string): "allergy" | "preference" | undefined => {
    const selection = selectedAllergens.find(s => s.id === id);
    return selection?.type;
  };

  return (
    <div className="allergen-grid">
      {/* Dietary Preferences */}
      <div className="allergen-grid__section">
        <h3 className="allergen-grid__section-title">Dietary Preferences</h3>
        <div className="allergen-grid__buttons">
          {DIETARY_PREFERENCES.map((allergen) => (
            <AllergenButton
              key={allergen.id}
              allergen={allergen}
              isSelected={selectedAllergens.some(s => s.id === allergen.id)}
              selectionType={getSelectionType(allergen.id)}
              onToggle={() => onAllergenClick(allergen)}
            />
          ))}
        </div>
      </div>

      {/* Grouped Allergens */}
      <div className="allergen-grid__section">
        <h3 className="allergen-grid__section-title">Allergen Groups</h3>
        <div className="allergen-grid__groups">
          {ALLERGEN_GROUPS.map((group) => (
            <AllergenGroup
              key={group.id}
              group={group}
              selectedAllergens={selectedAllergens}
              onAllergenClick={onAllergenClick}
            />
          ))}
        </div>
      </div>

      {/* Standalone Allergens */}
      <div className="allergen-grid__section">
        <h3 className="allergen-grid__section-title">Other Allergens</h3>
        <div className="allergen-grid__buttons">
          {STANDALONE_ALLERGENS.map((allergen) => (
            <AllergenButton
              key={allergen.id}
              allergen={allergen}
              isSelected={selectedAllergens.some(s => s.id === allergen.id)}
              selectionType={getSelectionType(allergen.id)}
              onToggle={() => onAllergenClick(allergen)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
