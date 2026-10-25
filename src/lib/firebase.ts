import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// Callable Cloud Functions (e.g. setUserRole) live in the default
// us-central1 region; override here if the functions are deployed elsewhere.
export const functions = getFunctions(app);

// End-to-end tests (and anyone who wants a throwaway local backend) run
// against the Firebase Emulator Suite instead of the real project. Set
// NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true; ports match firebase.json.
// The flag on globalThis stops a hot reload from connecting twice.
const g = globalThis as typeof globalThis & { __bayboardEmulators?: boolean };
if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
  !g.__bayboardEmulators
) {
  g.__bayboardEmulators = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
