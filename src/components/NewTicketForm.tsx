"use client";

import { useState, type FormEvent } from "react";
import { createTicket } from "../lib/board-actions";
import { SERVICE_LABELS } from "../lib/board-logic";
import type { ServiceType } from "../types";

interface NewTicketFormProps {
  onClose: () => void;
}

/** Modal form: check a new car into the waiting queue. */
export default function NewTicketForm({ onClose }: NewTicketFormProps) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [service, setService] = useState<ServiceType>("oil-change");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTicket(
        { year: Number(year), make: make.trim(), model: model.trim() },
        service,
        notes.trim(),
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
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
        className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
      >
        <h2 className="font-semibold text-zinc-100">New ticket</h2>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="block text-sm">
            <span className="text-zinc-400">Year</span>
            <input
              required
              type="number"
              min={1950}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Make</span>
            <input
              required
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Model</span>
            <input
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Service</span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value as ServiceType)}
            className={inputClass}
          >
            {Object.entries(SERVICE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Notes (optional)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
        </label>

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
            {saving ? "Adding…" : "Add to queue"}
          </button>
        </div>
      </form>
    </div>
  );
}
