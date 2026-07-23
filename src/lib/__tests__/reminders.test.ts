import type { Customer, Ticket } from "../../types";
import { allReminders, daysUntil, dueReminders } from "../reminders";

const NOW = new Date("2026-07-23T12:00:00.000Z");

/** A completed ticket, optionally with a customer / next-service date / sent stamp. */
function completed(
  id: string,
  opts: {
    customer?: Customer;
    nextServiceDate?: string;
    reminderSentAt?: string;
  } = {},
): Ticket {
  return {
    id,
    vehicle: { year: 2020, make: "Honda", model: "Civic" },
    service: "oil-change",
    status: {
      kind: "complete",
      bayId: "bay-1",
      technicianId: "t1",
      startedAt: "2026-07-23T08:00:00.000Z",
      completedAt: "2026-07-23T08:20:00.000Z",
    },
    partsUsed: [],
    notes: "",
    createdAt: "2026-07-23T08:00:00.000Z",
    ...opts,
  };
}

const cust: Customer = { name: "Dana", email: "dana@example.com" };

describe("daysUntil", () => {
  it("is positive for future dates and negative for past ones", () => {
    expect(daysUntil("2026-07-26T12:00:00.000Z", NOW)).toBe(3);
    expect(daysUntil("2026-07-20T12:00:00.000Z", NOW)).toBe(-3);
  });
});

describe("dueReminders", () => {
  it("includes completed tickets with a customer whose service is within the window", () => {
    const due = dueReminders(
      [completed("a", { customer: cust, nextServiceDate: "2026-07-27T12:00:00.000Z" })],
      NOW,
    );
    expect(due.map((r) => r.ticketId)).toEqual(["a"]);
    expect(due[0].status).toBe("due");
  });

  it("includes overdue tickets", () => {
    const due = dueReminders(
      [completed("a", { customer: cust, nextServiceDate: "2026-07-01T12:00:00.000Z" })],
      NOW,
    );
    expect(due).toHaveLength(1);
  });

  it("excludes tickets whose next service is beyond the window", () => {
    const due = dueReminders(
      [completed("a", { customer: cust, nextServiceDate: "2026-10-01T12:00:00.000Z" })],
      NOW,
    );
    expect(due).toHaveLength(0);
  });

  it("excludes tickets already reminded — no double sends", () => {
    const due = dueReminders(
      [
        completed("a", {
          customer: cust,
          nextServiceDate: "2026-07-27T12:00:00.000Z",
          reminderSentAt: "2026-07-23T09:00:00.000Z",
        }),
      ],
      NOW,
    );
    expect(due).toHaveLength(0);
  });

  it("excludes tickets with no customer email", () => {
    const due = dueReminders(
      [completed("a", { nextServiceDate: "2026-07-27T12:00:00.000Z" })],
      NOW,
    );
    expect(due).toHaveLength(0);
  });

  it("ignores tickets that are not complete", () => {
    const waiting: Ticket = {
      id: "w",
      vehicle: { year: 2020, make: "Ford", model: "Focus" },
      service: "oil-change",
      status: { kind: "waiting", since: "2026-07-23T09:50:00.000Z" },
      partsUsed: [],
      notes: "",
      customer: cust,
      nextServiceDate: "2026-07-27T12:00:00.000Z",
      createdAt: "2026-07-23T09:50:00.000Z",
    };
    expect(dueReminders([waiting], NOW)).toHaveLength(0);
  });
});

describe("allReminders", () => {
  it("classifies sent / due / scheduled and sorts soonest first", () => {
    const reminders = allReminders(
      [
        completed("far", { customer: cust, nextServiceDate: "2026-10-01T12:00:00.000Z" }),
        completed("soon", { customer: cust, nextServiceDate: "2026-07-25T12:00:00.000Z" }),
        completed("done", {
          customer: cust,
          nextServiceDate: "2026-07-24T12:00:00.000Z",
          reminderSentAt: "2026-07-23T09:00:00.000Z",
        }),
      ],
      NOW,
    );
    expect(reminders.map((r) => r.ticketId)).toEqual(["done", "soon", "far"]);
    expect(reminders.map((r) => r.status)).toEqual(["sent", "due", "scheduled"]);
  });
});
