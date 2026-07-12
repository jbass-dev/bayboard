"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppNav from "../../components/AppNav";
import {
  ensureTodayChecklists,
  toggleChecklistItem,
} from "../../lib/checklist-actions";
import { checklistProgress, todayKey } from "../../lib/checklist-logic";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../lib/useAuth";
import { useCollection } from "../../lib/useCollection";
import type { Checklist } from "../../types";

const TITLE: Record<Checklist["type"], string> = {
  opening: "Opening",
  closing: "Closing",
};

/** Local HH:MM for a completed-at stamp. */
function stampTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChecklistsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const checklists = useCollection<Checklist>("checklists");

  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Create today's lists once we know who's signed in.
  useEffect(() => {
    if (user) void ensureTodayChecklists().catch(() => {});
  }, [user]);

  if (authLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </main>
    );
  }

  const today = todayKey(new Date());
  const todays = (["opening", "closing"] as const).map((type) =>
    checklists.data.find((c) => c.date === today && c.type === type),
  );

  async function toggle(checklist: Checklist, itemId: string) {
    setActionError(null);
    try {
      await toggleChecklistItem(checklist, itemId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not update the checklist",
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Bay<span className="text-amber-500">Board</span>
          </h1>
          <AppNav current="checklists" />
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

      {actionError && (
        <p className="border-b border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {actionError}
        </p>
      )}

      <div className="mx-auto grid w-full max-w-3xl flex-1 gap-4 p-4 sm:grid-cols-2">
        {todays.map((checklist, i) => {
          const type = (["opening", "closing"] as const)[i];
          if (!checklist) {
            return (
              <section
                key={type}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <h2 className="font-semibold text-zinc-100">{TITLE[type]}</h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Preparing today&apos;s list…
                </p>
              </section>
            );
          }
          const { done, total } = checklistProgress(checklist);
          return (
            <section
              key={checklist.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold text-zinc-100">
                  {TITLE[checklist.type]}
                </h2>
                <span className="text-xs text-zinc-500">
                  {done}/{total} done
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {checklist.items.map((item) => {
                  const checked = item.completedAt !== null;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void toggle(checklist, item.id)}
                        aria-pressed={checked}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-800/60"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                            checked
                              ? "border-amber-500 bg-amber-500 text-zinc-950"
                              : "border-zinc-600 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span
                          className={
                            checked
                              ? "text-zinc-500 line-through"
                              : "text-zinc-200"
                          }
                        >
                          {item.label}
                        </span>
                        {checked && item.completedAt && (
                          <span className="ml-auto shrink-0 text-xs text-zinc-500">
                            {stampTime(item.completedAt)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
