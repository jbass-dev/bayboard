"use client";

import { useEffect, useState } from "react";
import {
  SERVICE_LABELS,
  describeVehicle,
  elapsedMinutes,
  formatElapsed,
  statusTimestamp,
} from "../lib/board-logic";
import { elapsedSeverity, type ElapsedSeverity } from "../lib/ticket-logic";
import type { Technician, Ticket } from "../types";

interface TicketCardProps {
  ticket: Ticket;
  technicians: Technician[];
  onRequestAssign?: (ticket: Ticket) => void;
  onReturnToWaiting?: (ticket: Ticket) => void;
  onRequestComplete?: (ticket: Ticket) => void;
}

/** Badge colours by how long an in-bay service has been running. */
const BADGE_TONE: Record<ElapsedSeverity, string> = {
  normal: "bg-zinc-900 text-zinc-300",
  warn: "bg-amber-500/20 text-amber-300",
  over: "bg-red-500/20 text-red-300",
};

/**
 * A shape as well as a colour for each severity, so the badge reads for
 * colour-blind users and passes the Week 5 accessibility bar. The mark is
 * decorative (aria-hidden); the spoken meaning lives in the badge's label.
 */
const SEVERITY_MARK: Record<ElapsedSeverity, string> = {
  normal: "",
  warn: "▲ ",
  over: "■ ",
};

const SEVERITY_LABEL: Record<ElapsedSeverity, string> = {
  normal: "on time",
  warn: "running long",
  over: "well over target",
};

/**
 * One car on the board. Draggable between columns; buttons
 * cover touch screens where drag-and-drop is unreliable.
 */
export default function TicketCard({
  ticket,
  technicians,
  onRequestAssign,
  onReturnToWaiting,
  onRequestComplete,
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

  // Only a running service is colour-coded; the waiting queue stays neutral.
  const severity: ElapsedSeverity =
    status.kind === "in-bay"
      ? elapsedSeverity(ticket.service, elapsedMinutes(status.startedAt, now))
      : "normal";

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", ticket.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-lg border border-zinc-600 bg-zinc-700 p-3 shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight text-zinc-100">
          {describeVehicle(ticket.vehicle)}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-medium ${BADGE_TONE[severity]}`}
          aria-label={
            status.kind === "in-bay"
              ? `${formatElapsed(statusTimestamp(ticket), now)} elapsed, ${SEVERITY_LABEL[severity]}`
              : `${formatElapsed(statusTimestamp(ticket), now)} waiting`
          }
        >
          <span aria-hidden="true">{SEVERITY_MARK[severity]}</span>
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
        <p className="mt-1 text-xs text-zinc-400">{ticket.notes}</p>
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

      {status.kind === "in-bay" && (onRequestComplete || onReturnToWaiting) && (
        <div className="mt-2 flex gap-2">
          {onRequestComplete && (
            <button
              type="button"
              onClick={() => onRequestComplete(ticket)}
              className="flex-1 rounded-md bg-amber-500 px-2 py-1 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Complete
            </button>
          )}
          {onReturnToWaiting && (
            <button
              type="button"
              onClick={() => onReturnToWaiting(ticket)}
              className="rounded-md border border-zinc-500 px-2 py-1 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Back
            </button>
          )}
        </div>
      )}
    </article>
  );
}
