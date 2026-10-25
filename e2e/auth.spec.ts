import { expect, test } from "@playwright/test";
import { resetEmulators, signInAsGuest } from "./helpers";

test.beforeEach(resetEmulators);

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("Sign in to the board")).toBeVisible();
});

test("a guest lands on an empty shop and can sign out", async ({ page }) => {
  await signInAsGuest(page);

  await expect(page.getByText("Empty shop.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load demo data" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
});

test("wrong credentials show an error instead of signing in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText("Wrong email or password.")).toBeVisible();
  await expect(page).toHaveURL("/login");
});
