"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AppNav from "../../components/AppNav";
import HeaderUser from "../../components/HeaderUser";
import { useRole, type Role } from "../../lib/RoleProvider";
import { setUserRole } from "../../lib/role-actions";

/**
 * Manager-only console for assigning roles. Submitting calls the `setUserRole`
 * Cloud Function, which sets a custom claim after verifying the caller is a
 * manager — the client can display the result but never writes the claim itself.
 */
export default function AdminPage() {
  const router = useRouter();
  const { user, loading, isManager, isGuest, refreshRole } = useRole();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("technician");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!isManager) router.replace("/"); // technicians: board only
  }, [loading, user, isManager, router]);

  if (loading || !user || !isManager) {
    return (
      <main className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await setUserRole(email.trim(), role);
      setMessage(
        `Set ${res.email} to “${res.role}”. It takes effect the next time that user's session refreshes.`,
      );
      // If a manager changed their own role, refresh the local token now.
      if (res.email.toLowerCase() === (user?.email ?? "").toLowerCase()) {
        await refreshRole();
      }
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the role.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-zinc-100";

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Bay<span className="text-amber-500">Board</span>
          </h1>
          <AppNav current="admin" />
        </div>
        <div className="flex items-center gap-3">
          <HeaderUser />
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 p-4">
        <h2 className="text-lg font-semibold text-zinc-100">Team roles</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Managers see every view; technicians get the board and checklists.
          Roles are stored as Firebase custom claims.
        </p>

        {isGuest && (
          <p className="mt-4 rounded-md border border-amber-900 bg-amber-950 px-3 py-2 text-sm text-amber-300">
            You&apos;re in a guest session. Use the “View as” switch in the
            header to preview each role — assigning real roles needs a signed-in
            manager account.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <label className="block text-sm">
            <span className="text-zinc-400">User email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tech@shop.com"
              className={inputClass}
            />
          </label>

          <label className="mt-3 block text-sm">
            <span className="text-zinc-400">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
            </select>
          </label>

          {message && (
            <p className="mt-3 text-sm text-emerald-400">{message}</p>
          )}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-md bg-amber-500 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Assign role"}
          </button>
        </form>

        <section className="mt-6 text-sm text-zinc-500">
          <h3 className="font-semibold text-zinc-400">How roles are set</h3>
          <p className="mt-2">
            The <code className="text-zinc-300">setUserRole</code> Cloud Function
            (in <code className="text-zinc-300">functions/</code>) writes the
            claim with the Admin SDK after checking the caller is a manager. The
            very first manager is bootstrapped by listing their email in the
            function&apos;s{" "}
            <code className="text-zinc-300">BOOTSTRAP_MANAGER_EMAILS</code>{" "}
            environment variable; after that, any manager can promote others
            here.
          </p>
        </section>
      </div>
    </main>
  );
}
