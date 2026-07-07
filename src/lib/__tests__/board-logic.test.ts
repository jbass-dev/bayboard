import type { Bay, Ticket } from "../../types";
import {
  bayTickets,
  describeVehicle,
  formatElapsed,
  sortBays,
  statusTimestamp,
  waitingTickets,
} from "../board-logic";

function makeTicket(id: string, status: Ticket["status"]): Ticket {
  return {
    id,
    vehicle: { year: 2019, make: "Honda", model: "Civic" },
    service: "oil-change",
    status,
    partsUsed: [],
    notes: "",
    createdAt: "2026-07-07T08:00:00.000Z",
  };
}

const waitingOld = makeTicket("old", {
  kind: "waiting",
  since: "2026-07-07T08:00:00.000Z",
});
const waitingNew = makeTicket("new", {
  kind: "waiting",
  since: "2026-07-07T09:30:00.000Z",
});
const inBay1 = makeTicket("b1", {
  kind: "in-bay",
  bayId: "bay-1",
  technicianId: "tech-1",
  startedAt: "2026-07-07T09:00:00.000Z",
});
const inBay2 = makeTicket("b2", {
  kind: "in-bay",
  bayId: "bay-2",
  technicianId: "tech-2",
  startedAt: "2026-07-07T09:10:00.000Z",
});
const done = makeTicket("done", {
  kind: "complete",
  bayId: "bay-1",
  technicianId: "tech-1",
  startedAt: "2026-07-07T07:00:00.000Z",
  completedAt: "2026-07-07T07:45:00.000Z",
});

describe("waitingTickets", () => {
  it("keeps only waiting tickets", () => {
    const result = waitingTickets([inBay1, waitingOld, done]);
    expect(result.map((t) => t.id)).toEqual(["old"]);
  });

  it("sorts oldest first so the next car up is on top", () => {
    const result = waitingTickets([waitingNew, waitingOld]);
    expect(result.map((t) => t.id)).toEqual(["old", "new"]);
  });
});

describe("bayTickets", () => {
  it("returns only tickets in the given bay", () => {
    const result = bayTickets([waitingOld, inBay1, inBay2, done], "bay-1");
    expect(result.map((t) => t.id)).toEqual(["b1"]);
  });

  it("does not treat a completed ticket as still in its bay", () => {
    expect(bayTickets([done], "bay-1")).toEqual([]);
  });
});

describe("sortBays", () => {
  it("orders by sortOrder without mutating the input", () => {
    const bays: Bay[] = [
      { id: "c", name: "Bay 3", sortOrder: 3 },
      { id: "a", name: "Bay 1", sortOrder: 1 },
      { id: "b", name: "Bay 2", sortOrder: 2 },
    ];
    expect(sortBays(bays).map((b) => b.id)).toEqual(["a", "b", "c"]);
    expect(bays[0].id).toBe("c");
  });
});

describe("statusTimestamp", () => {
  it("uses `since` for waiting tickets", () => {
    expect(statusTimestamp(waitingOld)).toBe("2026-07-07T08:00:00.000Z");
  });

  it("uses `startedAt` for in-bay tickets", () => {
    expect(statusTimestamp(inBay1)).toBe("2026-07-07T09:00:00.000Z");
  });
});

describe("formatElapsed", () => {
  const now = new Date("2026-07-07T10:00:00.000Z");

  it("formats minutes under an hour", () => {
    expect(formatElapsed("2026-07-07T09:56:00.000Z", now)).toBe("4m");
  });

  it("formats hours and zero-padded minutes", () => {
    expect(formatElapsed("2026-07-07T08:55:00.000Z", now)).toBe("1h 05m");
  });

  it("never goes negative on clock skew", () => {
    expect(formatElapsed("2026-07-07T10:02:00.000Z", now)).toBe("0m");
  });
});

describe("describeVehicle", () => {
  it("formats year make model", () => {
    expect(describeVehicle({ year: 2019, make: "Honda", model: "Civic" })).toBe(
      "2019 Honda Civic",
    );
  });
});
