"use client";

import Link from "next/link";
import { lowStockItems } from "../lib/ticket-logic";
import type { InventoryItem } from "../types";

interface LowStockBannerProps {
  inventory: InventoryItem[];
}

/**
 * The board-side low-stock alert. It reads the live inventory list, so the
 * moment a completing ticket pushes an item to its threshold the banner
 * appears on every open board — the person ordering parts finds out before
 * the shelf is empty, not after. Uses role="status" with aria-live so the
 * alert is announced, and names the items rather than relying on colour.
 */
export default function LowStockBanner({ inventory }: LowStockBannerProps) {
  const low = lowStockItems(inventory);
  if (low.length === 0) return null;

  const names = low.map((item) => `${item.name} (${item.quantity})`).join(", ");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-900/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-300"
    >
      <span aria-hidden="true">⚠</span>
      <span className="font-semibold">
        Low stock ({low.length}):
      </span>
      <span className="text-amber-200/90">{names}</span>
      <Link
        href="/inventory"
        className="ml-auto shrink-0 rounded-md border border-amber-700/60 px-2 py-0.5 text-xs font-medium text-amber-200 hover:bg-amber-900/40"
      >
        Manage inventory →
      </Link>
    </div>
  );
}
