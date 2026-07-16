import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type {
  ShiftAssignment,
  ShiftRequirement,
  Technician,
} from "../types";
import { db } from "./firebase";
import { solveSchedule, type ScheduleResult } from "./schedule-solver";

/**
 * Run the auto-scheduler over the given week and persist what it filled.
 * Existing assignments are respected, never rewritten. Returns the full
 * result so the page can show what was filled and explain what wasn't.
 */
export async function autoFillSchedule(
  shifts: ShiftRequirement[],
  technicians: Technician[],
  existing: ShiftAssignment[],
): Promise<ScheduleResult> {
  const result = solveSchedule(shifts, technicians, existing);
  if (result.assignments.length > 0) {
    const batch = writeBatch(db);
    for (const a of result.assignments) {
      batch.set(doc(collection(db, "shiftAssignments")), {
        shiftId: a.shiftId,
        technicianId: a.technicianId,
      });
    }
    await batch.commit();
  }
  return result;
}

/** Take one technician off one shift. */
export async function removeAssignment(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, "shiftAssignments", assignmentId));
}

/** Remove every assignment shown, so a week can be re-planned from scratch. */
export async function clearAssignments(
  assignments: ShiftAssignment[],
): Promise<void> {
  const batch = writeBatch(db);
  for (const a of assignments) {
    batch.delete(doc(db, "shiftAssignments", a.id));
  }
  await batch.commit();
}

/** YYYY-MM-DD for the given date in local time. */
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The Monday of the week containing `now`, at midnight local. */
export function mondayOf(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - shift);
  return d;
}

const WEEKDAY_AVAILABILITY = [1, 2, 3, 4, 5]; // Mon–Fri
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];

/**
 * Demo staffing week: gives the existing technicians availability and
 * certifications (only where missing), hires one part-timer, and posts a
 * realistic week of shift requirements — including one shift nobody can
 * fill, so the explanation panel has something to show.
 */
export async function seedDemoWeek(
  technicians: Technician[],
  now: Date = new Date(),
): Promise<void> {
  const monday = mondayOf(now);
  const dayN = (offset: number): string => {
    const d = new Date(monday);
    d.setDate(d.getDate() + offset);
    return dateKey(d);
  };

  // Round out the roster. Existing techs keep whatever they already have.
  const [first, second] = technicians;
  if (first && !first.availability) {
    await updateDoc(doc(db, "technicians", first.id), {
      certifications: ["keyholder", "state-inspection"],
      availability: ALL_WEEK.map((weekday) => ({
        weekday,
        start: "07:30",
        end: "18:30",
      })),
      maxWeeklyHours: 40,
    });
  }
  if (second && !second.availability) {
    await updateDoc(doc(db, "technicians", second.id), {
      certifications: ["keyholder", "brakes"],
      availability: WEEKDAY_AVAILABILITY.map((weekday) => ({
        weekday,
        start: "07:30",
        end: "16:00",
      })),
      maxWeeklyHours: 40,
    });
  }
  await addDoc(collection(db, "technicians"), {
    name: "Riley (part-time)",
    certifications: [],
    availability: [3, 4, 5, 6].map((weekday) => ({
      weekday,
      start: "12:00",
      end: "18:30",
    })),
    maxWeeklyHours: 20,
  });

  const shifts = collection(db, "shiftRequirements");
  const week: Omit<ShiftRequirement, "id">[] = [];
  for (let day = 0; day < 6; day++) {
    // Mon–Sat
    week.push({
      date: dayN(day),
      start: "08:00",
      end: "16:00",
      role: "Opener",
      requiredCerts: ["keyholder"],
      headcount: 1,
    });
    week.push({
      date: dayN(day),
      start: "10:00",
      end: "18:00",
      role: "Closer",
      requiredCerts: ["keyholder"],
      headcount: 1,
    });
  }
  // Saturday rush needs an extra pair of hands.
  week.push({
    date: dayN(5),
    start: "12:00",
    end: "18:00",
    role: "Floor",
    requiredCerts: [],
    headcount: 1,
  });
  // Deliberately unfillable: nobody on the roster holds a brakes cert AND
  // works Sunday — so the demo shows the explanation panel, not just success.
  week.push({
    date: dayN(6),
    start: "09:00",
    end: "13:00",
    role: "Brake inspections",
    requiredCerts: ["brakes"],
    headcount: 1,
  });

  await Promise.all(week.map((s) => addDoc(shifts, s)));
}
