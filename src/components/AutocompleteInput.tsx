"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchSynonyms } from "@/lib/interpret-allergy";
import { cleanQuery, searchIngredients, type IngredientIndex } from "@/lib/ingredients";
import { getAllergenById, CustomTag } from "@/lib/allergens";
import AllergenTag from "./AllergenTag";
import CustomTagPill from "./CustomTagPill";

interface AutocompleteInputProps {
  selectedAllergenIds: string[];
  onAllergenAdd: (id: string) => void;
  onAllergenRemove: (id: string) => void;
  onInputChange: (hasText: boolean) => void;
  customTags: CustomTag[];
  onCustomTagAdd: (tag: CustomTag) => void;
  onCustomTagRemove: (tagId: string) => void;
  /** This venue's ingredient index (null while loading or if it failed: allergens only). */
  ingredientIndex: IngredientIndex | null;
}

// One dropdown row: a known allergen, or an ingredient found on this menu.
type Option =
  | { kind: "allergen"; id: string; matchedTerm: string }
  | { kind: "ingredient"; key: string; label: string; count: number };

const optionKey = (o: Option) => (o.kind === "allergen" ? `a:${o.id}` : `i:${o.key}`);

export default function AutocompleteInput({
  selectedAllergenIds,
  onAllergenAdd,
  onAllergenRemove,
  onInputChange,
  customTags,
  onCustomTagAdd,
  onCustomTagRemove,
  ingredientIndex,
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const noMatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search: allergens first, then ingredients on this menu (instant, local)
  useEffect(() => {
    if (noMatchTimeoutRef.current) {
      clearTimeout(noMatchTimeoutRef.current);
      noMatchTimeoutRef.current = null;
    }

    if (!inputValue.trim()) {
      setOptions([]);
      setShowDropdown(false);
      setShowAddCustom(false);
      onInputChange(false);
      return;
    }

    onInputChange(true);

    // An ingredient on this menu is never "corrected" into an allergen (mint is not milk).
    const ingredients = ingredientIndex ? searchIngredients(ingredientIndex, inputValue) : [];
    const q = cleanQuery(inputValue);
    const ingredient = ingredients.some((m) => m.key === q) ? "exact" : ingredients.length > 0 ? "partial" : "none";
    const allergens = searchSynonyms(inputValue, { ingredient })
      .filter((r) => !selectedAllergenIds.includes(r.allergenId))
      .slice(0, 4);
    const taken = new Set(customTags.map((t) => t.ingredient).filter(Boolean));
    const next: Option[] = [
      ...allergens.map((r) => ({ kind: "allergen" as const, id: r.allergenId, matchedTerm: r.matchedTerm })),
      ...ingredients
        .filter((m) => !taken.has(m.key))
        .map((m) => ({ kind: "ingredient" as const, key: m.key, label: m.label, count: m.count })),
    ];

    setOptions(next);
    setShowDropdown(true);
    setShowAddCustom(false);

    // Nothing on the menu or in the allergen list: offer the AI backup after 500ms
    if (next.length === 0) {
      noMatchTimeoutRef.current = setTimeout(() => {
        setShowAddCustom(true);
      }, 500);
    }

    return () => {
      if (noMatchTimeoutRef.current) {
        clearTimeout(noMatchTimeoutRef.current);
      }
    };
  }, [inputValue, selectedAllergenIds, customTags, ingredientIndex, onInputChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reset = useCallback(() => {
    setInputValue("");
    setOptions([]);
    setShowDropdown(false);
    setShowAddCustom(false);
    onInputChange(false);
    inputRef.current?.focus();
  }, [onInputChange]);

  const handleSelect = useCallback(
    (o: Option) => {
      if (o.kind === "allergen") {
        onAllergenAdd(o.id);
      } else {
        onCustomTagAdd({
          id: `ingredient_${o.key.replace(/\s+/g, "_")}`,
          text: o.label,
          displayLabel: o.label,
          ingredient: o.key,
        });
      }
      reset();
    },
    [onAllergenAdd, onCustomTagAdd, reset]
  );

  const handleAddCustomTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    onCustomTagAdd({
      id: `custom_${trimmed.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      text: trimmed,
      displayLabel: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
    });
    reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (options.length > 0) {
        handleSelect(options[0]);
      } else if (showAddCustom) {
        // Allow Enter to add custom tag when no matches
        handleAddCustomTag();
      }
    }
  };

  return (
    <div className="autocomplete-container">
      {/* Selected tags */}
      {(selectedAllergenIds.length > 0 || customTags.length > 0) && (
        <div className="autocomplete-tags">
          {selectedAllergenIds.map((id) => (
            <AllergenTag key={id} allergenId={id} onRemove={onAllergenRemove} />
          ))}
          {customTags.map((tag) => (
            <CustomTagPill key={tag.id} tag={tag} onRemove={onCustomTagRemove} />
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="autocomplete-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className={`autocomplete-input${inputValue.trim() ? " autocomplete-input--blocking" : ""}`}
          placeholder="Type an allergen or ingredient..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowDropdown(true)}
        />

        {/* Dropdown */}
        {showDropdown && (options.length > 0 || showAddCustom) && (
          <div ref={dropdownRef} className="autocomplete-dropdown">
            {options.length > 0 ? (
              options.map((o) => {
                if (o.kind === "ingredient") {
                  return (
                    <button
                      key={optionKey(o)}
                      type="button"
                      className="autocomplete-option"
                      onClick={() => handleSelect(o)}
                    >
                      <span className="autocomplete-option__icon">🌿</span>
                      <span className="autocomplete-option__content">
                        <span className="autocomplete-option__name">{o.label}</span>
                        <span className="autocomplete-option__match">
                          (in {o.count} dish{o.count === 1 ? "" : "es"})
                        </span>
                      </span>
                    </button>
                  );
                }
                const allergen = getAllergenById(o.id);
                if (!allergen) return null;
                return (
                  <button
                    key={optionKey(o)}
                    type="button"
                    className="autocomplete-option"
                    onClick={() => handleSelect(o)}
                  >
                    <span className="autocomplete-option__icon">
                      {allergen.icon}
                    </span>
                    <span className="autocomplete-option__content">
                      <span className="autocomplete-option__name">
                        {allergen.label}
                      </span>
                      {o.matchedTerm !== o.id && o.matchedTerm !== allergen.label.toLowerCase() && (
                        <span className="autocomplete-option__match">
                          ({o.matchedTerm})
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            ) : showAddCustom ? (
              <div className="autocomplete-no-match">
                <span className="autocomplete-no-match__text">
                  We couldn&apos;t find &quot;{inputValue.trim()}&quot; on this menu. Add it and
                  we&apos;ll check each dish. Please confirm with staff.
                </span>
                <button
                  type="button"
                  className="autocomplete-add-custom"
                  onClick={handleAddCustomTag}
                >
                  🏷️ Add &quot;{inputValue.trim()}&quot;
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="autocomplete-helper">
        Type allergens or ingredients one at a time
      </p>
    </div>
  );
}
