"use client";

import { useState, type ReactNode } from "react";

interface BoardColumnProps {
  title: string;
  count: number;
  onDropTicket?: (ticketId: string) => void;
  children: ReactNode;
}

/** A column on the board — the waiting queue or one bay. Acts as a drop target. */
export default function BoardColumn({
  title,
  count,
  onDropTicket,
  children,
}: BoardColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <section
      aria-label={title}
      onDragOver={
        onDropTicket
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setIsOver(true);
            }
          : undefined
      }
      onDragLeave={onDropTicket ? () => setIsOver(false) : undefined}
      onDrop={
        onDropTicket
          ? (e) => {
              e.preventDefault();
              setIsOver(false);
              const ticketId = e.dataTransfer.getData("text/plain");
              if (ticketId) onDropTicket(ticketId);
            }
          : undefined
      }
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-xl border p-3 transition-colors ${
        isOver
          ? "border-amber-500 bg-amber-950/30"
          : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          {title}
        </h2>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
          {count}
        </span>
      </header>
      <div className="flex min-h-24 flex-col gap-2">{children}</div>
    </section>
  );
}
