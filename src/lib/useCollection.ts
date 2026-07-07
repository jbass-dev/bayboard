"use client";

import {
  collection,
  onSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { typedConverter } from "./converter";
import { db } from "./firebase";

/**
 * Real-time subscription to a Firestore collection.
 * Every connected client sees writes as they land — this is
 * what keeps two open windows of the board in sync.
 */
export function useCollection<T extends DocumentData & { id: string }>(
  name: string,
): { data: T[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = collection(db, name).withConverter(typedConverter<T>());
    return onSnapshot(
      ref,
      (snap) => {
        setData(snap.docs.map((d) => d.data()));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [name]);

  return { data, loading, error };
}
