"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchSynonyms, SearchResult } from "@/lib/interpret-allergy";
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
}

export default function AutocompleteInput({
  selectedAllergenIds,
  onAllergenAdd,
  onAllergenRemove,
  onInputChange,
  customTags,
  onCustomTagAdd,
  onCustomTagRemove,
}: AutocompleteInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAskAI, setShowAskAI] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const askAITimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    // Clear previous "Ask AI" timeout
    if (askAITimeoutRef.current) {
      clearTimeout(askAITimeoutRef.current);
      askAITimeoutRef.current = null;
    }

    if (!inputValue.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setShowAskAI(false);
      setAIError(null);
      onInputChange(false);
      return;
    }

    onInputChange(true);

    // Search synonyms (instant, local)
    const results = searchSynonyms(inputValue);

    // Filter out already selected allergens
    const filteredResults = results.filter(
      (r) => !selectedAllergenIds.includes(r.allergenId)
    );

    setSuggestions(filteredResults);
    setShowDropdown(true);
    setShowAskAI(false);
    setAIError(null);

    // If no suggestions, show "Ask AI" button after 500ms
    if (filteredResults.length === 0) {
      askAITimeoutRef.current = setTimeout(() => {
        setShowAskAI(true);
      }, 500);
    }

    return () => {
      if (askAITimeoutRef.current) {
        clearTimeout(askAITimeoutRef.current);
      }
    };
  }, [inputValue, selectedAllergenIds, onInputChange]);

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

  const handleSelect = useCallback(
    (allergenId: string) => {
      onAllergenAdd(allergenId);
      setInputValue("");
      setSuggestions([]);
      setShowDropdown(false);
      setShowAskAI(false);
      inputRef.current?.focus();
    },
    [onAllergenAdd]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && suggestions.length === 1) {
      e.preventDefault();
      handleSelect(suggestions[0].allergenId);
    }
  };

  const handleAskAI = async () => {
    if (!inputValue.trim() || isAILoading) return;

    setIsAILoading(true);
    setAIError(null);

    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputValue.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to interpret");
      }

      const data = await response.json();

      if (data.matchedAllergens && data.matchedAllergens.length > 0) {
        // Add all matched allergens
        for (const id of data.matchedAllergens) {
          if (!selectedAllergenIds.includes(id)) {
            onAllergenAdd(id);
          }
        }
        setInputValue("");
        setShowDropdown(false);
        setShowAskAI(false);
      } else {
        // AI couldn't match - show error message
        setAIError(
          `"${inputValue}" not recognized. Please ask staff about this ingredient.`
        );
        setShowAskAI(false);
      }
    } catch (error) {
      console.error("AI interpretation error:", error);
      setAIError("Failed to interpret. Please try again.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTag: CustomTag = {
      id: `custom_${trimmed.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      text: trimmed,
      displayLabel: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
    };

    onCustomTagAdd(newTag);
    setInputValue("");
    setShowDropdown(false);
    setAIError(null);
    onInputChange(false);
    inputRef.current?.focus();
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
          placeholder="Type an allergen..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowDropdown(true)}
        />

        {/* Dropdown */}
        {showDropdown && (suggestions.length > 0 || showAskAI || aiError) && (
          <div ref={dropdownRef} className="autocomplete-dropdown">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 5).map((result) => {
                const allergen = getAllergenById(result.allergenId);
                if (!allergen) return null;
                return (
                  <button
                    key={result.allergenId}
                    type="button"
                    className="autocomplete-option"
                    onClick={() => handleSelect(result.allergenId)}
                  >
                    <span className="autocomplete-option__icon">
                      {allergen.icon}
                    </span>
                    <span className="autocomplete-option__content">
                      <span className="autocomplete-option__name">
                        {allergen.label}
                      </span>
                      {result.matchedTerm !== result.allergenId && (
                        <span className="autocomplete-option__match">
                          ({result.matchedTerm})
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            ) : showAskAI ? (
              <div className="autocomplete-no-match">
                <span className="autocomplete-no-match__text">
                  No matches found.
                </span>
                <button
                  type="button"
                  className="autocomplete-ask-ai"
                  onClick={handleAskAI}
                  disabled={isAILoading}
                >
                  {isAILoading ? "Checking..." : "🤖 Ask AI"}
                </button>
              </div>
            ) : aiError ? (
              <div className="autocomplete-error">
                <span className="autocomplete-error__icon">⚠️</span>
                <span className="autocomplete-error__text">{aiError}</span>
                <button
                  type="button"
                  className="autocomplete-add-custom"
                  onClick={handleAddCustomTag}
                >
                  + Add &quot;{inputValue}&quot; as custom restriction
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="autocomplete-helper">
        Type allergens one at a time
      </p>
    </div>
  );
}
