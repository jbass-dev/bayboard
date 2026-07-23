"use client";

import { useEffect, useRef, useState } from "react";
import { emailjsConfigured, sendServiceReminder } from "../lib/reminder-actions";
import { dueReminders } from "../lib/reminders";
import type { Ticket } from "../types";

/**
 * Watches completed tickets and auto-emails a next-service reminder as each
 * one's due date approaches. Runs only for managers and only when EmailJS is
 * configured. Each send stamps `reminderSentAt` on the ticket, so the live
 * Firestore update drops it from the next scan — a reminder never goes twice.
 */
export default function ReminderScanner({
  tickets,
  enabled,
}: {
  tickets: Ticket[];
  enabled: boolean;
}) {
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !emailjsConfigured() || running.current) return;
    const due = dueReminders(tickets, new Date());
    if (due.length === 0) return;

    running.current = true;
    void (async () => {
      let sent = 0;
      for (const reminder of due) {
        try {
          await sendServiceReminder(reminder);
          sent += 1;
        } catch (e) {
          setError(e instanceof Error ? e.message : "A reminder failed to send");
        }
      }
      if (sent > 0) setSentCount((c) => c + sent);
      running.current = false;
    })();
  }, [tickets, enabled]);

  if (!enabled) return null;

  if (error) {
    return (
      <p className="border-b border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300 no-print">
        Service reminder problem: {error}
      </p>
    );
  }

  if (sentCount > 0) {
    return (
      <p className="border-b border-emerald-900 bg-emerald-950 px-4 py-2 text-sm text-emerald-300 no-print">
        Sent {sentCount} service reminder{sentCount === 1 ? "" : "s"} to
        customers with an upcoming next-service date.
      </p>
    );
  }

  return null;
}
