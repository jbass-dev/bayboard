"use client";

import { useState, type FormEvent } from "react";
import type { NewInventoryItem } from "../lib/board-actions";
import { useEscapeKey } from "../lib/useEscapeKey";
import type { InventoryItem } from "../types";

interface AddInventoryFormProps {
  onAdd: (item: NewInventoryItem) => Promise<void>;
  onClose: () => void;
}

/** Modal: add an oil grade or filter to the parts shelf. */
export default function AddInventoryForm({
  onAdd,
  onClose,
}: AddInventoryFormProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InventoryItem["kind"]>("oil");
  const [quantity, setQuantity] = useState("0");
  const [threshold, setThreshold] = useState("4");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        name: name.trim(),
        kind,
        quantity: Number(quantity),
        lowStockThreshold: Number(threshold),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-inventory-title"
        className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
      >
        <h2 id="add-inventory-title" className="font-semibold text-zinc-100">
          Add inventory item
        </h2>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="5W-30 or PH7317"
            className={inputClass}
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as InventoryItem["kind"])}
            className={inputClass}
          >
            <option value="oil">Oil</option>
            <option value="filter">Filter</option>
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block text-sm">
            <span className="text-zinc-400">Quantity</span>
            <input
              required
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Low-stock at</span>
            <input
              required
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

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
            disabled={saving}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add item"}
          </button>
        </div>
      </form>
    </div>
  );
}
