import type { Customer, Ticket } from "../types";

/**
 * Next-service reminders derived from completed tickets.
 *
 * A ticket becomes reminder-eligible once it is complete, carries a customer
 * email, and has a `nextServiceDate`. Pure functions only — the actual email
 * send and the Firestore write that marks a reminder sent live elsewhere, so
 * this logic stays trivially testable.
 */

/** How close (in days) a next-service date must be before we auto-send. */
export const REMINDER_WINDOW_DAYS = 7;

export type ReminderStatus = "sent" | "due" | "scheduled";

export interface Reminder {
  ticketId: string;
  customer: Customer;
  service: Ticket["service"];
  nextServiceDate: string;
  /** Whole days from `now` to the next-service date; negative if overdue. */
  daysUntil: number;
  status: ReminderStatus;
}

/** A completed ticket that carries the fields a reminder needs. */
type RemindableTicket = Ticket & {
  customer: Customer;
  nextServiceDate: string;
};

function isRemindable(ticket: Ticket): ticket is RemindableTicket {
  return (
    ticket.status.kind === "complete" &&
    Boolean(ticket.customer?.email) &&
    Boolean(ticket.nextServiceDate)
  );
}

/** Whole days from `now` to an ISO date; negative when the date has passed. */
export function daysUntil(dateIso: string, now: Date): number {
  const ms = new Date(dateIso).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

function toReminder(
  ticket: RemindableTicket,
  now: Date,
  windowDays: number,
): Reminder {
  const days = daysUntil(ticket.nextServiceDate, now);
  const status: ReminderStatus = ticket.reminderSentAt
    ? "sent"
    : days <= windowDays
      ? "due"
      : "scheduled";
  return {
    ticketId: ticket.id,
    customer: ticket.customer,
    service: ticket.service,
    nextServiceDate: ticket.nextServiceDate,
    daysUntil: days,
    status,
  };
}

/**
 * Every reminder-eligible ticket as a `Reminder`, soonest due first.
 * Drives the summary panel, which shows sent / due / scheduled at a glance.
 */
export function allReminders(
  tickets: Ticket[],
  now: Date,
  windowDays: number = REMINDER_WINDOW_DAYS,
): Reminder[] {
  return tickets
    .filter(isRemindable)
    .map((t) => toReminder(t, now, windowDays))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Reminders that should be emailed now: within the window (or overdue) and
 * not already sent. This is what the auto-scan acts on.
 */
export function dueReminders(
  tickets: Ticket[],
  now: Date,
  windowDays: number = REMINDER_WINDOW_DAYS,
): Reminder[] {
  return allReminders(tickets, now, windowDays).filter(
    (r) => r.status === "due",
  );
}
