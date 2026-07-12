import type { InventoryItem } from "../../types";
import {
  SERVICE_TARGET_MINUTES,
  applyPartsUsage,
  canTransition,
  elapsedSeverity,
  isLowStock,
  lowStockItems,
  nextServiceDate,
} from "../ticket-logic";

describe("canTransition", () => {
  it("allows waiting -> in-bay", () => {
    expect(canTransition("waiting", "in-bay")).toBe(true);
  });

  it("allows in-bay -> complete", () => {
    expect(canTransition("in-bay", "complete")).toBe(true);
  });

  it("allows in-bay -> waiting (car pulled back out)", () => {
    expect(canTransition("in-bay", "waiting")).toBe(true);
  });

  it("blocks waiting -> complete (must go through a bay)", () => {
    expect(canTransition("waiting", "complete")).toBe(false);
  });

  it("blocks any transition out of complete", () => {
    expect(canTransition("complete", "waiting")).toBe(false);
    expect(canTransition("complete", "in-bay")).toBe(false);
  });
});

describe("nextServiceDate", () => {
  it("adds 90 days for an oil change", () => {
    const next = nextServiceDate("oil-change", new Date("2026-07-06"));
    expect(next.toISOString().slice(0, 10)).toBe("2026-10-04");
  });

  it("rolls over year boundaries", () => {
    const next = nextServiceDate("tire-rotation", new Date("2026-11-01"));
    expect(next.toISOString().slice(0, 10)).toBe("2027-04-30");
  });
});

describe("elapsedSeverity", () => {
  it("stays normal below the target time", () => {
    const target = SERVICE_TARGET_MINUTES["oil-change"];
    expect(elapsedSeverity("oil-change", 0)).toBe("normal");
    expect(elapsedSeverity("oil-change", target - 1)).toBe("normal");
  });

  it("warns once the service reaches its target", () => {
    const target = SERVICE_TARGET_MINUTES["oil-change"];
    expect(elapsedSeverity("oil-change", target)).toBe("warn");
    expect(elapsedSeverity("oil-change", target + 1)).toBe("warn");
  });

  it("goes over at 1.5x the target", () => {
    const target = SERVICE_TARGET_MINUTES["oil-change"];
    expect(elapsedSeverity("oil-change", target * 1.5)).toBe("over");
  });

  it("uses each service's own target", () => {
    // A coolant flush is allowed far longer than an oil change.
    expect(elapsedSeverity("coolant-flush", 25)).toBe("normal");
    expect(elapsedSeverity("oil-change", 25)).toBe("warn");
  });
});

describe("applyPartsUsage", () => {
  const inventory: InventoryItem[] = [
    { id: "oil-5w30", name: "5W-30", kind: "oil", quantity: 20, lowStockThreshold: 8 },
    { id: "ph7317", name: "PH7317", kind: "filter", quantity: 3, lowStockThreshold: 2 },
  ];

  it("decrements only the parts used", () => {
    const result = applyPartsUsage(inventory, [
      { inventoryItemId: "oil-5w30", quantity: 5 },
    ]);
    expect(result.find((i) => i.id === "oil-5w30")?.quantity).toBe(15);
    expect(result.find((i) => i.id === "ph7317")?.quantity).toBe(3);
  });

  it("never goes below zero", () => {
    const result = applyPartsUsage(inventory, [
      { inventoryItemId: "ph7317", quantity: 10 },
    ]);
    expect(result.find((i) => i.id === "ph7317")?.quantity).toBe(0);
  });

  it("does not mutate the input", () => {
    applyPartsUsage(inventory, [{ inventoryItemId: "oil-5w30", quantity: 1 }]);
    expect(inventory[0].quantity).toBe(20);
  });
});

describe("isLowStock", () => {
  it("fires at the threshold, not only below it", () => {
    const item: InventoryItem = {
      id: "x",
      name: "x",
      kind: "filter",
      quantity: 2,
      lowStockThreshold: 2,
    };
    expect(isLowStock(item)).toBe(true);
    expect(isLowStock({ ...item, quantity: 3 })).toBe(false);
  });
});

describe("lowStockItems", () => {
  const items: InventoryItem[] = [
    { id: "oil", name: "5W-30", kind: "oil", quantity: 20, lowStockThreshold: 8 },
    { id: "f1", name: "PH7317", kind: "filter", quantity: 6, lowStockThreshold: 6 },
    { id: "f2", name: "CA10467", kind: "filter", quantity: 1, lowStockThreshold: 4 },
  ];

  it("returns only items at or below threshold", () => {
    const low = lowStockItems(items);
    expect(low.map((i) => i.id)).toEqual(["f2", "f1"]);
  });

  it("orders the most-depleted item first", () => {
    // f2 is 3 below threshold, f1 is exactly at it, so f2 leads.
    expect(lowStockItems(items)[0].id).toBe("f2");
  });

  it("returns an empty list when everything is stocked", () => {
    const stocked = items.map((i) => ({ ...i, quantity: 100 }));
    expect(lowStockItems(stocked)).toEqual([]);
  });
});
