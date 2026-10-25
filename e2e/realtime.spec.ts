import { expect, test } from "@playwright/test";
import { column, resetEmulators, seed, signInAsGuest } from "./helpers";

test.beforeEach(resetEmulators);

test("a ticket added at the counter shows up on another screen without a refresh", async ({ browser }) => {
  // Two separate browser sessions: the counter tablet and the bay screen.
  const counter = await (await browser.newContext()).newPage();
  const bayScreen = await (await browser.newContext()).newPage();

  await signInAsGuest(counter);
  await seed(counter, "Just 3 bays + 2 techs");
  await signInAsGuest(bayScreen);
  await expect(column(bayScreen, "Bay 1")).toBeVisible();

  await counter.getByRole("button", { name: "+ New ticket" }).click();
  const form = counter.getByRole("dialog", { name: "New ticket" });
  await form.getByLabel("Year").fill("2015");
  await form.getByLabel("Make").fill("Jeep");
  await form.getByLabel("Model").fill("Wrangler");
  await form.getByRole("button", { name: "Add to queue" }).click();

  // No reload on the bay screen: Firestore's listener delivers it.
  await expect(
    column(bayScreen, "Waiting").getByRole("heading", { name: "2015 Jeep Wrangler" }),
  ).toBeVisible();

  await counter.context().close();
  await bayScreen.context().close();
});
