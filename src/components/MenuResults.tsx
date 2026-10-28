"use client";

import AccordionSection from "./AccordionSection";
import MenuItem from "./MenuItem";
import SelectionSummary from "./SelectionSummary";
import { SelectedAllergen, CustomTag } from "@/lib/allergens";

interface MenuItemData {
  name: string;
  ingredients: string;
  price: number;
  warnings: string[];
}

interface ModifiedItemData extends MenuItemData {
  modifications: string[];
}

interface MenuResultsProps {
  safeItems: MenuItemData[];
  cautionItems: MenuItemData[];
  checkItems?: MenuItemData[];
  modifiedItems?: ModifiedItemData[];
  excludedCount: number;
  ingredientsChecked?: boolean;
  selectedAllergens: SelectedAllergen[];
  customAllergenIds?: string[];
  customTags?: CustomTag[];
  onStartOver: () => void;
}

/** Notes as sentences: "Can be made Gluten-free on request. May contain truffle. …" */
const sentences = (notes: string[]) => notes.map((n) => (/[.!?]$/.test(n) ? n : `${n}.`)).join(" ");

export default function MenuResults({
  safeItems,
  cautionItems,
  checkItems = [],
  modifiedItems = [],
  excludedCount,
  ingredientsChecked = false,
  selectedAllergens,
  customAllergenIds = [],
  customTags = [],
  onStartOver,
}: MenuResultsProps) {
  const totalSafe = safeItems.length + cautionItems.length;
  const totalAvailable = totalSafe + modifiedItems.length + checkItems.length;

  return (
    <div className="results-container">
      <SelectionSummary
        selectedAllergens={selectedAllergens}
        customAllergenIds={customAllergenIds}
        customTags={customTags}
      />

      <header className="results-header">
        <h2 className="results-title">
          {totalAvailable > 0
            ? `${totalAvailable} item${totalAvailable !== 1 ? "s" : ""} available for you`
            : "No items match your criteria"}
        </h2>
        {totalAvailable > 0 && (
          <p className="results-subtitle">
            {modifiedItems.length > 0
              ? `${totalSafe} ready as-is · ${modifiedItems.length} can be modified`
              : "Based on your dietary preferences"}
          </p>
        )}
      </header>

      {safeItems.length > 0 && (
        <AccordionSection
          title="Safe to Eat"
          count={safeItems.length}
          variant="safe"
          defaultOpen={true}
        >
          {safeItems.map((item, index) => (
            <MenuItem
              key={`safe-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
            />
          ))}
        </AccordionSection>
      )}

      {modifiedItems.length > 0 && (
        <AccordionSection
          title="Can be modified for you (subject to kitchen approval)"
          count={modifiedItems.length}
          variant="modified"
          defaultOpen={true}
        >
          {modifiedItems.map((item, index) => (
            <MenuItem
              key={`modified-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
              modifications={item.modifications}
              warning={item.warnings.length > 0 ? sentences(item.warnings) : undefined}
            />
          ))}
        </AccordionSection>
      )}

      {cautionItems.length > 0 && (
        <AccordionSection
          title="Can be made to suit you (subject to kitchen approval)"
          count={cautionItems.length}
          variant="caution"
          defaultOpen={false}
        >
          {cautionItems.map((item, index) => (
            <MenuItem
              key={`caution-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
              warning={sentences(item.warnings)}
            />
          ))}
        </AccordionSection>
      )}

      {checkItems.length > 0 && (
        <AccordionSection
          title="Check with staff"
          count={checkItems.length}
          variant="caution"
          defaultOpen={false}
        >
          {checkItems.map((item, index) => (
            <MenuItem
              key={`check-${index}`}
              name={item.name}
              price={item.price}
              ingredients={item.ingredients}
              warning={sentences(item.warnings)}
            />
          ))}
        </AccordionSection>
      )}

      {ingredientsChecked && (
        <p className="results-excluded">
          Checked against this menu&apos;s ingredient lists. Please confirm with your waiter.
        </p>
      )}

      {excludedCount > 0 && (
        <p className="results-excluded">
          {excludedCount} item{excludedCount !== 1 ? "s" : ""} excluded based on
          your selections
        </p>
      )}

      <div className="action-area">
        <button
          className="btn secondary-btn full-width"
          onClick={onStartOver}
          type="button"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}
