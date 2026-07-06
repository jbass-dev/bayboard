/**
 * BayBoard core data model.
 *
 * Firestore collections: tickets, bays, technicians, inventoryItems, checklists.
 * Dates are stored as ISO 8601 strings for simplicity in the MVP.
 */

export type ServiceType =
  | "oil-change"
  | "tire-rotation"
  | "engine-air-filter"
  | "cabin-air-filter"
  | "coolant-flush";

export interface Vehicle {
  year: number;
  make: string;
  model: string;
}

/**
 * Ticket status as a discriminated union: invalid states
 * (e.g. a completed ticket with no bay) cannot be represented.
 */
export type TicketStatus =
  | { kind: "waiting"; since: string }
  | { kind: "in-bay"; bayId: string; technicianId: string; startedAt: string }
  | {
      kind: "complete";
      bayId: string;
      technicianId: string;
      startedAt: string;
      completedAt: string;
    };

export type TicketStatusKind = TicketStatus["kind"];

export interface PartUsed {
  inventoryItemId: string;
  quantity: number;
}

export interface Ticket {
  id: string;
  vehicle: Vehicle;
  service: ServiceType;
  status: TicketStatus;
  partsUsed: PartUsed[];
  notes: string;
  /** Set when the ticket completes, from service type + completion date. */
  nextServiceDate?: string;
  createdAt: string;
}

export interface Bay {
  id: string;
  name: string; // "Bay 1"
  sortOrder: number;
}

export interface Technician {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string; // "5W-30" or "PH7317"
  kind: "oil" | "filter";
  quantity: number;
  lowStockThreshold: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  /** ISO timestamp when tapped, null if not done. */
  completedAt: string | null;
}

export interface Checklist {
  id: string;
  type: "opening" | "closing";
  /** YYYY-MM-DD; checklists reset each day. */
  date: string;
  items: ChecklistItem[];
}
