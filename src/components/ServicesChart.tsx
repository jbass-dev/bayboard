"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ServiceCount } from "../lib/summary-logic";

/**
 * Services-by-type bar chart for the day summary. Kept small and driven by the
 * same pure summary data as the cards, so the numbers can never disagree. The
 * chart is decorative (aria-hidden) — the figures are read from the cards.
 */
export default function ServicesChart({ data }: { data: ServiceCount[] }) {
  const rows = data.map((d) => ({ name: d.label, count: d.count }));
  return (
    <div className="h-64 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, bottom: 8, left: -16 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "#3f3f46", opacity: 0.3 }}
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              color: "#f4f4f5",
            }}
          />
          <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
