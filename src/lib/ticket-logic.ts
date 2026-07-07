import type {
  InventoryItem,
  PartUsed,
  ServiceType,
  TicketStatusKind,
} from "../types";

/** Days until the next service, by service type. */
export const SERVICE_INTERVAL_DAYS: Record<ServiceType, number> = {
  "oil-change": 90,
  "tire-rotation": 180,
  "engine-air-filter": 365,
  "cabin-air-filter": 365,
  "coolant-flush": 730,
};

const ALLOWED_TRANSITIONS: Record<TicketStatusKind, TicketStatusKind[]> = {
  waiting: ["in-bay"],
  "in-bay": ["waiting", "complete"], // back to waiting if a bay is needed urgently
  complete: [],
};

export function canTransition(
  from: TicketStatusKind,
  to: TicketStatusKind,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Next-service date from service type and completion date. */
export function nextServiceDate(service: ServiceType, completedAt: Date): Date {
  const next = new Date(completedAt);
  next.setDate(next.getDate() + SERVICE_INTERVAL_DAYS[service]);
  return next;
}

/** How long a service should take, in minutes, before it's "running long". */
export const SERVICE_TARGET_MINUTES: Record<ServiceType, number> = {
  "oil-change": 20,
  "tire-rotation": 30,
  "engine-air-filter": 15,
  "cabin-air-filter": 15,
  "coolant-flush": 45,
};

/** Tracks how a running service compares to its target time. */
export type ElapsedSeverity = "normal" | "warn" | "over";

/**
 * How a running service is tracking against its target time:
 * "warn" once it reaches the target, "over" at 1.5x. Drives the
 * colour of the elapsed-time badge so a long job stands out on the board.
 */
export function elapsedSeverity(
  service: ServiceType,
  minutesElapsed: number,
): ElapsedSeverity {
  const target = SERVICE_TARGET_MINUTES[service];
  if (minutesElapsed >= target * 1.5) return "over";
  if (minutesElapsed >= target) return "warn";
  return "normal";
}

/**
 * Returns inventory with the used parts decremented.
 * Quantities never go below zero. Pure function — Firestore
 * writes happen elsewhere.
 */
export function applyPartsUsage(
  items: InventoryItem[],
  partsUsed: PartUsed[],
): InventoryItem[] {
  const usage = new Map<string, number>();
  for (const part of partsUsed) {
    usage.set(
      part.inventoryItemId,
      (usage.get(part.inventoryItemId) ?? 0) + part.quantity,
    );
  }
  return items.map((item) => {
    const used = usage.get(item.id);
    if (!used) return item;
    return { ...item, quantity: Math.max(0, item.quantity - used) };
  });
}

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.lowStockThreshold;
}
