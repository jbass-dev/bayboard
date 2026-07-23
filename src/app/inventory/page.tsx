"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AddInventoryForm from "../../components/AddInventoryForm";
import AppNav from "../../components/AppNav";
import HeaderUser from "../../components/HeaderUser";
import InventoryRow from "../../components/InventoryRow";
import {
  createInventoryItem,
  deleteInventoryItem,
  seedInventory,
  updateInventoryItem,
} from "../../lib/board-actions";
import { lowStockItems } from "../../lib/ticket-logic";
import { useRole } from "../../lib/RoleProvider";
import { useCollection } from "../../lib/useCollection";
import type { InventoryItem } from "../../types";

export default function InventoryPage() {
  const router = useRouter();
  const { user, loading: authLoading, isManager } = useRole();
  const inventory = useCollection<InventoryItem>("inventoryItems");

  const [showAdd, setShowAdd] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
    else if (!isManager) router.replace("/"); // technicians: board only
  }, [authLoading, user, isManager, router]);

  if (authLoading || !user || !isManager) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </main>
    );
  }

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  const items = [...inventory.data].sort((a, b) => {
    // Oils first, then filters; alphabetical within each group.
    if (a.kind !== b.kind) return a.kind === "oil" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const lowCount = lowStockItems(inventory.data).length;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Bay<span className="text-amber-500">Board</span>
          </h1>
          <AppNav current="inventory" />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            + Add item
          </button>
          <HeaderUser />
        </div>
      </header>

      {(actionError || inventory.error) && (
        <p className="border-b border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300">
          {actionError ?? inventory.error}
        </p>
      )}

      {lowCount > 0 && (
        <p
          role="status"
          className="border-b border-amber-900/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-300"
        >
          {lowCount} item{lowCount === 1 ? "" : "s"} at or below the low-stock
          threshold.
        </p>
      )}

      <div className="mx-auto w-full max-w-3xl flex-1 p-4">
        {inventory.loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-zinc-500">
            Loading inventory…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-zinc-400">No inventory items yet.</p>
            <button
              type="button"
              disabled={seeding}
              onClick={() => {
                setSeeding(true);
                void run(seedInventory).finally(() => setSeeding(false));
              }}
              className="rounded-md bg-amber-500 px-4 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            >
              {seeding ? "Seeding…" : "Seed starter parts"}
            </button>
            <p className="text-xs text-zinc-600">
              …or add items one at a time with “+ Add item”.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-125 text-sm">
              <thead className="bg-zinc-900 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Item
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    On hand
                  </th>
                  <th scope="col" className="px-3 py-2 text-center font-medium">
                    Low at
                  </th>
                  <th scope="col" className="px-3 py-2 text-center font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950">
                {items.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    onUpdate={(id, patch) =>
                      void run(() => updateInventoryItem(id, patch))
                    }
                    onDelete={(target) =>
                      void run(() => deleteInventoryItem(target.id))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddInventoryForm
          onAdd={(item) => createInventoryItem(item)}
          onClose={() => setShowAdd(false)}
        />
      )}
    </main>
  );
}
