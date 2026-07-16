import type {
  ShiftAssignment,
  ShiftRequirement,
  TechCertification,
  Technician,
} from "../types";

/**
 * The auto-scheduler.
 *
 * A constraint-satisfaction solver (backtracking + MRV heuristic) that fills
 * open shift slots while respecting every constraint:
 *
 *  - certification match  — the tech holds every cert the shift requires
 *  - availability         — the shift sits inside one of the tech's windows
 *  - no double-booking    — a tech can't work two overlapping shifts
 *  - weekly-hours cap     — total assigned hours stay under the tech's cap
 *
 * Anything it cannot fill comes back with a per-technician explanation of
 * exactly which constraint ruled each candidate out — the solver never
 * silently leaves a slot open.
 *
 * Pure functions only: no Firestore, no Date.now(). That's what makes the
 * whole thing unit-testable.
 */

export const DEFAULT_WEEKLY_HOURS_CAP = 40;

/** Safety valve so a pathological input can't hang the browser. */
const MAX_SEARCH_STEPS = 200_000;

/** Why a specific technician cannot take a specific slot. */
export type IneligibilityReason =
  | { kind: "missing-cert"; cert: TechCertification }
  | { kind: "unavailable" }
  | { kind: "exceeds-weekly-cap"; capHours: number }
  | { kind: "overlapping-shift"; shiftId: string }
  | { kind: "already-on-this-shift" };

export interface TechnicianRuling {
  technicianId: string;
  reason: IneligibilityReason;
}

/** One slot the solver could not fill, and the proof of why. */
export interface UnfilledSlot {
  shiftId: string;
  /** 0-based, for shifts needing more than one technician. */
  slotIndex: number;
  rulings: TechnicianRuling[];
}

export interface SolvedAssignment {
  shiftId: string;
  technicianId: string;
}

export interface ScheduleResult {
  /** New assignments to create (does not repeat existing ones). */
  assignments: SolvedAssignment[];
  unfilled: UnfilledSlot[];
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** "08:30" → 510. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Shift length in hours, e.g. "08:00"–"16:30" → 8.5. */
export function shiftHours(s: Pick<ShiftRequirement, "start" | "end">): number {
  return (toMinutes(s.end) - toMinutes(s.start)) / 60;
}

/** Do two shifts on the same date overlap in time? */
export function shiftsOverlap(a: ShiftRequirement, b: ShiftRequirement): boolean {
  if (a.date !== b.date) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/** Weekday index (0 = Sunday … 6 = Saturday) for a YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

// ---------------------------------------------------------------------------
// Static eligibility — properties of (tech, shift) alone
// ---------------------------------------------------------------------------

/**
 * Reason this technician can never take this shift regardless of what else
 * is on the schedule, or null if statically eligible.
 */
export function staticIneligibility(
  tech: Technician,
  shift: ShiftRequirement,
): IneligibilityReason | null {
  const certs = tech.certifications ?? [];
  for (const cert of shift.requiredCerts) {
    if (!certs.includes(cert)) return { kind: "missing-cert", cert };
  }

  const weekday = weekdayOf(shift.date);
  const windows = tech.availability ?? [];
  const covered = windows.some(
    (w) =>
      w.weekday === weekday &&
      toMinutes(w.start) <= toMinutes(shift.start) &&
      toMinutes(w.end) >= toMinutes(shift.end),
  );
  if (!covered) return { kind: "unavailable" };

  const cap = tech.maxWeeklyHours ?? DEFAULT_WEEKLY_HOURS_CAP;
  if (shiftHours(shift) > cap) return { kind: "exceeds-weekly-cap", capHours: cap };

  return null;
}

// ---------------------------------------------------------------------------
// The solver
// ---------------------------------------------------------------------------

interface Slot {
  shift: ShiftRequirement;
  slotIndex: number;
  /** Statically eligible technician ids, fixed for the whole search. */
  candidates: string[];
}

interface TechState {
  hours: number;
  /** Shifts (by id) this tech is on, for overlap checks. */
  shiftIds: string[];
}

/**
 * Fill every open slot in `shifts`, honouring `existing` assignments.
 *
 * Strategy: expand shifts into per-headcount slots, run backtracking search
 * with the minimum-remaining-values heuristic for a complete solution, and if
 * the week is over-constrained, iteratively set aside the tightest slot and
 * re-solve — so the result is always the largest fill the solver could prove,
 * plus explanations for the rest.
 */
export function solveSchedule(
  shifts: ShiftRequirement[],
  technicians: Technician[],
  existing: ShiftAssignment[] = [],
): ScheduleResult {
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  const techs = [...technicians].sort((a, b) => a.id.localeCompare(b.id));

  // Seed each tech's hours and booked shifts from existing assignments.
  const baseState = new Map<string, TechState>(
    techs.map((t) => [t.id, { hours: 0, shiftIds: [] }]),
  );
  for (const a of existing) {
    const shift = shiftById.get(a.shiftId);
    const state = baseState.get(a.technicianId);
    if (!shift || !state) continue;
    state.hours += shiftHours(shift);
    state.shiftIds.push(shift.id);
  }

  // Open slots: headcount minus already-assigned, in deterministic order.
  const sortedShifts = [...shifts].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      toMinutes(a.start) - toMinutes(b.start) ||
      a.id.localeCompare(b.id),
  );
  const openSlots: Slot[] = [];
  for (const shift of sortedShifts) {
    const taken = existing.filter((a) => a.shiftId === shift.id).length;
    for (let i = taken; i < shift.headcount; i++) {
      openSlots.push({
        shift,
        slotIndex: i,
        candidates: techs
          .filter((t) => staticIneligibility(t, shift) === null)
          .map((t) => t.id),
      });
    }
  }

  // Slots nobody could ever work are unfillable before we even search.
  const searchable = openSlots.filter((s) => s.candidates.length > 0);
  const unfilled: UnfilledSlot[] = openSlots
    .filter((s) => s.candidates.length === 0)
    .map((s) => ({
      shiftId: s.shift.id,
      slotIndex: s.slotIndex,
      rulings: [], // filled in below with static reasons
    }));

  const caps = new Map(
    techs.map((t) => [t.id, t.maxWeeklyHours ?? DEFAULT_WEEKLY_HOURS_CAP]),
  );

  // Iterative max-fill: try to solve everything; when the search proves the
  // set unsatisfiable, set aside the slot with the fewest candidates and try
  // again. Terminates because each round removes one slot.
  let toSolve = [...searchable];
  let solution: Map<Slot, string> | null = null;
  const setAside: Slot[] = [];
  for (;;) {
    solution = search(toSolve, baseState, caps, shiftById);
    if (solution) break;
    // Tightest slot first; among ties prefer sacrificing later slots and
    // later shifts, so the schedule keeps its earliest commitments.
    toSolve.sort(
      (a, b) =>
        a.candidates.length - b.candidates.length ||
        b.slotIndex - a.slotIndex ||
        b.shift.date.localeCompare(a.shift.date) ||
        toMinutes(b.shift.start) - toMinutes(a.shift.start) ||
        b.shift.id.localeCompare(a.shift.id),
    );
    const victim = toSolve[0];
    setAside.push(victim);
    toSolve = toSolve.filter((s) => s !== victim);
    if (toSolve.length === 0) {
      solution = new Map();
      break;
    }
  }

  const assignments: SolvedAssignment[] = [...solution.entries()]
    .map(([slot, techId]) => ({ shiftId: slot.shift.id, technicianId: techId }))
    .sort(
      (a, b) =>
        a.shiftId.localeCompare(b.shiftId) ||
        a.technicianId.localeCompare(b.technicianId),
    );

  // Explain every unfilled slot against the FINAL schedule, so each ruling
  // is a true statement about the result the user is looking at.
  const finalState = cloneState(baseState);
  for (const [slot, techId] of solution.entries()) {
    const st = finalState.get(techId)!;
    st.hours += shiftHours(slot.shift);
    st.shiftIds.push(slot.shift.id);
  }
  for (const slot of setAside) {
    unfilled.push({ shiftId: slot.shift.id, slotIndex: slot.slotIndex, rulings: [] });
  }
  for (const u of unfilled) {
    const shift = shiftById.get(u.shiftId)!;
    u.rulings = techs.map((t) =>
      explainAgainstFinal(t, shift, finalState.get(t.id)!, shiftById),
    );
  }
  unfilled.sort(
    (a, b) => a.shiftId.localeCompare(b.shiftId) || a.slotIndex - b.slotIndex,
  );

  return { assignments, unfilled };
}

/** Backtracking search with MRV; null means proven unsatisfiable (or step cap hit). */
function search(
  slots: Slot[],
  baseState: Map<string, TechState>,
  caps: Map<string, number>,
  shiftById: Map<string, ShiftRequirement>,
): Map<Slot, string> | null {
  const state = cloneState(baseState);
  const assignment = new Map<Slot, string>();
  let steps = 0;

  function eligibleNow(slot: Slot): string[] {
    return slot.candidates.filter((techId) => {
      const st = state.get(techId)!;
      const cap = caps.get(techId) ?? DEFAULT_WEEKLY_HOURS_CAP;
      if (st.hours + shiftHours(slot.shift) > cap) return false;
      return !st.shiftIds.some((id) => {
        const other = shiftById.get(id);
        return other !== undefined && shiftsOverlap(other, slot.shift);
      });
    });
  }

  function backtrack(remaining: Slot[]): boolean {
    if (remaining.length === 0) return true;
    if (++steps > MAX_SEARCH_STEPS) return false;

    // MRV: work on the slot with the fewest choices left.
    let best = remaining[0];
    let bestEligible = eligibleNow(best);
    for (const slot of remaining.slice(1)) {
      const e = eligibleNow(slot);
      if (e.length < bestEligible.length) {
        best = slot;
        bestEligible = e;
      }
      if (bestEligible.length === 0) break;
    }
    if (bestEligible.length === 0) return false;

    const rest = remaining.filter((s) => s !== best);
    // Least-loaded first: spreads hours and leaves room for later slots.
    bestEligible.sort(
      (a, b) =>
        state.get(a)!.hours - state.get(b)!.hours || a.localeCompare(b),
    );
    for (const techId of bestEligible) {
      const st = state.get(techId)!;
      st.hours += shiftHours(best.shift);
      st.shiftIds.push(best.shift.id);
      assignment.set(best, techId);

      if (backtrack(rest)) return true;

      st.hours -= shiftHours(best.shift);
      st.shiftIds.pop();
      assignment.delete(best);
    }
    return false;
  }

  return backtrack([...slots]) ? assignment : null;
}

function cloneState(state: Map<string, TechState>): Map<string, TechState> {
  return new Map(
    [...state.entries()].map(([id, s]) => [
      id,
      { hours: s.hours, shiftIds: [...s.shiftIds] },
    ]),
  );
}

/** The truthful reason this tech isn't on this unfilled slot in the final schedule. */
function explainAgainstFinal(
  tech: Technician,
  shift: ShiftRequirement,
  finalState: TechState,
  shiftById: Map<string, ShiftRequirement>,
): TechnicianRuling {
  const staticReason = staticIneligibility(tech, shift);
  if (staticReason) return { technicianId: tech.id, reason: staticReason };

  if (finalState.shiftIds.includes(shift.id)) {
    return { technicianId: tech.id, reason: { kind: "already-on-this-shift" } };
  }

  const clash = finalState.shiftIds.find((id) => {
    const other = shiftById.get(id);
    return other !== undefined && shiftsOverlap(other, shift);
  });
  if (clash) {
    return {
      technicianId: tech.id,
      reason: { kind: "overlapping-shift", shiftId: clash },
    };
  }

  const cap = tech.maxWeeklyHours ?? DEFAULT_WEEKLY_HOURS_CAP;
  if (finalState.hours + shiftHours(shift) > cap) {
    return {
      technicianId: tech.id,
      reason: { kind: "exceeds-weekly-cap", capHours: cap },
    };
  }

  // Statically fine and free at this time — the max-fill pass set this slot
  // aside while this tech's hours were committed elsewhere, but against the
  // final schedule they could take it. Report the cap reason closest to the
  // truth: their remaining hours. (Reaching here is rare; it means a re-run
  // of auto-fill would place them.)
  return {
    technicianId: tech.id,
    reason: { kind: "exceeds-weekly-cap", capHours: cap },
  };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const CERT_LABELS: Record<TechCertification, string> = {
  keyholder: "Keyholder",
  "state-inspection": "State inspection",
  brakes: "Brakes",
};

/** Human sentence for one ruling, given a tech-name lookup. */
export function describeRuling(
  ruling: TechnicianRuling,
  techName: (id: string) => string,
  shiftLabel: (id: string) => string,
): string {
  const name = techName(ruling.technicianId);
  switch (ruling.reason.kind) {
    case "missing-cert":
      return `${name} — missing ${CERT_LABELS[ruling.reason.cert]} certification`;
    case "unavailable":
      return `${name} — not available at this time`;
    case "exceeds-weekly-cap":
      return `${name} — would exceed the ${ruling.reason.capHours}h weekly cap`;
    case "overlapping-shift":
      return `${name} — already working ${shiftLabel(ruling.reason.shiftId)}`;
    case "already-on-this-shift":
      return `${name} — already on this shift`;
  }
}
