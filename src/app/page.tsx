"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AssignDialog from "../components/AssignDialog";
import BoardColumn from "../components/BoardColumn";
import NewTicketForm from "../components/NewTicketForm";
import TicketCard from "../components/TicketCard";
import {
  assignTicketToBay,
  returnTicketToWaiting,
  seedDefaults,
} from "../lib/board-actions";
import { bayTickets, sortBays, waitingTickets } from "../lib/board-logic";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/useAuth";
import { useCollection } from "../lib/useCollection";
import type { Bay, Technician, Ticket } from "../types";

interface AssignTarget {
  ticket: Ticket;
  bayId?: string;
}

export default function BoardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const tickets = useCollection<Ticket>("tickets");
  const bays = useCollection<Bay>("bays");
  const technicians = useCollection<Technician>("technicians");

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

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

  /** Card dropped on a bay column. */
  function handleDropOnBay(bayId: string, ticketId: string) {
    const ticket = tickets.data.find((t) => t.id === ticketId);
    if (!ticket || ticket.status.kind !== "waiting") return;
    if (technicians.data.length === 1) {
      void run(() => assignTicketToBay(ticket, bayId, technicians.data[0].id));
    } else {
      setAssignTarget({ ticket, bayId });
    }
  }

  /** Card dropped back on the waiting column. */
  function handleDropOnWaiting(ticketId: string) {
    const ticket = tickets.data.find((t) => t.id === ticketId);
    if (!ticket || ticket.status.kind !== "in-bay") return;
    void run(() => returnTicketToWaiting(ticket));
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">
          Bay<span className="text-amber-500">Board</span>
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNewTicket(true)}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            + New ticket
          </button>
          <span className="hidden text-sm text-zinc-500 sm:inline">
            {user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {(actionError || loadError) && (
        <p className="border-b border-red-900 bg-red-950 px-4 py-2 text-sm text-red-400">
          {actionError ?? loadError}
        </p>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500">
          Loading the board…
        </div>
      ) : orderedBays.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-zinc-400">No bays set up yet.</p>
          <button
            type="button"
            disabled={seeding}
            onClick={() => {
              setSeeding(true);
              void run(seedDefaults).finally(() => setSeeding(false));
            }}
            className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {seeding ? "Setting up…" : "Create 3 bays + 2 technicians"}
          </button>
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
                    onReturnToWaiting={(t) => void run(() => returnTicketToWaiting(t))}
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
          }}
        />
      )}

      {showNewTicket && <NewTicketForm onClose={() => setShowNewTicket(false)} />}
    </main>
  );
}
