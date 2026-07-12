"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppNav from "../../components/AppNav";
import ServicesChart from "../../components/ServicesChart";
import { auth } from "../../lib/firebase";
import { summarizeDay } from "../../lib/summary-logic";
import { todayKey } from "../../lib/checklist-logic";
import { useAuth } from "../../lib/useAuth";
import { useCollection } from "../../lib/useCollection";
import type { Bay, Ticket } from "../../types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-100">{value}</p>
    </div>
  );
}

export default function SummaryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const tickets = useCollection<Ticket>("tickets");
  const bays = useCollection<Bay>("bays");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </main>
    );
  }

  const today = todayKey(new Date());
  const summary = summarizeDay(tickets.data, today);
  const bayName = (id: string) =>
    bays.data.find((b) => b.id === id)?.name ?? id;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Bay<span className="text-amber-500">Board</span>
          </h1>
          <AppNav current="summary" />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-400 sm:inline">
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Today</h2>
          <span className="text-sm text-zinc-500">{today}</span>
        </div>

        {summary.carsServed === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
            No completed services yet today. Close out a ticket on the board and
            it will show up here.
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Cars served" value={String(summary.carsServed)} />
              <StatCard
                label="Avg time"
                value={`${summary.avgMinutes} min`}
              />
              <StatCard
                label="Services"
                value={String(
                  summary.servicesByType.reduce((n, s) => n + s.count, 0),
                )}
              />
            </div>

            <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h3 className="text-sm font-semibold text-zinc-300">
                Services by type
              </h3>
              <ServicesChart data={summary.servicesByType} />
            </section>

            <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h3 className="text-sm font-semibold text-zinc-300">
                Average time per bay
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {summary.perBay.map((bay) => (
                  <li
                    key={bay.bayId}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-200">{bayName(bay.bayId)}</span>
                    <span className="text-zinc-400">
                      {bay.avgMinutes} min avg · {bay.count} car
                      {bay.count === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
