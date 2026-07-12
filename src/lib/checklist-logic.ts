import type { Checklist, ChecklistItem } from "../types";

/** The paper sheets this replaces, one line per task. */
export const DEFAULT_CHECKLIST_ITEMS: Record<Checklist["type"], string[]> = {
  opening: [
    "Unlock doors and disable the alarm",
    "Turn on bay lights and equipment",
    "Check air compressor pressure",
    "Stock oil and filter shelves",
    "Review the day's appointments",
    "Count and log the cash drawer",
  ],
  closing: [
    "Complete or carry over all open tickets",
    "Restock oil and filters for tomorrow",
    "Clean bays and dispose of used oil",
    "Power down lifts and compressor",
    "Reconcile the cash drawer",
    "Set the alarm and lock up",
  ],
};

/** Local calendar day as YYYY-MM-DD — the key a checklist resets on. */
export function todayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Deterministic document id so each day has exactly one of each checklist. */
export function checklistId(type: Checklist["type"], date: string): string {
  return `${date}_${type}`;
}

/** A fresh, all-unchecked checklist for the given day. */
export function buildChecklist(
  type: Checklist["type"],
  date: string,
): Checklist {
  const items: ChecklistItem[] = DEFAULT_CHECKLIST_ITEMS[type].map(
    (label, i) => ({ id: `${type}-${i}`, label, completedAt: null }),
  );
  return { id: checklistId(type, date), type, date, items };
}

/**
 * Toggle one item's done state, stamping (or clearing) the time. Pure — the
 * Firestore write happens in the action. Returns a new items array.
 */
export function toggleItem(
  items: ChecklistItem[],
  itemId: string,
  nowIso: string,
): ChecklistItem[] {
  return items.map((it) =>
    it.id === itemId
      ? { ...it, completedAt: it.completedAt ? null : nowIso }
      : it,
  );
}

/** How many items are done, for the header progress read-out. */
export function checklistProgress(checklist: Checklist): {
  done: number;
  total: number;
} {
  return {
    done: checklist.items.filter((it) => it.completedAt !== null).length,
    total: checklist.items.length,
  };
}
