"use client";

import { useState, type FormEvent } from "react";
import { describeVehicle } from "../lib/board-logic";
import type { InventoryItem, PartUsed, Ticket } from "../types";

interface CompleteDialogProps {
  ticket: Ticket;
  /** Parts on hand; empty until inventory is seeded in Week 4. */
  inventory: InventoryItem[];
  onComplete: (partsUsed: PartUsed[]) => void;
  onClose: () => void;
}

/**
 * Close out a service: record which parts it consumed, then complete
 * the ticket. Quantities default to zero, so completing without touching
 * anything records no parts — the common case for a quick job.
 */
export default function CompleteDialog({
  ticket,
  inventory,
  onComplete,
  onClose,
}: CompleteDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function setQty(itemId: string, value: string) {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setQuantities((prev) => ({ ...prev, [itemId]: n }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const partsUsed: PartUsed[] = inventory
      .map((item) => ({
        inventoryItemId: item.id,
        quantity: quantities[item.id] ?? 0,
      }))
      .filter((p) => p.quantity > 0);
    onComplete(partsUsed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
      >
        <h2 className="font-semibold text-zinc-100">
          Complete {describeVehicle(ticket.vehicle)}
        </h2>

        {inventory.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No inventory items yet — this service will be recorded without
            parts.
          </p>
        ) : (
          <fieldset className="mt-3">
            <legend className="text-sm text-zinc-400">Parts used</legend>
            <div className="mt-2 flex flex-col gap-2">
              {inventory.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-zinc-200">{item.name}</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={quantities[item.id] ?? 0}
                    onChange={(e) => setQty(item.id, e.target.value)}
                    className="w-20 rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-right text-zinc-100"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Complete service
          </button>
        </div>
      </form>
    </div>
  );
}
