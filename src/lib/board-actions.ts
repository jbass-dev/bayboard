import {
  addDoc,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";
import type {
  ServiceType,
  Ticket,
  TicketStatus,
  Vehicle,
} from "../types";
import { db } from "./firebase";
import { canTransition } from "./ticket-logic";

/** Create a new ticket in the waiting queue. */
export async function createTicket(
  vehicle: Vehicle,
  service: ServiceType,
  notes = "",
): Promise<void> {
  const nowIso = new Date().toISOString();
  const status: TicketStatus = { kind: "waiting", since: nowIso };
  await addDoc(collection(db, "tickets"), {
    vehicle,
    service,
    status,
    partsUsed: [],
    notes,
    createdAt: nowIso,
  });
}

/** Move a waiting ticket into a bay with a technician. */
export async function assignTicketToBay(
  ticket: Ticket,
  bayId: string,
  technicianId: string,
): Promise<void> {
  if (!canTransition(ticket.status.kind, "in-bay")) {
    throw new Error(`Cannot move a ${ticket.status.kind} ticket into a bay.`);
  }
  const status: TicketStatus = {
    kind: "in-bay",
    bayId,
    technicianId,
    startedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, "tickets", ticket.id), { status });
}

/** Pull an in-bay ticket back to the waiting queue. */
export async function returnTicketToWaiting(ticket: Ticket): Promise<void> {
  if (!canTransition(ticket.status.kind, "waiting")) {
    throw new Error(`Cannot return a ${ticket.status.kind} ticket to waiting.`);
  }
  const status: TicketStatus = {
    kind: "waiting",
    since: new Date().toISOString(),
  };
  await updateDoc(doc(db, "tickets", ticket.id), { status });
}

/** One-time setup for a fresh shop: three bays and two technicians. */
export async function seedDefaults(): Promise<void> {
  const bays = collection(db, "bays");
  const technicians = collection(db, "technicians");
  await Promise.all([
    addDoc(bays, { name: "Bay 1", sortOrder: 1 }),
    addDoc(bays, { name: "Bay 2", sortOrder: 2 }),
    addDoc(bays, { name: "Bay 3", sortOrder: 3 }),
    addDoc(technicians, { name: "John" }),
    addDoc(technicians, { name: "Alex" }),
  ]);
}
