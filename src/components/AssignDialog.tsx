"use client";

import { useState, type FormEvent } from "react";
import { describeVehicle } from "../lib/board-logic";
import { useEscapeKey } from "../lib/useEscapeKey";
import type { Bay, Technician, Ticket } from "../types";

interface AssignDialogProps {
  ticket: Ticket;
  bays: Bay[];
  technicians: Technician[];
  /** Preselected when the card was dropped on a specific bay. */
  initialBayId?: string;
  onAssign: (bayId: string, technicianId: string) => void;
  onClose: () => void;
}

/** Pick a bay and technician for a waiting ticket. */
export default function AssignDialog({
  ticket,
  bays,
  technicians,
  initialBayId,
  onAssign,
  onClose,
}: AssignDialogProps) {
  const [bayId, setBayId] = useState(initialBayId ?? bays[0]?.id ?? "");
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id ?? "");
  useEscapeKey(onClose);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (bayId && technicianId) onAssign(bayId, technicianId);
  }

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
        aria-labelledby="assign-dialog-title"
        className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl"
      >
        <h2 id="assign-dialog-title" className="font-semibold text-zinc-100">
          Assign {describeVehicle(ticket.vehicle)}
        </h2>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Bay</span>
          <select
            value={bayId}
            onChange={(e) => setBayId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-100"
          >
            {bays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Technician</span>
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-zinc-100"
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

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
            disabled={!bayId || !technicianId}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </form>
    </div>
  );
}
