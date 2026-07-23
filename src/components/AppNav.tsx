"use client";

import Link from "next/link";
import { useRole } from "../lib/RoleProvider";

export type NavKey =
  | "board"
  | "schedule"
  | "inventory"
  | "checklists"
  | "summary"
  | "admin";

/** `managerOnly` links are hidden from technicians. */
const LINKS: { key: NavKey; href: string; label: string; managerOnly: boolean }[] =
  [
    { key: "board", href: "/", label: "Board", managerOnly: false },
    { key: "checklists", href: "/checklists", label: "Checklists", managerOnly: false },
    { key: "schedule", href: "/schedule", label: "Schedule", managerOnly: true },
    { key: "inventory", href: "/inventory", label: "Inventory", managerOnly: true },
    { key: "summary", href: "/summary", label: "Summary", managerOnly: true },
    { key: "admin", href: "/admin", label: "Admin", managerOnly: true },
  ];

/** Primary navigation shared across every view; filtered by role. */
export default function AppNav({ current }: { current: NavKey }) {
  const { isManager } = useRole();
  const links = LINKS.filter((l) => isManager || !l.managerOnly);

  return (
    <nav aria-label="Primary" className="flex items-center gap-1 text-sm no-print">
      {links.map((l) =>
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
