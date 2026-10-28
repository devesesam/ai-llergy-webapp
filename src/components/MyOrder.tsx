"use client";

import SelectionSummary from "./SelectionSummary";
import { SelectedAllergen, CustomTag } from "@/lib/allergens";
import { OrderLine, WAITER_MESSAGE, dishCount } from "@/lib/my-order";

interface MyOrderProps {
  order: OrderLine[];
  selectedAllergens: SelectedAllergen[];
  customAllergenIds: string[];
  customTags: CustomTag[];
  onChange: (name: string, delta: number) => void;
  onBack: () => void;
}

/**
 * The summary a guest shows their waiter: dishes, quantities, dietary requirements and
 * every required modification. No prices (the till sets them). The order is not placed.
 */
export default function MyOrder({
  order,
  selectedAllergens,
  customAllergenIds,
  customTags,
  onChange,
  onBack,
}: MyOrderProps) {
  const n = dishCount(order);
  return (
    <div className="my-order">
      <p className="my-order__banner" role="status">
        {WAITER_MESSAGE}
      </p>

      <div className="my-order__diet">
        <SelectionSummary
          selectedAllergens={selectedAllergens}
          customAllergenIds={customAllergenIds}
          customTags={customTags}
          title="Dietary requirements"
        />
      </div>

      <h2 className="my-order__title">
        My Order ({n} dish{n === 1 ? "" : "es"})
      </h2>

      {order.length === 0 ? (
        <p className="my-order__empty">No dishes yet. Go back to the menu and tap Add.</p>
      ) : (
        <ul className="my-order__list">
          {order.map((l) => (
            <li key={l.name} className="my-order__line">
              <div className="my-order__line-head">
                <span className="my-order__qty">{l.qty} ×</span>
                <span className="my-order__name">{l.name}</span>
                <span className="my-order__stepper">
                  <button type="button" onClick={() => onChange(l.name, -1)} aria-label={`One less ${l.name}`}>
                    −
                  </button>
                  <button type="button" onClick={() => onChange(l.name, 1)} aria-label={`One more ${l.name}`}>
                    +
                  </button>
                </span>
              </div>
              {l.notes.length > 0 && (
                <ul className="my-order__notes">
                  {l.notes.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="action-area">
        <button type="button" className="btn secondary-btn full-width" onClick={onBack}>
          ← Back to menu
        </button>
      </div>
    </div>
  );
}
