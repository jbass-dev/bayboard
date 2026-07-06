import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase/firestore";

/**
 * Generic Firestore converter so documents come out of the
 * database fully typed. The document id is merged into the object.
 *
 * Usage: collection(db, "tickets").withConverter(typedConverter<Ticket>())
 */
export function typedConverter<
  T extends DocumentData & { id: string },
>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      // id lives on the document reference, not in the document body
      const { id: _id, ...rest } = data;
      return rest as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return { ...snapshot.data(), id: snapshot.id } as T;
    },
  };
}
