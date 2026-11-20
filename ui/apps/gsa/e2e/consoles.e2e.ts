import { signInForTest } from "@repo/host-backend/testing";
import { expect, test, type Page } from "@playwright/test";

// These tests change the shared programme, so they run one at a time, in one project, on records the attendee
// tests never open: submission 180-1 (20215) in session 180 (96368), and session 201 (96325). Each ends by
// resetting the programme.
const SUBMISSION = "20215";
const SESSION = "96368";
const TARGET = "96325";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }, testInfo) => {
  test.skip(testInfo.project.name !== "computer", "changes shared data; runs once");
  const { cookies } = await signInForTest(process.env, "localhost");
  await context.addCookies(cookies);
});

async function resetProgramme(page: Page) {
  await page.goto("/developer");
  await page.getByRole("button", { name: "Reset to published programme" }).click();
  await page.getByRole("button", { name: "Reset now" }).click();
  await expect(page.getByRole("status")).toContainText("Programme reset");
}

const status = (page: Page) => page.getByRole("definition").first();

test("the attendee menu leads to both consoles", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("complementary").getByRole("link", { name: "Organiser console" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Submissions" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("complementary").getByRole("link", { name: "Developer console" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Developer console" })).toBeVisible();
});

test("submissions are searched and filtered with a plain form", async ({ page }) => {
  await page.goto("/organiser");
  await page.getByRole("searchbox", { name: "Search submissions" }).fill("Lithium-Clay Deposits");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=Lithium-Clay\+Deposits/);
  await expect(page.getByRole("link", { name: /Geologic Setting and Origin of Lithium-Clay Deposits/ })).toBeVisible();
});

test("a withdrawn submission leaves the attendee app, and comes back when restored", async ({ page }) => {
  await page.goto(`/organiser/talks/${SUBMISSION}`);
  await page.getByRole("button", { name: "Withdraw submission" }).click();
  await expect(status(page)).toHaveText("Withdrawn");
  await page.goto(`/talks/${SUBMISSION}`);
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(`/organiser/talks/${SUBMISSION}`);
  await page.getByRole("button", { name: "Restore submission" }).click();
  await expect(status(page)).toHaveText("Scheduled");
  await page.goto(`/talks/${SUBMISSION}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("180-1");
});

test("a submission moves to a session found by search, and the attendee session lists it", async ({ page }) => {
  await page.goto(`/organiser/talks/${SUBMISSION}`);
  await page.getByRole("searchbox", { name: "Find a session" }).fill("Land Surface Subsidence");
  await page.getByRole("button", { name: "Find" }).click();
  await page.getByRole("button", { name: "Move to 201" }).click();
  await expect(status(page)).toHaveText("Moved");
  await expect(page.getByRole("link", { name: /^201 - T115/ })).toBeVisible();
  await page.goto(`/sessions/${TARGET}`);
  await expect(page.getByRole("link", { name: /Lithium-Clay Deposits/ })).toBeVisible();
  await resetProgramme(page);
});

test("a session's new time and room carry its submissions along", async ({ page }) => {
  await page.goto(`/organiser/sessions/${SESSION}`);
  await page.getByLabel("Start (Mountain)").fill("09:00");
  await page.getByLabel("End (Mountain)").fill("11:55");
  await page.getByLabel("Room").fill("Hall Z");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByRole("status")).toHaveText("Session saved");
  await expect(page.getByText("Tue, Oct 13, 9:00 AM - 11:55 AM").first()).toBeVisible();
  await page.goto(`/sessions/${SESSION}`);
  await expect(page.getByText(/9:00 AM/).first()).toBeVisible();
  await expect(page.getByText(/Hall Z/).first()).toBeVisible();
  await resetProgramme(page);
});

test("a session ending before it starts is refused by name", async ({ page }) => {
  await page.goto(`/organiser/sessions/${SESSION}`);
  await page.getByLabel("End (Mountain)").fill("07:00");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The end" })).toHaveText("The end must be after the start.");
});

test("sending asks to confirm, sends the programme and lists the run", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/organiser/send");
  await page.getByRole("button", { name: "Send programme" }).click();
  await page.getByRole("button", { name: "Send now" }).click();
  await expect(page.getByRole("status")).toContainText(/^Sent [\d,]+ submissions/, { timeout: 90_000 });
  const runs = page.getByRole("heading", { level: 2, name: "Recent sends" }).locator("..");
  await expect(runs.getByRole("row").nth(1)).toContainText("Sent");
});

test("the developer console tests the connection", async ({ page }) => {
  await page.goto("/developer");
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByRole("status")).toContainText("Connection works");
});
