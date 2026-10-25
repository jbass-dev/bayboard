import { expect, type Page } from "@playwright/test";

const PROJECT_ID = "demo-bayboard";

/** Wipe every Firestore document and Auth account in the emulators. */
export async function resetEmulators(): Promise<void> {
  const firestore = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  const auth = await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" },
  );
  if (!firestore.ok || !auth.ok) {
    throw new Error(
      `Emulator reset failed (firestore ${firestore.status}, auth ${auth.status})`,
    );
  }
}

/** Sign in through the real login page as an anonymous guest (manager view). */
export async function signInAsGuest(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

/** From the empty board, seed the shop the way a manager would. */
export async function seed(
  page: Page,
  which: "Load demo data" | "Just 3 bays + 2 techs",
): Promise<void> {
  await page.getByRole("button", { name: which }).click();
  await expect(page.getByRole("region", { name: "Bay 1" })).toBeVisible();
}

/** A board column (the waiting queue or one bay), found by its accessible name. */
export function column(page: Page, name: string) {
  return page.getByRole("region", { name });
}

/** One car on the board, found by its "year make model" heading. */
export function ticketCard(page: Page, vehicle: string) {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", { name: vehicle }),
  });
}
