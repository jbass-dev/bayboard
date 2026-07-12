"use client";

import { useState } from "react";
import { isLowStock } from "../lib/ticket-logic";
import type { InventoryItem } from "../types";

interface InventoryRowProps {
  item: InventoryItem;
  /** Persist a change to quantity or threshold. */
  onUpdate: (
    id: string,
    patch: Partial<Pick<InventoryItem, "quantity" | "lowStockThreshold">>,
  ) => void;
  onDelete: (item: InventoryItem) => void;
}

const KIND_LABEL: Record<InventoryItem["kind"], string> = {
  oil: "Oil",
  filter: "Filter",
};

/**
 * One line on the parts shelf. Quantity has quick minus/plus restock buttons
 * plus a direct field; the threshold is editable too. Edits commit on blur (or
 * button press) and flow straight to Firestore, so every open board updates
 * live. A low row is flagged with both colour and a text label, not colour
 * alone.
 */
export default function InventoryRow({
  item,
  onUpdate,
  onDelete,
}: InventoryRowProps) {
  // Local copies of the editable fields, so typing doesn't fight Firestore.
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [threshold, setThreshold] = useState(String(item.lowStockThreshold));

  // When the server value changes (e.g. a ticket closing elsewhere decremented
  // stock), adopt it. This is React's "adjust state during render" pattern:
  // no effect, no cascading render. See react.dev "You Might Not Need an Effect".
  const [seenQuantity, setSeenQuantity] = useState(item.quantity);
  if (item.quantity !== seenQuantity) {
    setSeenQuantity(item.quantity);
    setQuantity(String(item.quantity));
  }
  const [seenThreshold, setSeenThreshold] = useState(item.lowStockThreshold);
  if (item.lowStockThreshold !== seenThreshold) {
    setSeenThreshold(item.lowStockThreshold);
    setThreshold(String(item.lowStockThreshold));
  }

  const low = isLowStock(item);

  function commitQuantity(next: number) {
    const clean = Math.max(0, Math.floor(next || 0));
    setQuantity(String(clean));
    if (clean !== item.quantity) onUpdate(item.id, { quantity: clean });
  }

  function commitThreshold(next: number) {
    const clean = Math.max(0, Math.floor(next || 0));
    setThreshold(String(clean));
    if (clean !== item.lowStockThreshold)
      onUpdate(item.id, { lowStockThreshold: clean });
  }

  const fieldClass =
    "w-16 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-right text-zinc-100";
  const stepClass =
    "h-8 w-8 rounded-md border border-zinc-600 text-zinc-200 hover:bg-zinc-700 disabled:opacity-40";

  return (
    <tr className={low ? "bg-red-950/40" : undefined}>
      <td className="px-3 py-2">
        <span className="font-medium text-zinc-100">{item.name}</span>
      </td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {KIND_LABEL[item.kind]}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`Remove one ${item.name}`}
            disabled={item.quantity === 0}
            onClick={() => commitQuantity(item.quantity - 1)}
            className={stepClass}
          >
            &minus;
          </button>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            aria-label={`${item.name} quantity`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={(e) => commitQuantity(Number(e.target.value))}
            className={fieldClass}
          />
          <button
            type="button"
            aria-label={`Add one ${item.name}`}
            onClick={() => commitQuantity(item.quantity + 1)}
            className={stepClass}
          >
            +
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={`${item.name} low-stock threshold`}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          onBlur={(e) => commitThreshold(Number(e.target.value))}
          className={`${fieldClass} mx-auto block`}
        />
      </td>
      <td className="px-3 py-2 text-center">
        {low ? (
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
            Low stock
          </span>
        ) : (
          <span className="text-xs text-zinc-500">OK</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="text-sm text-zinc-500 hover:text-red-400"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
