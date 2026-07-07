import type { Bay, ServiceType, Ticket, TicketStatus, Vehicle } from "../types";

/** Human-readable labels for the board and forms. */
export const SERVICE_LABELS: Record<ServiceType, string> = {
  "oil-change": "Oil change",
  "tire-rotation": "Tire rotation",
  "engine-air-filter": "Engine air filter",
  "cabin-air-filter": "Cabin air filter",
  "coolant-flush": "Coolant flush",
};

type WaitingTicket = Ticket & {
  status: Extract<TicketStatus, { kind: "waiting" }>;
};

type InBayTicket = Ticket & {
  status: Extract<TicketStatus, { kind: "in-bay" }>;
};

/** Waiting tickets, oldest first — the next car up is at the top. */
export function waitingTickets(tickets: Ticket[]): WaitingTicket[] {
  return tickets
    .filter((t): t is WaitingTicket => t.status.kind === "waiting")
    .sort((a, b) => a.status.since.localeCompare(b.status.since));
}

/** Tickets currently in the given bay (normally one, but the data can't enforce that). */
export function bayTickets(tickets: Ticket[], bayId: string): InBayTicket[] {
  return tickets
    .filter(
      (t): t is InBayTicket =>
        t.status.kind === "in-bay" && t.status.bayId === bayId,
    )
    .sort((a, b) => a.status.startedAt.localeCompare(b.status.startedAt));
}

/** Bays in display order. */
export function sortBays(bays: Bay[]): Bay[] {
  return [...bays].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** When the ticket entered its current column. */
export function statusTimestamp(ticket: Ticket): string {
  return ticket.status.kind === "waiting"
    ? ticket.status.since
    : ticket.status.startedAt;
}

/** "4m", "1h 05m" — how long since the given ISO timestamp. */
export function formatElapsed(fromIso: string, now: Date): string {
  const mins = Math.max(
    0,
    Math.floor((now.getTime() - new Date(fromIso).getTime()) / 60_000),
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** "2019 Honda Civic" */
export function describeVehicle(v: Vehicle): string {
  return `${v.year} ${v.make} ${v.model}`;
}
