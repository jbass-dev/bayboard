import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { Role } from "./RoleProvider";

/**
 * Client wrapper for the `setUserRole` Cloud Function.
 *
 * Roles live as Firebase **custom claims**, which can only be written with the
 * Admin SDK server-side. This callable is where that happens: the function
 * verifies the caller is already a manager (or a bootstrap admin) before
 * granting a claim, so promotion can't be forged from the browser.
 */

export interface SetUserRoleResult {
  email: string;
  role: Role;
}

export async function setUserRole(
  email: string,
  role: Role,
): Promise<SetUserRoleResult> {
  const callable = httpsCallable<{ email: string; role: Role }, SetUserRoleResult>(
    functions,
    "setUserRole",
  );
  const res = await callable({ email, role });
  return res.data;
}
