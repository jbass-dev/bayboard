import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { HttpsError, onCall } from "firebase-functions/v2/https";

initializeApp();

const ROLES = ["manager", "technician"] as const;
type Role = (typeof ROLES)[number];

/**
 * Emails allowed to bootstrap the first manager, before any manager claim
 * exists. Comma-separated, set as an env var on the function. Once a manager
 * exists they can promote others, so this is only needed for the first grant.
 */
function bootstrapEmails(): string[] {
  return (process.env.BOOTSTRAP_MANAGER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Grant a role custom claim to a user by email.
 *
 * Authorization: the caller must already hold a `manager` claim, OR their
 * email must be in BOOTSTRAP_MANAGER_EMAILS (to seed the very first manager).
 * This is the server-side gate that makes the client-side role UI trustworthy —
 * a technician can't promote themselves by calling this directly.
 */
export const setUserRole = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }

  const callerEmail = String(auth.token.email ?? "").toLowerCase();
  const callerIsManager = auth.token.role === "manager";
  const callerIsBootstrap = bootstrapEmails().includes(callerEmail);
  if (!callerIsManager && !callerIsBootstrap) {
    throw new HttpsError(
      "permission-denied",
      "Only managers can assign roles.",
    );
  }

  const email = String(request.data?.email ?? "").trim();
  const role = String(request.data?.role ?? "") as Role;
  if (!email) {
    throw new HttpsError("invalid-argument", "A user email is required.");
  }
  if (!ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Unknown role: ${role}`);
  }

  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch {
    throw new HttpsError("not-found", `No user with email ${email}.`);
  }

  await getAuth().setCustomUserClaims(user.uid, { role });
  return { email, role };
});
