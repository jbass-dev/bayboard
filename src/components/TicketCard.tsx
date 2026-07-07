"use client";

import { useEffect, useState } from "react";
import {
  SERVICE_LABELS,
  describeVehicle,
  formatElapsed,
  statusTimestamp,
} from "../lib/board-logic";
import type { Technician, Ticket } from "../types";

interface TicketCardProps {
  ticket: Ticket;
  technicians: Technician[];
  onRequestAssign?: (ticket: Ticket) => void;
  onReturnToWaiting?: (ticket: Ticket) => void;
}

/**
 * One car on the board. Draggable between columns; buttons
 * cover touch screens where drag-and-drop is unreliable.
 */
export default function TicketCard({
  ticket,
  technicians,
  onRequestAssign,
  onReturnToWaiting,
}: TicketCardProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const status = ticket.status;
  const technician =
    status.kind === "in-bay"
      ? technicians.find((t) => t.id === status.technicianId)
      : undefined;

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", ticket.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-lg border border-zinc-700 bg-zinc-800 p-3 shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight text-zinc-100">
          {describeVehicle(ticket.vehicle)}
        </h3>
        <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300">
          {formatElapsed(statusTimestamp(ticket), now)}
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-400">
        {SERVICE_LABELS[ticket.service]}
      </p>

      {technician && (
        <p className="mt-1 text-sm text-amber-400/90">{technician.name}</p>
      )}

      {ticket.notes && (
        <p className="mt-1 text-xs text-zinc-500">{ticket.notes}</p>
      )}

      {status.kind === "waiting" && onRequestAssign && (
        <button
          type="button"
          onClick={() => onRequestAssign(ticket)}
          className="mt-2 w-full rounded-md bg-amber-500 px-2 py-1 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          Assign to bay
        </button>
      )}

      {status.kind === "in-bay" && onReturnToWaiting && (
        <button
          type="button"
          onClick={() => onReturnToWaiting(ticket)}
          className="mt-2 w-full rounded-md border border-zinc-600 px-2 py-1 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
        >
          Back to waiting
        </button>
      )}
    </article>
  );
}
