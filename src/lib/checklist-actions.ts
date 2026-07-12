import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import type { Checklist } from "../types";
import { db } from "./firebase";
import {
  buildChecklist,
  checklistId,
  toggleItem,
  todayKey,
} from "./checklist-logic";

/**
 * Make sure today's opening and closing checklists exist, without clobbering
 * any progress already made. Because the document id encodes the date, a new
 * day naturally starts with fresh, unchecked lists — that's the "reset each
 * day" behaviour, with yesterday's sheets preserved for the record.
 */
export async function ensureTodayChecklists(
  date: string = todayKey(new Date()),
): Promise<void> {
  const types: Checklist["type"][] = ["opening", "closing"];
  await Promise.all(
    types.map(async (type) => {
      const ref = doc(db, "checklists", checklistId(type, date));
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const { type: t, date: d, items } = buildChecklist(type, date);
        await setDoc(ref, { type: t, date: d, items });
      }
    }),
  );
}

/** Tick or untick one line, stamping the time it was done. */
export async function toggleChecklistItem(
  checklist: Checklist,
  itemId: string,
): Promise<void> {
  const items = toggleItem(checklist.items, itemId, new Date().toISOString());
  await updateDoc(doc(db, "checklists", checklist.id), { items });
}
