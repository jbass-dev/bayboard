import type { Ticket } from "../../types";
import { summarizeDay } from "../summary-logic";

function completed(
  id: string,
  service: Ticket["service"],
  bayId: string,
  startedAt: string,
  completedAt: string,
): Ticket {
  return {
    id,
    vehicle: { year: 2020, make: "Honda", model: "Civic" },
    service,
    status: { kind: "complete", bayId, technicianId: "t1", startedAt, completedAt },
    partsUsed: [],
    notes: "",
    createdAt: startedAt,
  };
}

const day = "2026-07-12";

const tickets: Ticket[] = [
  completed("a", "oil-change", "bay-1", `${day}T08:00:00.000Z`, `${day}T08:20:00.000Z`),
  completed("b", "oil-change", "bay-2", `${day}T08:30:00.000Z`, `${day}T09:00:00.000Z`),
  completed("c", "tire-rotation", "bay-1", `${day}T09:00:00.000Z`, `${day}T09:40:00.000Z`),
  // A completion on a different day should be ignored.
  completed("d", "oil-change", "bay-1", "2026-07-11T08:00:00.000Z", "2026-07-11T08:20:00.000Z"),
  // A still-waiting ticket should be ignored.
  {
    id: "e",
    vehicle: { year: 2020, make: "Ford", model: "Focus" },
    service: "oil-change",
    status: { kind: "waiting", since: `${day}T09:50:00.000Z` },
    partsUsed: [],
    notes: "",
    createdAt: `${day}T09:50:00.000Z`,
  },
];

describe("summarizeDay", () => {
  const s = summarizeDay(tickets, day);

  it("counts only cars completed on the given day", () => {
    expect(s.carsServed).toBe(3);
  });

  it("averages service time across the day", () => {
    // 20 + 30 + 40 = 90 / 3 = 30
    expect(s.avgMinutes).toBe(30);
  });

  it("breaks down services by type, omitting zero counts", () => {
    const oil = s.servicesByType.find((x) => x.service === "oil-change");
    const tire = s.servicesByType.find((x) => x.service === "tire-rotation");
    const coolant = s.servicesByType.find((x) => x.service === "coolant-flush");
    expect(oil?.count).toBe(2);
    expect(tire?.count).toBe(1);
    expect(coolant).toBeUndefined();
  });

  it("reports average time per bay", () => {
    const bay1 = s.perBay.find((b) => b.bayId === "bay-1");
    // bay-1 did a 20-min oil change and a 40-min rotation -> avg 30
    expect(bay1?.count).toBe(2);
    expect(bay1?.avgMinutes).toBe(30);
  });

  it("is empty when nothing completed that day", () => {
    expect(summarizeDay(tickets, "2020-01-01").carsServed).toBe(0);
  });
});
