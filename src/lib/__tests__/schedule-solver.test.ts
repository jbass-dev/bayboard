import type {
  ShiftAssignment,
  ShiftRequirement,
  Technician,
} from "../../types";
import {
  shiftHours,
  shiftsOverlap,
  solveSchedule,
  staticIneligibility,
  toMinutes,
  weekdayOf,
} from "../schedule-solver";

// 2026-07-13 is a Monday, so weekdays line up with real dates all week.
const MON = "2026-07-13";
const TUE = "2026-07-14";

/** Available every day, 08:00–18:00. */
const allWeek = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  start: "08:00",
  end: "18:00",
}));

function makeTech(id: string, overrides: Partial<Technician> = {}): Technician {
  return {
    id,
    name: id,
    certifications: [],
    availability: allWeek,
    ...overrides,
  };
}

function makeShift(
  id: string,
  overrides: Partial<ShiftRequirement> = {},
): ShiftRequirement {
  return {
    id,
    date: MON,
    start: "08:00",
    end: "16:00",
    role: "Floor",
    requiredCerts: [],
    headcount: 1,
    ...overrides,
  };
}

describe("time helpers", () => {
  it("converts HH:MM to minutes", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("08:30")).toBe(510);
  });

  it("computes shift length in hours", () => {
    expect(shiftHours({ start: "08:00", end: "16:30" })).toBe(8.5);
  });

  it("detects overlap only on the same date", () => {
    const a = makeShift("a", { start: "08:00", end: "12:00" });
    const b = makeShift("b", { start: "11:00", end: "15:00" });
    const c = makeShift("c", { start: "12:00", end: "15:00" });
    const d = makeShift("d", { start: "11:00", end: "15:00", date: TUE });
    expect(shiftsOverlap(a, b)).toBe(true);
    expect(shiftsOverlap(a, c)).toBe(false); // back-to-back is fine
    expect(shiftsOverlap(a, d)).toBe(false); // different day
  });

  it("maps dates to weekdays", () => {
    expect(weekdayOf(MON)).toBe(1);
    expect(weekdayOf("2026-07-12")).toBe(0); // Sunday
  });
});

describe("staticIneligibility", () => {
  it("flags a missing certification", () => {
    const shift = makeShift("s", { requiredCerts: ["state-inspection"] });
    expect(staticIneligibility(makeTech("t"), shift)).toEqual({
      kind: "missing-cert",
      cert: "state-inspection",
    });
  });

  it("flags a shift outside availability", () => {
    const tech = makeTech("t", {
      availability: [{ weekday: 1, start: "10:00", end: "18:00" }],
    });
    // Starts at 08:00, before the 10:00 window opens.
    expect(staticIneligibility(tech, makeShift("s"))).toEqual({
      kind: "unavailable",
    });
  });

  it("accepts a shift fully inside a window", () => {
    const tech = makeTech("t", {
      certifications: ["keyholder"],
    });
    const shift = makeShift("s", { requiredCerts: ["keyholder"] });
    expect(staticIneligibility(tech, shift)).toBeNull();
  });
});

describe("solveSchedule — filling", () => {
  it("fills a simple week completely", () => {
    const shifts = [
      makeShift("mon-open", { start: "08:00", end: "12:00" }),
      makeShift("mon-close", { start: "12:00", end: "16:00" }),
      makeShift("tue-open", { date: TUE, start: "08:00", end: "12:00" }),
    ];
    const techs = [makeTech("alex"), makeTech("john")];
    const result = solveSchedule(shifts, techs);
    expect(result.unfilled).toHaveLength(0);
    expect(result.assignments).toHaveLength(3);
  });

  it("expands headcount into slots with distinct technicians", () => {
    const shifts = [makeShift("sat-rush", { headcount: 2 })];
    const techs = [makeTech("alex"), makeTech("john")];
    const result = solveSchedule(shifts, techs);
    expect(result.unfilled).toHaveLength(0);
    const assigned = result.assignments.map((a) => a.technicianId).sort();
    expect(assigned).toEqual(["alex", "john"]); // never the same tech twice
  });

  it("gives certified shifts to certified technicians", () => {
    const shifts = [
      makeShift("inspect", { requiredCerts: ["state-inspection"] }),
    ];
    const techs = [
      makeTech("alex"),
      makeTech("john", { certifications: ["state-inspection"] }),
    ];
    const result = solveSchedule(shifts, techs);
    expect(result.assignments).toEqual([
      { shiftId: "inspect", technicianId: "john" },
    ]);
  });

  it("never double-books a technician across overlapping shifts", () => {
    const shifts = [
      makeShift("a", { start: "08:00", end: "14:00" }),
      makeShift("b", { start: "10:00", end: "16:00" }),
    ];
    const techs = [makeTech("alex"), makeTech("john")];
    const result = solveSchedule(shifts, techs);
    expect(result.unfilled).toHaveLength(0);
    const byShift = new Map(result.assignments.map((a) => [a.shiftId, a.technicianId]));
    expect(byShift.get("a")).not.toBe(byShift.get("b"));
  });

  it("respects the weekly-hours cap", () => {
    // Five 8h shifts, but each tech may only work 16h.
    const shifts = [1, 2, 3, 4, 5].map((d) =>
      makeShift(`d${d}`, { date: `2026-07-1${d + 2}` }),
    );
    const techs = [
      makeTech("alex", { maxWeeklyHours: 16 }),
      makeTech("john", { maxWeeklyHours: 16 }),
    ];
    const result = solveSchedule(shifts, techs);
    // 32 tech-hours available, 40 needed: exactly one shift stays open.
    expect(result.assignments).toHaveLength(4);
    expect(result.unfilled).toHaveLength(1);
    const hours = new Map<string, number>();
    for (const a of result.assignments) {
      hours.set(a.technicianId, (hours.get(a.technicianId) ?? 0) + 8);
    }
    for (const h of hours.values()) expect(h).toBeLessThanOrEqual(16);
  });

  it("backtracks when a greedy first pick would dead-end", () => {
    // "flex" can work either shift; "early-only" can only work the morning.
    // A greedy solver that hands the morning to "flex" strands the afternoon.
    const shifts = [
      makeShift("morning", { start: "08:00", end: "12:00" }),
      makeShift("afternoon", { start: "12:00", end: "17:00" }),
    ];
    const techs = [
      makeTech("early-only", {
        availability: [{ weekday: 1, start: "08:00", end: "12:00" }],
      }),
      makeTech("flex"),
    ];
    const result = solveSchedule(shifts, techs);
    expect(result.unfilled).toHaveLength(0);
    const byShift = new Map(result.assignments.map((a) => [a.shiftId, a.technicianId]));
    expect(byShift.get("morning")).toBe("early-only");
    expect(byShift.get("afternoon")).toBe("flex");
  });

  it("honours existing assignments instead of duplicating them", () => {
    const shifts = [makeShift("s", { headcount: 2 })];
    const techs = [makeTech("alex"), makeTech("john")];
    const existing: ShiftAssignment[] = [
      { id: "e1", shiftId: "s", technicianId: "john" },
    ];
    const result = solveSchedule(shifts, techs, existing);
    // Only the second slot is open, and john is already on the shift.
    expect(result.assignments).toEqual([{ shiftId: "s", technicianId: "alex" }]);
  });
});

describe("solveSchedule — explaining what it could not fill", () => {
  it("explains a slot no one is certified for", () => {
    const shifts = [makeShift("inspect", { requiredCerts: ["state-inspection"] })];
    const techs = [makeTech("alex"), makeTech("john")];
    const result = solveSchedule(shifts, techs);
    expect(result.assignments).toHaveLength(0);
    expect(result.unfilled).toHaveLength(1);
    expect(result.unfilled[0].shiftId).toBe("inspect");
    expect(result.unfilled[0].rulings).toEqual([
      {
        technicianId: "alex",
        reason: { kind: "missing-cert", cert: "state-inspection" },
      },
      {
        technicianId: "john",
        reason: { kind: "missing-cert", cert: "state-inspection" },
      },
    ]);
  });

  it("explains a slot lost to double-booking with one technician", () => {
    const shifts = [
      makeShift("a", { start: "08:00", end: "14:00" }),
      makeShift("b", { start: "10:00", end: "16:00" }),
    ];
    const techs = [makeTech("solo")];
    const result = solveSchedule(shifts, techs);
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
    const [unfilled] = result.unfilled;
    expect(unfilled.rulings[0].reason.kind).toBe("overlapping-shift");
  });

  it("explains headcount that exceeds the roster", () => {
    const shifts = [makeShift("rush", { headcount: 2 })];
    const techs = [makeTech("solo")];
    const result = solveSchedule(shifts, techs);
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilled).toHaveLength(1);
    expect(result.unfilled[0].slotIndex).toBe(1);
    expect(result.unfilled[0].rulings[0].reason).toEqual({
      kind: "already-on-this-shift",
    });
  });

  it("fills what it can even when the week is over-constrained", () => {
    const shifts = [
      makeShift("fillable"),
      makeShift("impossible", { requiredCerts: ["brakes"] }),
    ];
    const techs = [makeTech("alex")];
    const result = solveSchedule(shifts, techs);
    expect(result.assignments).toEqual([
      { shiftId: "fillable", technicianId: "alex" },
    ]);
    expect(result.unfilled).toHaveLength(1);
    expect(result.unfilled[0].shiftId).toBe("impossible");
  });

  it("returns deterministic output for the same input", () => {
    const shifts = [
      makeShift("a", { start: "08:00", end: "12:00" }),
      makeShift("b", { start: "12:00", end: "16:00" }),
      makeShift("c", { date: TUE }),
    ];
    const techs = [makeTech("alex"), makeTech("john"), makeTech("sam")];
    const first = solveSchedule(shifts, techs);
    const second = solveSchedule(shifts, techs);
    expect(second).toEqual(first);
  });
});
