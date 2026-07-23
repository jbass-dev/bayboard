"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AssignDialog from "../components/AssignDialog";
import BoardColumn from "../components/BoardColumn";
import CompleteDialog from "../components/CompleteDialog";
import HeaderUser from "../components/HeaderUser";
import LowStockBanner from "../components/LowStockBanner";
import NewTicketForm from "../components/NewTicketForm";
import ReminderScanner from "../components/ReminderScanner";
import TicketCard from "../components/TicketCard";
import {
  assignTicketToBay,
  completeTicket,
  returnTicketToWaiting,
  seedDefaults,
} from "../lib/board-actions";
import { seedDemoData } from "../lib/demo-data";
import {
  bayTickets,
  describeVehicle,
  sortBays,
  waitingTickets,
} from "../lib/board-logic";
import { useRole } from "../lib/RoleProvider";
import { useCollection } from "../lib/useCollection";
import AppNav from "../components/AppNav";
import type { Bay, InventoryItem, Technician, Ticket } from "../types";

interface AssignTarget {
  ticket: Ticket;
  bayId?: string;
}

export default function BoardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isManager } = useRole();

  const tickets = useCollection<Ticket>("tickets");
  const bays = useCollection<Bay>("bays");
  const technicians = useCollection<Technician>("technicians");
  const inventory = useCollection<InventoryItem>("inventoryItems");

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Ticket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  // Announced to screen readers when a ticket moves — the board's live region.
  const [announcement, setAnnouncement] = useState("");

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

  const loading = tickets.loading || bays.loading || technicians.loading;
  const loadError = tickets.error ?? bays.error ?? technicians.error;
  const orderedBays = sortBays(bays.data);
  const waiting = waitingTickets(tickets.data);

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  function bayName(bayId: string): string {
    return bays.data.find((b) => b.id === bayId)?.name ?? "a bay";
  }

  /** Card dropped on a bay column. */
  function handleDropOnBay(bayId: string, ticketId: string) {
    const ticket = tickets.data.find((t) => t.id === ticketId);
    if (!ticket || ticket.status.kind !== "waiting") return;
    if (technicians.data.length === 1) {
      void run(() => assignTicketToBay(ticket, bayId, technicians.data[0].id));
      setAnnouncement(
        `${describeVehicle(ticket.vehicle)} moved to ${bayName(bayId)}.`,
      );
    } else {
      setAssignTarget({ ticket, bayId });
    }
  }

  /** Card dropped back on the waiting column. */
  function handleDropOnWaiting(ticketId: string) {
    const ticket = tickets.data.find((t) => t.id === ticketId);
    if (!ticket || ticket.status.kind !== "in-bay") return;
    void run(() => returnTicketToWaiting(ticket));
    setAnnouncement(
      `${describeVehicle(ticket.vehicle)} moved back to the waiting queue.`,
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Bay<span className="text-amber-500">Board</span>
          </h1>
          <AppNav current="board" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNewTicket(true)}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            + New ticket
          </button>
          <HeaderUser />
        </div>
      </header>

      <ReminderScanner tickets={tickets.data} enabled={isManager} />

      {(actionError || loadError) && (
        <p className="border-b border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {actionError ?? loadError}
        </p>
      )}

      <LowStockBanner inventory={inventory.data} />

      {/* Screen-reader-only running commentary of board changes. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          Loading the board…
        </div>
      ) : orderedBays.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          {isManager ? (
            <>
              <p className="max-w-sm text-zinc-400">
                Empty shop. Load demo data to explore a busy Saturday, or start
                from scratch.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={seeding}
                  onClick={() => {
                    setSeeding(true);
                    void run(seedDemoData).finally(() => setSeeding(false));
                  }}
                  className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {seeding ? "Loading…" : "Load demo data"}
                </button>
                <button
                  type="button"
                  disabled={seeding}
                  onClick={() => {
                    setSeeding(true);
                    void run(seedDefaults).finally(() => setSeeding(false));
                  }}
                  className="rounded-md border border-zinc-600 px-4 py-2 font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Just 3 bays + 2 techs
                </button>
              </div>
            </>
          ) : (
            <p className="max-w-sm text-zinc-400">
              The shop isn&apos;t set up yet. Ask a manager to add bays and
              technicians.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-start gap-4 overflow-x-auto p-4">
          <BoardColumn
            title="Waiting"
            count={waiting.length}
            onDropTicket={handleDropOnWaiting}
          >
            {waiting.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                technicians={technicians.data}
                onRequestAssign={(t) => setAssignTarget({ ticket: t })}
              />
            ))}
          </BoardColumn>

          {orderedBays.map((bay) => {
            const inBay = bayTickets(tickets.data, bay.id);
            return (
              <BoardColumn
                key={bay.id}
                title={bay.name}
                count={inBay.length}
                onDropTicket={(ticketId) => handleDropOnBay(bay.id, ticketId)}
              >
                {inBay.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    technicians={technicians.data}
                    onRequestComplete={(t) => setCompleteTarget(t)}
                    onReturnToWaiting={(t) => {
                      void run(() => returnTicketToWaiting(t));
                      setAnnouncement(
                        `${describeVehicle(t.vehicle)} moved back to the waiting queue.`,
                      );
                    }}
                  />
                ))}
              </BoardColumn>
            );
          })}
        </div>
      )}

      {assignTarget && (
        <AssignDialog
          ticket={assignTarget.ticket}
          bays={orderedBays}
          technicians={technicians.data}
          initialBayId={assignTarget.bayId}
          onClose={() => setAssignTarget(null)}
          onAssign={(bayId, technicianId) => {
            const { ticket } = assignTarget;
            setAssignTarget(null);
            void run(() => assignTicketToBay(ticket, bayId, technicianId));
            setAnnouncement(
              `${describeVehicle(ticket.vehicle)} moved to ${bayName(bayId)}.`,
            );
          }}
        />
      )}

      {completeTarget && (
        <CompleteDialog
          ticket={completeTarget}
          inventory={inventory.data}
          onClose={() => setCompleteTarget(null)}
          onComplete={(partsUsed) => {
            const ticket = completeTarget;
            setCompleteTarget(null);
            void run(() => completeTicket(ticket, partsUsed));
            setAnnouncement(
              `${describeVehicle(ticket.vehicle)} completed and cleared from the bay.`,
            );
          }}
        />
      )}

      {showNewTicket && <NewTicketForm onClose={() => setShowNewTicket(false)} />}
    </main>
  );
}
