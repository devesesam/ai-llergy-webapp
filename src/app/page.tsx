"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import DisclaimerModal from "@/components/DisclaimerModal";
import AllergenGrid from "@/components/AllergenGrid";
import AllergenTypeModal from "@/components/AllergenTypeModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import MenuResults from "@/components/MenuResults";
import AutocompleteInput from "@/components/AutocompleteInput";
import { Allergen, SelectedAllergen } from "@/lib/allergens";

interface MenuItemData {
  name: string;
  ingredients: string;
  price: number;
  warnings: string[];
}

interface ResultsData {
  safeItems: MenuItemData[];
  cautionItems: MenuItemData[];
  excludedCount: number;
}

export default function Home() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<SelectedAllergen[]>([]);
  const [customAllergenIds, setCustomAllergenIds] = useState<string[]>([]);
  const [hasInputText, setHasInputText] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ResultsData | null>(null);

  // Modal state for allergy/preference selection
  const [modalAllergen, setModalAllergen] = useState<Allergen | null>(null);

  useEffect(() => {
    // Show disclaimer modal after a short delay
    const timer = setTimeout(() => {
      setShowDisclaimer(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle allergen click - either remove if selected, or open modal
  const handleAllergenClick = (allergen: Allergen) => {
    const existingIndex = selectedAllergens.findIndex(s => s.id === allergen.id);

    if (existingIndex !== -1) {
      // Already selected - remove it
      setSelectedAllergens(prev => prev.filter(s => s.id !== allergen.id));
    } else {
      // Not selected - open modal to choose type
      setModalAllergen(allergen);
    }
  };

  // Handle type selection from modal
  const handleTypeSelect = (type: "allergy" | "preference") => {
    if (modalAllergen) {
      setSelectedAllergens(prev => [...prev, { id: modalAllergen.id, type }]);
      setModalAllergen(null);
    }
  };

  const handleCloseModal = () => {
    setModalAllergen(null);
  };

  const handleAddCustomAllergen = (id: string) => {
    if (!customAllergenIds.includes(id)) {
      setCustomAllergenIds((prev) => [...prev, id]);
    }
  };

  const handleRemoveCustomAllergen = (id: string) => {
    setCustomAllergenIds((prev) => prev.filter((i) => i !== id));
  };

  const handleSubmit = async () => {
    if (selectedAllergens.length === 0 && customAllergenIds.length === 0) {
      alert(
        "No allergens selected! Please select at least one or type a custom one if you have specific needs."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allergens: selectedAllergens,
          customAllergenIds: customAllergenIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      const data = await response.json();

      // Store results and show results view
      setResults({
        safeItems: data.safeItems,
        cautionItems: data.cautionItems,
        excludedCount: data.excludedCount,
      });
    } catch (error) {
      console.error("Submission error:", error);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartOver = () => {
    setResults(null);
    setSelectedAllergens([]);
    setCustomAllergenIds([]);
    setHasInputText(false);
  };

  // Show results view if we have results
  if (results) {
    return (
      <>
        <DisclaimerModal
          isOpen={showDisclaimer}
          onAgree={() => setShowDisclaimer(false)}
        />

        <div className="app-container">
          <header>
            <Image
              src="/images/logo.png"
              alt="Mosaic Logo"
              width={60}
              height={60}
              className="logo"
            />
            <h1>AI-llergy</h1>
          </header>

          <MenuResults
            safeItems={results.safeItems}
            cautionItems={results.cautionItems}
            excludedCount={results.excludedCount}
            selectedAllergens={selectedAllergens}
            customAllergenIds={customAllergenIds}
            onStartOver={handleStartOver}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAgree={() => setShowDisclaimer(false)}
      />

      {modalAllergen && (
        <AllergenTypeModal
          allergen={modalAllergen}
          isOpen={true}
          onSelect={handleTypeSelect}
          onClose={handleCloseModal}
        />
      )}

      <div className="app-container">
        <header>
          <Image
            src="/images/logo.png"
            alt="Mosaic Logo"
            width={60}
            height={60}
            className="logo"
          />
          <h1>AI-llergy</h1>
          <p className="subtitle">Select allergens to avoid</p>
        </header>

        <main>
          <AllergenGrid
            selectedAllergens={selectedAllergens}
            onAllergenClick={handleAllergenClick}
          />

          <div className="input-group">
            <AutocompleteInput
              selectedAllergenIds={customAllergenIds}
              onAllergenAdd={handleAddCustomAllergen}
              onAllergenRemove={handleRemoveCustomAllergen}
              onInputChange={setHasInputText}
            />
          </div>

          <div className="action-area">
            <button
              className="btn primary-btn full-width"
              onClick={handleSubmit}
              disabled={isSubmitting || hasInputText}
              title={hasInputText ? "Convert text to tag before submitting" : ""}
            >
              {isSubmitting ? <LoadingSpinner /> : "Submit"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
