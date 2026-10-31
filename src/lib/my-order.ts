/**
 * "My Order": the dishes a guest picks to show their waiter (Tom, 2026-10-28).
 *
 * Kept on the phone only (localStorage, per venue): nothing is sent anywhere and the
 * order is NOT placed. The saved session also holds the selections and results, so a
 * refresh at the table brings the guest straight back. Every storage call is wrapped:
 * private mode or blocked storage just means no restore.
 */
import type { CustomTag, SelectedAllergen } from "./allergens";

export interface OrderLine {
  name: string; // dish name as on the menu (the line's identity)
  qty: number;
  notes: string[]; // required modifications / "check with staff" notes, shown to the waiter
}

/** Everything needed to put a guest back where they were. */
export interface SavedSession<R> {
  v: 1;
  savedAt: number;
  selectedAllergens: SelectedAllergen[];
  customAllergenIds: string[];
  customTags: CustomTag[];
  results: R;
  order: OrderLine[];
}

const KEY = (slug: string) => `menukey.session.v1.${slug}`;
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // a meal, not a week

export function loadSession<R>(slug: string): SavedSession<R> | null {
  try {
    const raw = window.localStorage.getItem(KEY(slug));
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedSession<R>;
    if (s?.v !== 1 || typeof s.savedAt !== "number" || Date.now() - s.savedAt > MAX_AGE_MS) return null;
    if (!Array.isArray(s.order) || !s.results) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession<R>(slug: string, s: SavedSession<R> | null): void {
  try {
    if (s) window.localStorage.setItem(KEY(slug), JSON.stringify(s));
    else window.localStorage.removeItem(KEY(slug));
  } catch {
    /* storage unavailable: the order still works for this visit */
  }
}

/** Add `delta` of a dish (removing the line at 0). */
export function changeQty(order: OrderLine[], name: string, notes: string[], delta: number): OrderLine[] {
  const i = order.findIndex((l) => l.name === name);
  if (i < 0) return delta > 0 ? [...order, { name, qty: delta, notes }] : order;
  const qty = order[i].qty + delta;
  if (qty <= 0) return order.filter((_, k) => k !== i);
  return order.map((l, k) => (k === i ? { ...l, qty } : l));
}

export const dishCount = (order: OrderLine[]) => order.reduce((n, l) => n + l.qty, 0);

/** The exact banner Tom asked for. */
export const WAITER_MESSAGE =
  "Please show this summary to one of our team to confirm your dietary requirements and place your order. Your order has not yet been placed.";
