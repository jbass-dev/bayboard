"use client";

import { SERVICE_LABELS } from "../lib/board-logic";
import { emailjsConfigured } from "../lib/reminder-actions";
import { allReminders, type ReminderStatus } from "../lib/reminders";
import type { Ticket } from "../types";

const STATUS_STYLES: Record<ReminderStatus, { label: string; className: string }> =
  {
    sent: { label: "Reminded", className: "bg-emerald-950 text-emerald-300" },
    due: { label: "Due now", className: "bg-amber-950 text-amber-300" },
    scheduled: { label: "Scheduled", className: "bg-zinc-800 text-zinc-400" },
  };

function relativeDays(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "today";
  return `in ${days}d`;
}

/**
 * Manager view of upcoming customer next-service reminders: who is due, when,
 * and whether the automatic email has gone out. The board's scanner handles
 * sending; this panel makes the pipeline visible on the day summary.
 */
export default function ServiceRemindersPanel({
  tickets,
  now,
}: {
  tickets: Ticket[];
  now: Date;
}) {
  const reminders = allReminders(tickets, now);

  return (
    <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">
          Customer service reminders
        </h3>
        {!emailjsConfigured() && (
          <span className="text-xs text-zinc-500 no-print">
            EmailJS not configured — sending is off
          </span>
        )}
      </div>

      {reminders.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          No completed tickets carry a customer email yet. Add a customer to a
          ticket and its next-service reminder will appear here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {reminders.map((r) => {
            const style = STATUS_STYLES[r.status];
            return (
              <li
                key={r.ticketId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-zinc-200">
                  {r.customer.name || r.customer.email}
                  <span className="text-zinc-500">
                    {" · "}
                    {SERVICE_LABELS[r.service]}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-zinc-400">
                  <span>
                    {new Date(r.nextServiceDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ({relativeDays(r.daysUntil)})
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs ${style.className}`}
                  >
                    {style.label}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
