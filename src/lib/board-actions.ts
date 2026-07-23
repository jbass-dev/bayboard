import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import type {
  Customer,
  InventoryItem,
  PartUsed,
  ServiceType,
  Ticket,
  TicketStatus,
  Vehicle,
} from "../types";
import { db } from "./firebase";
import { canTransition, nextServiceDate } from "./ticket-logic";

/** Create a new ticket in the waiting queue. */
export async function createTicket(
  vehicle: Vehicle,
  service: ServiceType,
  notes = "",
  customer?: Customer,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const status: TicketStatus = { kind: "waiting", since: nowIso };
  await addDoc(collection(db, "tickets"), {
    vehicle,
    service,
    status,
    partsUsed: [],
    notes,
    // Only persist a customer when an email was given — Firestore rejects
    // undefined, and a reminder needs somewhere to send.
    ...(customer?.email ? { customer } : {}),
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

/**
 * Finish an in-bay ticket: record the parts used, stamp the completion
 * time, compute when the vehicle is next due, and decrement the inventory
 * items the service consumed.
 *
 * The completion write and the stock decrements happen in a single
 * Firestore transaction, so a ticket can never be marked complete without
 * its parts coming off the shelf, and two bays closing at once can't both
 * read the same quantity and double-count it. Quantities never go below
 * zero. This is the low-stock alert's source of truth: as tickets close,
 * the inventory listener on the board sees the new numbers live.
 */
export async function completeTicket(
  ticket: Ticket,
  partsUsed: PartUsed[] = [],
): Promise<void> {
  if (!canTransition(ticket.status.kind, "complete")) {
    throw new Error(`Cannot complete a ${ticket.status.kind} ticket.`);
  }
  // The guard above only passes for in-bay tickets; this narrows the type.
  if (ticket.status.kind !== "in-bay") return;

  const completedAt = new Date();
  const status: TicketStatus = {
    kind: "complete",
    bayId: ticket.status.bayId,
    technicianId: ticket.status.technicianId,
    startedAt: ticket.status.startedAt,
    completedAt: completedAt.toISOString(),
  };
  const ticketRef = doc(db, "tickets", ticket.id);
  const ticketUpdate = {
    status,
    partsUsed,
    nextServiceDate: nextServiceDate(ticket.service, completedAt).toISOString(),
  };

  // Collapse duplicate lines and drop zero/negative quantities so we only
  // touch inventory docs that actually changed.
  const usage = new Map<string, number>();
  for (const part of partsUsed) {
    if (part.quantity > 0) {
      usage.set(
        part.inventoryItemId,
        (usage.get(part.inventoryItemId) ?? 0) + part.quantity,
      );
    }
  }

  // Nothing consumed — a quick job that used no stock. No need to pay for a
  // transaction; a plain update keeps the common case cheap.
  if (usage.size === 0) {
    await updateDoc(ticketRef, ticketUpdate);
    return;
  }

  const usedIds = [...usage.keys()];
  await runTransaction(db, async (tx) => {
    // Firestore requires all reads before any writes in a transaction.
    const refs = usedIds.map((id) => doc(db, "inventoryItems", id));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

    tx.update(ticketRef, ticketUpdate);

    snaps.forEach((snap, i) => {
      // Item deleted mid-service: record it on the ticket but skip the write.
      if (!snap.exists()) return;
      const current = (snap.data().quantity as number | undefined) ?? 0;
      const nextQuantity = Math.max(0, current - usage.get(usedIds[i])!);
      tx.update(refs[i], { quantity: nextQuantity });
    });
  });
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

// --- Inventory -------------------------------------------------------------

/** Details for a new inventory item; id is assigned by Firestore. */
export type NewInventoryItem = Omit<InventoryItem, "id">;

/** Add an oil grade or filter to the parts shelf. */
export async function createInventoryItem(
  item: NewInventoryItem,
): Promise<void> {
  await addDoc(collection(db, "inventoryItems"), {
    name: item.name.trim(),
    kind: item.kind,
    quantity: Math.max(0, Math.floor(item.quantity)),
    lowStockThreshold: Math.max(0, Math.floor(item.lowStockThreshold)),
  });
}

/**
 * Edit an inventory item — restock, correct a count, or change its
 * threshold. Numeric fields are clamped to whole, non-negative values so
 * a stray keystroke can't push stock negative or fractional.
 */
export async function updateInventoryItem(
  id: string,
  patch: Partial<Pick<InventoryItem, "name" | "quantity" | "lowStockThreshold">>,
): Promise<void> {
  const clean: Record<string, string | number> = {};
  if (patch.name !== undefined) clean.name = patch.name.trim();
  if (patch.quantity !== undefined)
    clean.quantity = Math.max(0, Math.floor(patch.quantity));
  if (patch.lowStockThreshold !== undefined)
    clean.lowStockThreshold = Math.max(0, Math.floor(patch.lowStockThreshold));
  await updateDoc(doc(db, "inventoryItems", id), clean);
}

/** Remove an item from the shelf entirely. */
export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "inventoryItems", id));
}

/** Starter parts shelf so the board and complete-dialog have stock to move. */
export async function seedInventory(): Promise<void> {
  const items = collection(db, "inventoryItems");
  const defaults: NewInventoryItem[] = [
    { name: "0W-20", kind: "oil", quantity: 40, lowStockThreshold: 12 },
    { name: "5W-20", kind: "oil", quantity: 30, lowStockThreshold: 12 },
    { name: "5W-30", kind: "oil", quantity: 30, lowStockThreshold: 12 },
    { name: "PH7317 (oil filter)", kind: "filter", quantity: 16, lowStockThreshold: 6 },
    { name: "PH3593A (oil filter)", kind: "filter", quantity: 10, lowStockThreshold: 6 },
    { name: "CA10467 (engine air)", kind: "filter", quantity: 8, lowStockThreshold: 4 },
    { name: "CF10285 (cabin air)", kind: "filter", quantity: 8, lowStockThreshold: 4 },
  ];
  await Promise.all(defaults.map((item) => addDoc(items, item)));
}
