"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth } from "./firebase";

/** The two shop roles. Signed-in users carry this as a Firebase custom claim. */
export type Role = "manager" | "technician";

export interface RoleState {
  user: User | null;
  /** True until the first auth state (and its claims) resolve. */
  loading: boolean;
  /** Effective role, or null when signed out. */
  role: Role | null;
  isManager: boolean;
  /** Anonymous "guest" sessions used by the public demo. */
  isGuest: boolean;
  /** Guests preview either role locally; ignored for real accounts. */
  previewRole: Role;
  setPreviewRole: (role: Role) => void;
  /** Force a token refresh so a just-granted claim takes effect. */
  refreshRole: () => Promise<void>;
}

const RoleContext = createContext<RoleState | null>(null);

/** Read a role custom claim, defaulting unknown/missing to technician. */
function readClaimRole(claims: Record<string, unknown>): Role {
  return claims.role === "manager" ? "manager" : "technician";
}

/**
 * App-wide auth + role state.
 *
 * Real accounts get their role from a Firebase **custom claim** set
 * server-side by the `setUserRole` Cloud Function — the client only ever
 * reads it, so a technician can't promote themselves by editing state.
 * Anonymous guest sessions (the public demo) have no claim; they pick a
 * role locally with the header toggle so a visitor can preview both the
 * manager and technician views without an account.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimRole, setClaimRole] = useState<Role | null>(null);
  const [previewRole, setPreviewRole] = useState<Role>("manager");

  const loadClaims = useCallback(async (u: User) => {
    try {
      const token = await u.getIdTokenResult();
      setClaimRole(readClaimRole(token.claims));
    } catch {
      setClaimRole("technician");
    }
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u && !u.isAnonymous) {
          await loadClaims(u);
        } else {
          setClaimRole(null);
        }
        setLoading(false);
      }),
    [loadClaims],
  );

  const refreshRole = useCallback(async () => {
    if (user && !user.isAnonymous) {
      await user.getIdToken(true); // discard cached token so new claims land
      await loadClaims(user);
    }
  }, [user, loadClaims]);

  const isGuest = Boolean(user?.isAnonymous);
  const role: Role | null = user
    ? isGuest
      ? previewRole
      : (claimRole ?? "technician")
    : null;

  return (
    <RoleContext.Provider
      value={{
        user,
        loading,
        role,
        isManager: role === "manager",
        isGuest,
        previewRole,
        setPreviewRole,
        refreshRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

/** Auth + role for the current session. Must be used within RoleProvider. */
export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
