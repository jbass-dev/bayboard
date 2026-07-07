"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../lib/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/");
    } catch {
      setError(
        isSignup
          ? "Could not create the account. Password must be at least 6 characters."
          : "Wrong email or password.",
      );
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-100";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
      >
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Bay<span className="text-amber-500">Board</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {isSignup ? "Create a shop account" : "Sign in to the board"}
        </p>

        <label className="mt-4 block text-sm">
          <span className="text-zinc-400">Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-zinc-400">Password</span>
          <input
            required
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-md bg-amber-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "One sec…" : isSignup ? "Create account" : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSignup((v) => !v);
            setError(null);
          }}
          className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
        >
          {isSignup
            ? "Already have an account? Sign in"
            : "First time? Create an account"}
        </button>
      </form>
    </main>
  );
}
