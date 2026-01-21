"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import DisclaimerModal from "@/components/DisclaimerModal";
import AllergenGrid from "@/components/AllergenGrid";
import { ALLERGENS } from "@/lib/allergens";

export default function Home() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(
    new Set()
  );
  const [customAllergy, setCustomAllergy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Show disclaimer modal after a short delay
    const timer = setTimeout(() => {
      setShowDisclaimer(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleAllergen = (id: string) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const allergenList = Array.from(selectedAllergens);

    if (allergenList.length === 0 && !customAllergy.trim()) {
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
          allergens: allergenList,
          customAllergy: customAllergy.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      const data = await response.json();

      // Build display list
      const displayList = allergenList.map(
        (id) => ALLERGENS.find((a) => a.id === id)?.label || id
      );
      if (customAllergy.trim()) {
        displayList.push(`Custom: ${customAllergy.trim()}`);
      }

      alert(`We will filter the menu for:\n- ${displayList.join("\n- ")}`);

      // Reset form after successful submission
      setSelectedAllergens(new Set());
      setCustomAllergy("");
    } catch (error) {
      console.error("Submission error:", error);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <p className="subtitle">Select allergens to avoid</p>
        </header>

        <main>
          <AllergenGrid
            selectedAllergens={selectedAllergens}
            onToggle={handleToggleAllergen}
          />

          <div className="input-group">
            <input
              type="text"
              placeholder="Add specific allergies or preferences..."
              value={customAllergy}
              onChange={(e) => setCustomAllergy(e.target.value)}
            />
          </div>

          <div className="action-area">
            <button
              className="btn primary-btn full-width"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
