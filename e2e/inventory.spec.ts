import { expect, test } from "@playwright/test";
import { resetEmulators, seed, signInAsGuest, ticketCard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEmulators();
  await signInAsGuest(page);
  await seed(page, "Load demo data");
});

test("completing a service takes its parts off the shelf and raises low-stock alerts", async ({ page }) => {
  // Demo data ships with one filter already under its threshold.
  const banner = page.getByRole("status").filter({ hasText: "Low stock" });
  await expect(banner).toContainText("Low stock (1)");
  await expect(banner).toContainText("PH7317 (oil filter) (5)");

  // The Civic in Bay 1 uses one filter and enough 5W-30 to cross its threshold.
  const car = "2020 Honda Civic";
  await ticketCard(page, car).getByRole("button", { name: "Complete" }).click();
  const dialog = page.getByRole("dialog", { name: `Complete ${car}` });
  await dialog.getByLabel("PH7317 (oil filter)").fill("1");
  await dialog.getByLabel("5W-30").fill("15");
  await dialog.getByRole("button", { name: "Complete service" }).click();

  await expect(ticketCard(page, car)).toHaveCount(0);
  await expect(banner).toContainText("Low stock (2)");
  await expect(banner).toContainText("PH7317 (oil filter) (4)");
  await expect(banner).toContainText("5W-30 (11)");

  // The inventory page shows the same counts.
  await banner.getByRole("link", { name: "Manage inventory →" }).click();
  await expect(page).toHaveURL("/inventory");
  await expect(page.getByLabel("PH7317 (oil filter) quantity")).toHaveValue("4");
  await expect(page.getByLabel("5W-30 quantity")).toHaveValue("11");
  await expect(page.getByRole("row").filter({ hasText: "PH7317" })).toContainText("Low stock");
});
