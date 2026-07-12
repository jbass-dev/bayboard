import type { ServiceType, Ticket } from "../types";
import { SERVICE_LABELS } from "./board-logic";
import { todayKey } from "./checklist-logic";

export interface ServiceCount {
  service: ServiceType;
  label: string;
  count: number;
}

export interface BayStat {
  bayId: string;
  count: number;
  avgMinutes: number;
}

export interface DaySummary {
  date: string;
  carsServed: number;
  avgMinutes: number;
  servicesByType: ServiceCount[];
  perBay: BayStat[];
}

type CompleteTicket = Ticket & {
  status: Extract<Ticket["status"], { kind: "complete" }>;
};

/** Minutes a service took, from bay start to completion. Never negative. */
export function serviceMinutes(ticket: CompleteTicket): number {
  const start = new Date(ticket.status.startedAt).getTime();
  const end = new Date(ticket.status.completedAt).getTime();
  return Math.max(0, Math.round((end - start) / 60_000));
}

/** Completed tickets whose completion falls on the given local day. */
function completedOn(tickets: Ticket[], date: string): CompleteTicket[] {
  return tickets.filter(
    (t): t is CompleteTicket =>
      t.status.kind === "complete" &&
      todayKey(new Date(t.status.completedAt)) === date,
  );
}

/**
 * Roll up a day's completed tickets: how many cars, the average service
 * time overall and per bay, and a breakdown by service type. Pure, so it
 * unit-tests cleanly and the same numbers drive both the cards and the chart.
 */
export function summarizeDay(
  tickets: Ticket[],
  date: string = todayKey(new Date()),
): DaySummary {
  const done = completedOn(tickets, date);

  const serviceCounts = new Map<ServiceType, number>();
  const bayAgg = new Map<string, { count: number; minutes: number }>();
  let totalMinutes = 0;

  for (const ticket of done) {
    serviceCounts.set(
      ticket.service,
      (serviceCounts.get(ticket.service) ?? 0) + 1,
    );
    const mins = serviceMinutes(ticket);
    totalMinutes += mins;
    const bay = bayAgg.get(ticket.status.bayId) ?? { count: 0, minutes: 0 };
    bay.count += 1;
    bay.minutes += mins;
    bayAgg.set(ticket.status.bayId, bay);
  }

  const servicesByType: ServiceCount[] = (
    Object.keys(SERVICE_LABELS) as ServiceType[]
  )
    .map((service) => ({
      service,
      label: SERVICE_LABELS[service],
      count: serviceCounts.get(service) ?? 0,
    }))
    .filter((s) => s.count > 0);

  const perBay: BayStat[] = [...bayAgg.entries()]
    .map(([bayId, { count, minutes }]) => ({
      bayId,
      count,
      avgMinutes: count ? Math.round(minutes / count) : 0,
    }))
    .sort((a, b) => a.bayId.localeCompare(b.bayId));

  return {
    date,
    carsServed: done.length,
    avgMinutes: done.length ? Math.round(totalMinutes / done.length) : 0,
    servicesByType,
    perBay,
  };
}
