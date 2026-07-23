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

/** Optional customer contact, used for next-service reminder emails. */
export interface Customer {
  name: string;
  email: string;
}

export interface Ticket {
  id: string;
  vehicle: Vehicle;
  service: ServiceType;
  status: TicketStatus;
  partsUsed: PartUsed[];
  notes: string;
  /** Optional contact for next-service reminder emails. */
  customer?: Customer;
  /** Set when the ticket completes, from service type + completion date. */
  nextServiceDate?: string;
  /** ISO timestamp the next-service reminder was sent; guards against resends. */
  reminderSentAt?: string;
  createdAt: string;
}

export interface Bay {
  id: string;
  name: string; // "Bay 1"
  sortOrder: number;
}

/** Certifications a shift can require and a technician can hold. */
export type TechCertification = "keyholder" | "state-inspection" | "brakes";

/**
 * A recurring window a technician can work.
 * `weekday` matches Date#getDay(): 0 = Sunday … 6 = Saturday.
 * Times are 24h "HH:MM" local.
 */
export interface AvailabilityWindow {
  weekday: number;
  start: string;
  end: string;
}

export interface Technician {
  id: string;
  name: string;
  /** Scheduling fields — optional so pre-scheduling documents stay valid. */
  certifications?: TechCertification[];
  availability?: AvailabilityWindow[];
  /** Weekly-hours cap; the solver defaults to 40 when absent. */
  maxWeeklyHours?: number;
}

/**
 * One staffing need: "we need `headcount` technicians with `requiredCerts`
 * from `start` to `end` on `date`". The solver fills these.
 */
export interface ShiftRequirement {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // "08:00"
  end: string; // "16:00"
  role: string; // "Opener", "Floor", "Closer"
  requiredCerts: TechCertification[];
  headcount: number;
}

/** A technician placed on a shift, by hand or by the auto-scheduler. */
export interface ShiftAssignment {
  id: string;
  shiftId: string;
  technicianId: string;
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
