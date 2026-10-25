import { expect, test } from "@playwright/test";
import { column, resetEmulators, seed, signInAsGuest, ticketCard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEmulators();
  await signInAsGuest(page);
  await seed(page, "Just 3 bays + 2 techs");
});

test("a car goes from check-in to a bay to complete", async ({ page }) => {
  const car = "2019 Honda Civic";

  // Check the car in.
  await page.getByRole("button", { name: "+ New ticket" }).click();
  const form = page.getByRole("dialog", { name: "New ticket" });
  await form.getByLabel("Year").fill("2019");
  await form.getByLabel("Make").fill("Honda");
  await form.getByLabel("Model").fill("Civic");
  await form.getByLabel("Service").selectOption({ label: "Tire rotation" });
  await form.getByRole("button", { name: "Add to queue" }).click();
  await expect(form).toBeHidden();

  const waiting = column(page, "Waiting");
  await expect(ticketCard(page, car)).toBeVisible();
  await expect(waiting.getByRole("heading", { name: car })).toBeVisible();

  // Assign it to Bay 2 with Alex.
  await ticketCard(page, car).getByRole("button", { name: "Assign to bay" }).click();
  const assign = page.getByRole("dialog", { name: `Assign ${car}` });
  await assign.getByLabel("Bay").selectOption({ label: "Bay 2" });
  await assign.getByLabel("Technician").selectOption({ label: "Alex" });
  await assign.getByRole("button", { name: "Assign" }).click();

  const bay2 = column(page, "Bay 2");
  await expect(bay2.getByRole("heading", { name: car })).toBeVisible();
  await expect(bay2.getByText("Alex")).toBeVisible();
  await expect(waiting.getByRole("heading", { name: car })).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "moved to Bay 2" })).toHaveCount(1);

  // Send it back, then reassign — the queue works in both directions.
  await ticketCard(page, car).getByRole("button", { name: "Back" }).click();
  await expect(waiting.getByRole("heading", { name: car })).toBeVisible();
  await ticketCard(page, car).getByRole("button", { name: "Assign to bay" }).click();
  await page.getByRole("dialog", { name: `Assign ${car}` }).getByRole("button", { name: "Assign" }).click();
  await expect(column(page, "Bay 1").getByRole("heading", { name: car })).toBeVisible();

  // Complete it; it leaves the board.
  await ticketCard(page, car).getByRole("button", { name: "Complete" }).click();
  const complete = page.getByRole("dialog", { name: `Complete ${car}` });
  await complete.getByRole("button", { name: "Complete service" }).click();
  await expect(ticketCard(page, car)).toHaveCount(0);
});

test("Escape closes a dialog without changing anything", async ({ page }) => {
  await page.getByRole("button", { name: "+ New ticket" }).click();
  await expect(page.getByRole("dialog", { name: "New ticket" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(column(page, "Waiting").getByRole("article")).toHaveCount(0);
});
