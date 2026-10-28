"use client";

import { useState } from "react";

interface MenuItemProps {
  name: string;
  price: number;
  ingredients: string;
  warning?: string;
  modifications?: string[];
  /** In My Order: how many, and +1 / -1. Omitted → no Add button. */
  qty?: number;
  onQty?: (delta: number) => void;
}

/** The chef's swap as shown to guests: "… (makes it Dairy-free). Note: adds Garlic". */
export const showMod = (mod: string) => mod.replace(" — note: adds ", ". Note: adds ");

export default function MenuItem({
  name,
  price,
  ingredients,
  warning,
  modifications,
  qty = 0,
  onQty,
}: MenuItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasModifications = !!modifications && modifications.length > 0;

  return (
    <div
      className={`menu-item ${warning ? "menu-item--caution" : ""} ${
        hasModifications ? "menu-item--modified" : ""
      }`}
    >
      <div className="menu-item__header">
        <h4 className="menu-item__name">{name}</h4>
        <div className="menu-item__header-right">
          <span className="menu-item__price">${price}</span>
          <button
            type="button"
            className={`menu-item__toggle ${isExpanded ? "menu-item__toggle--open" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Hide ingredients" : "Show ingredients"}
          >
            ›
          </button>
        </div>
      </div>
      <div
        className={`menu-item__ingredients-wrapper ${isExpanded ? "menu-item__ingredients-wrapper--open" : ""}`}
        aria-hidden={!isExpanded}
      >
        <p className="menu-item__ingredients">{ingredients}</p>
      </div>
      {warning && (
        <p className="menu-item__warning">
          <span className="menu-item__warning-icon">!</span>
          {warning}
        </p>
      )}
      {hasModifications && (
        <div className="menu-item__substitutions">
          <p className="menu-item__substitutions-title">
            <span className="menu-item__substitutions-icon">↔</span>
            How to make this work for you
          </p>
          <ul className="menu-item__substitutions-list">
            {modifications!.map((mod, i) => (
              <li key={i}>{showMod(mod)}</li>
            ))}
          </ul>
        </div>
      )}
      {onQty && (
        <div className="menu-item__order">
          {qty === 0 ? (
            <button type="button" className="menu-item__add" onClick={() => onQty(1)}>
              + Add to My Order
            </button>
          ) : (
            <span className="menu-item__stepper">
              <button type="button" onClick={() => onQty(-1)} aria-label={`One less ${name}`}>
                −
              </button>
              <span className="menu-item__qty" aria-live="polite">
                {qty} in My Order
              </span>
              <button type="button" onClick={() => onQty(1)} aria-label={`One more ${name}`}>
                +
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
