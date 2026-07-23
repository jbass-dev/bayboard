import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";
import { nextServiceDate } from "./ticket-logic";
import type { Customer, PartUsed, ServiceType, Vehicle } from "../types";

/** ISO timestamp for today at the given local hour and minute. */
function todayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/**
 * One-click realistic shop so a hiring manager can use BayBoard in ten
 * seconds without creating anything: three bays, two techs, a stocked
 * shelf (with one item deliberately low so the alert shows), cars waiting
 * and in progress, and a few completed services to populate the day summary.
 */
export async function seedDemoData(): Promise<void> {
  // Bays and technicians, keeping references so tickets can point at them.
  const bayRefs = await Promise.all([
    addDoc(collection(db, "bays"), { name: "Bay 1", sortOrder: 1 }),
    addDoc(collection(db, "bays"), { name: "Bay 2", sortOrder: 2 }),
    addDoc(collection(db, "bays"), { name: "Bay 3", sortOrder: 3 }),
  ]);
  const techRefs = await Promise.all([
    addDoc(collection(db, "technicians"), { name: "John" }),
    addDoc(collection(db, "technicians"), { name: "Alex" }),
  ]);
  const [bay1, bay2] = bayRefs.map((r) => r.id);
  const [john, alex] = techRefs.map((r) => r.id);

  // Parts shelf — the oil filter is under threshold on purpose.
  const inv = collection(db, "inventoryItems");
  const [oil0w20, oil5w30, filterPh] = await Promise.all([
    addDoc(inv, { name: "0W-20", kind: "oil", quantity: 38, lowStockThreshold: 12 }),
    addDoc(inv, { name: "5W-30", kind: "oil", quantity: 26, lowStockThreshold: 12 }),
    addDoc(inv, { name: "PH7317 (oil filter)", kind: "filter", quantity: 5, lowStockThreshold: 6 }),
    addDoc(inv, { name: "CA10467 (engine air)", kind: "filter", quantity: 9, lowStockThreshold: 4 }),
  ]);

  const tickets = collection(db, "tickets");

  // Two cars waiting.
  await Promise.all([
    addDoc(tickets, {
      vehicle: { year: 2021, make: "Toyota", model: "Corolla" },
      service: "oil-change" as ServiceType,
      status: { kind: "waiting", since: todayAt(9, 40) },
      partsUsed: [],
      notes: "Customer waiting inside",
      createdAt: todayAt(9, 40),
    }),
    addDoc(tickets, {
      vehicle: { year: 2018, make: "Ford", model: "F-150" },
      service: "tire-rotation" as ServiceType,
      status: { kind: "waiting", since: todayAt(9, 52) },
      partsUsed: [],
      notes: "",
      createdAt: todayAt(9, 52),
    }),
  ]);

  // Two cars in progress — one already running long.
  await Promise.all([
    addDoc(tickets, {
      vehicle: { year: 2020, make: "Honda", model: "Civic" },
      service: "oil-change" as ServiceType,
      status: { kind: "in-bay", bayId: bay1, technicianId: john, startedAt: todayAt(9, 55) },
      partsUsed: [],
      notes: "",
      createdAt: todayAt(9, 50),
    }),
    addDoc(tickets, {
      vehicle: { year: 2016, make: "Subaru", model: "Outback" },
      service: "coolant-flush" as ServiceType,
      status: { kind: "in-bay", bayId: bay2, technicianId: alex, startedAt: todayAt(9, 15) },
      partsUsed: [],
      notes: "Also checking wipers",
      createdAt: todayAt(9, 10),
    }),
  ]);

  // Completed earlier today, so the summary and per-bay stats have data.
  // A couple carry a customer so the summary's service-reminder panel has
  // something to show. Their next-service dates are months out, so the board's
  // auto-scan leaves them alone until they're actually due.
  const completed: {
    vehicle: Vehicle;
    service: ServiceType;
    bayId: string;
    technicianId: string;
    startedAt: string;
    completedAt: string;
    partsUsed: PartUsed[];
    customer?: Customer;
  }[] = [
    {
      vehicle: { year: 2019, make: "Nissan", model: "Altima" },
      service: "oil-change" as ServiceType,
      bayId: bay1,
      technicianId: john,
      startedAt: todayAt(8, 5),
      completedAt: todayAt(8, 24),
      partsUsed: [
        { inventoryItemId: oil5w30.id, quantity: 5 },
        { inventoryItemId: filterPh.id, quantity: 1 },
      ],
      customer: { name: "Dana Reyes", email: "dana.reyes@example.com" },
    },
    {
      vehicle: { year: 2022, make: "Mazda", model: "CX-5" },
      service: "oil-change" as ServiceType,
      bayId: bay2,
      technicianId: alex,
      startedAt: todayAt(8, 30),
      completedAt: todayAt(8, 52),
      partsUsed: [{ inventoryItemId: oil0w20.id, quantity: 5 }],
      customer: { name: "Sam Okafor", email: "sam.okafor@example.com" },
    },
    {
      vehicle: { year: 2017, make: "Chevrolet", model: "Malibu" },
      service: "tire-rotation" as ServiceType,
      bayId: bay1,
      technicianId: john,
      startedAt: todayAt(9, 0),
      completedAt: todayAt(9, 28),
      partsUsed: [],
    },
  ];

  await Promise.all(
    completed.map((c) =>
      addDoc(tickets, {
        vehicle: c.vehicle,
        service: c.service,
        status: {
          kind: "complete",
          bayId: c.bayId,
          technicianId: c.technicianId,
          startedAt: c.startedAt,
          completedAt: c.completedAt,
        },
        partsUsed: c.partsUsed,
        notes: "",
        ...(c.customer ? { customer: c.customer } : {}),
        nextServiceDate: nextServiceDate(
          c.service,
          new Date(c.completedAt),
        ).toISOString(),
        createdAt: c.startedAt,
      }),
    ),
  );
}
