"use client";

import Link from "next/link";

export type NavKey =
  | "board"
  | "schedule"
  | "inventory"
  | "checklists"
  | "summary";

const LINKS: { key: NavKey; href: string; label: string }[] = [
  { key: "board", href: "/", label: "Board" },
  { key: "schedule", href: "/schedule", label: "Schedule" },
  { key: "inventory", href: "/inventory", label: "Inventory" },
  { key: "checklists", href: "/checklists", label: "Checklists" },
  { key: "summary", href: "/summary", label: "Summary" },
];

/** Primary navigation shared across every view. */
export default function AppNav({ current }: { current: NavKey }) {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1 text-sm">
      {LINKS.map((l) =>
        l.key === current ? (
          <span
            key={l.key}
            aria-current="page"
            className="rounded-md bg-zinc-800 px-2 py-1 font-medium text-zinc-100"
          >
            {l.label}
          </span>
        ) : (
          <Link
            key={l.key}
            href={l.href}
            className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            {l.label}
          </Link>
        ),
      )}
    </nav>
  );
}
