"use client";

import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRole, type Role } from "../lib/RoleProvider";

/**
 * Right-hand header cluster shared by every page: the guest role-preview
 * toggle, the current identity, and sign-out. Rendered as a fragment so it
 * slots into each page's existing flex row alongside page-specific actions.
 */
export default function HeaderUser() {
  const { user, role, isGuest, previewRole, setPreviewRole } = useRole();
  if (!user) return null;

  return (
    <>
      {isGuest && (
        <label className="hidden items-center gap-1 text-xs text-zinc-500 sm:flex no-print">
          View as
          <select
            value={previewRole}
            onChange={(e) => setPreviewRole(e.target.value as Role)}
            aria-label="Preview role"
            className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-200"
          >
            <option value="manager">Manager</option>
            <option value="technician">Technician</option>
          </select>
        </label>
      )}
      <span className="hidden text-sm text-zinc-400 sm:inline">
        {isGuest ? "Guest" : user.email}
        {role && (
          <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            {role}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => signOut(auth)}
        className="text-sm text-zinc-400 hover:text-zinc-200 no-print"
      >
        Sign out
      </button>
    </>
  );
}
