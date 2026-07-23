"use client";

import {
  createUserWithEmailAndPassword,
  signInAnonymously,
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
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleGuest() {
    setBusy(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      router.replace("/");
    } catch {
      setError("Could not start a guest session. Try again.");
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
          <div className="relative mt-1">
            <input
              required
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 pr-11 text-zinc-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-200"
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-md bg-amber-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {busy ? "One sec…" : isSignup ? "Create account" : "Sign in"}
        </button>

        <div className="mt-4 flex items-center gap-3 text-xs text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" />
          or
          <span className="h-px flex-1 bg-zinc-800" />
        </div>

        <button
          type="button"
          onClick={handleGuest}
          disabled={busy}
          className="mt-4 w-full rounded-md border border-zinc-600 px-3 py-2 font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          Continue as guest
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
