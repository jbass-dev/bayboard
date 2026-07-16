"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppNav from "../../components/AppNav";
import { auth } from "../../lib/firebase";
import {
  autoFillSchedule,
  clearAssignments,
  removeAssignment,
  seedDemoWeek,
} from "../../lib/schedule-actions";
import {
  CERT_LABELS,
  describeRuling,
  type UnfilledSlot,
} from "../../lib/schedule-solver";
import { useAuth } from "../../lib/useAuth";
import { useCollection } from "../../lib/useCollection";
import type {
  ShiftAssignment,
  ShiftRequirement,
  Technician,
} from "../../types";

/** "Mon Jul 13" for a YYYY-MM-DD key. */
function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function SchedulePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const shifts = useCollection<ShiftRequirement>("shiftRequirements");
  const technicians = useCollection<Technician>("technicians");
  const assignments = useCollection<ShiftAssignment>("shiftAssignments");

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastUnfilled, setLastUnfilled] = useState<UnfilledSlot[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const byDate = useMemo(() => {
    const grouped = new Map<string, ShiftRequirement[]>();
    for (const s of shifts.data) {
      const list = grouped.get(s.date) ?? [];
      list.push(s);
      grouped.set(s.date, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.start.localeCompare(b.start));
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [shifts.data]);

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </main>
    );
  }

  const techName = (id: string): string =>
    technicians.data.find((t) => t.id === id)?.name ?? "Unknown";
  const shiftLabel = (id: string): string => {
    const s = shifts.data.find((x) => x.id === id);
    return s ? `${s.role} ${dayLabel(s.date)} ${s.start}–${s.end}` : "another shift";
  };

  const openSlots = shifts.data.reduce(
    (n, s) =>
      n + Math.max(0, s.headcount - assignments.data.filter((a) => a.shiftId === s.id).length),
    0,
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const autoFill = () =>
    run(async () => {
      const result = await autoFillSchedule(
        shifts.data,
        technicians.data,
        assignments.data,
      );
      setLastUnfilled(result.unfilled);
    });

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Bay<span className="text-amber-500">Board</span>
          </h1>
          <AppNav current="schedule" />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-400 sm:inline">{user.email}</span>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </header>

      {actionError && (
        <p className="border-b border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {actionError}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-zinc-100">Staff schedule</h2>
            <p className="text-sm text-zinc-500">
              {shifts.data.length} shifts ·{" "}
              <span className={openSlots > 0 ? "text-amber-400" : "text-emerald-400"}>
                {openSlots} open {openSlots === 1 ? "slot" : "slots"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {shifts.data.length === 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => seedDemoWeek(technicians.data))}
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
              >
                Load demo week
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy || openSlots === 0}
                  onClick={() => void autoFill()}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {busy ? "Working…" : "Auto-fill open shifts"}
                </button>
                <button
                  type="button"
                  disabled={busy || assignments.data.length === 0}
                  onClick={() =>
                    run(async () => {
                      await clearAssignments(assignments.data);
                      setLastUnfilled(null);
                    })
                  }
                  className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Clear assignments
                </button>
              </>
            )}
          </div>
        </div>

        {lastUnfilled !== null && (
          <section
            role="status"
            className={`rounded-xl border p-4 ${
              lastUnfilled.length === 0
                ? "border-emerald-900 bg-emerald-950/40"
                : "border-amber-900 bg-amber-950/30"
            }`}
          >
            {lastUnfilled.length === 0 ? (
              <p className="text-sm text-emerald-300">
                Every open slot was filled — all constraints satisfied.
              </p>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-amber-300">
                  {lastUnfilled.length}{" "}
                  {lastUnfilled.length === 1 ? "slot" : "slots"} could not be
                  filled
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {lastUnfilled.map((u) => (
                    <li key={`${u.shiftId}-${u.slotIndex}`} className="text-sm">
                      <p className="font-medium text-zinc-200">
                        {shiftLabel(u.shiftId)}
                      </p>
                      <ul className="mt-0.5 list-inside list-disc text-zinc-400">
                        {u.rulings.map((r) => (
                          <li key={r.technicianId}>
                            {describeRuling(r, techName, shiftLabel)}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {shifts.loading ? (
          <p className="text-sm text-zinc-500">Loading schedule…</p>
        ) : shifts.data.length === 0 ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center">
            <p className="text-zinc-300">No shifts posted yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Load the demo week to see the auto-scheduler fill a realistic
              schedule — and explain the one shift it can&apos;t.
            </p>
          </section>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byDate.map(([date, dayShifts]) => (
              <section
                key={date}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
              >
                <h3 className="font-semibold text-zinc-100">{dayLabel(date)}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {dayShifts.map((shift) => {
                    const assigned = assignments.data.filter(
                      (a) => a.shiftId === shift.id,
                    );
                    const open = shift.headcount - assigned.length;
                    return (
                      <li
                        key={shift.id}
                        className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-2.5"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-100">
                            {shift.role}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {shift.start}–{shift.end}
                          </span>
                        </div>
                        {shift.requiredCerts.length > 0 && (
                          <p className="mt-0.5 text-xs text-zinc-500">
                            Needs: {shift.requiredCerts.map((c) => CERT_LABELS[c]).join(", ")}
                          </p>
                        )}
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {assigned.map((a) => (
                            <li key={a.id}>
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700 py-0.5 pl-2 pr-1 text-xs text-zinc-100">
                                {techName(a.technicianId)}
                                <button
                                  type="button"
                                  aria-label={`Remove ${techName(a.technicianId)} from ${shift.role}`}
                                  disabled={busy}
                                  onClick={() => run(() => removeAssignment(a.id))}
                                  className="rounded-full px-1 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-100"
                                >
                                  ×
                                </button>
                              </span>
                            </li>
                          ))}
                          {open > 0 && (
                            <li className="rounded-full border border-dashed border-amber-600/60 px-2 py-0.5 text-xs text-amber-400">
                              {open} open
                            </li>
                          )}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
