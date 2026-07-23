import { doc, updateDoc } from "firebase/firestore";
import { SERVICE_LABELS } from "./board-logic";
import { db } from "./firebase";
import type { Reminder } from "./reminders";

/**
 * Sends next-service reminder emails through EmailJS and records the send on
 * the ticket so it can never go out twice.
 *
 * EmailJS is a client-side email service: the browser POSTs to its REST API
 * with a public key, and EmailJS renders a template and delivers the mail —
 * no backend of our own. Configure it with three public env vars (see
 * .env.local.example). When they're absent the feature stays dormant.
 */

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

/** True only when all three EmailJS env vars are present. */
export function emailjsConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

/** Friendly date for the email body, e.g. "Oct 21, 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Tickets whose reminder is mid-send, so a re-render can't fire a second POST
// for the same ticket before Firestore records the first.
const inFlight = new Set<string>();

/**
 * Email one reminder, then stamp `reminderSentAt` on its ticket. Throws if
 * EmailJS isn't configured or the send fails, leaving the ticket unstamped so
 * a later scan can retry.
 */
export async function sendServiceReminder(reminder: Reminder): Promise<void> {
  if (!emailjsConfigured()) {
    throw new Error("EmailJS is not configured.");
  }
  if (inFlight.has(reminder.ticketId)) return;
  inFlight.add(reminder.ticketId);

  try {
    const res = await fetch(EMAILJS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: {
          to_name: reminder.customer.name || "there",
          to_email: reminder.customer.email,
          service: SERVICE_LABELS[reminder.service],
          next_service_date: formatDate(reminder.nextServiceDate),
        },
      }),
    });

    if (!res.ok) {
      throw new Error(
        `EmailJS send failed (${res.status}): ${await res.text()}`,
      );
    }

    await updateDoc(doc(db, "tickets", reminder.ticketId), {
      reminderSentAt: new Date().toISOString(),
    });
  } finally {
    inFlight.delete(reminder.ticketId);
  }
}
