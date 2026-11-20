import { signInForTest } from "@repo/host-backend/testing";
import { expect, test, type Page } from "@playwright/test";

// These tests change the shared programme, so they run one at a time, in one project, on records the attendee
// tests never open: paper J1.2 (498161) in session J1 (75968), and session 5 (76231). Each ends by resetting the programme.
const PAPER = "498161";
const SESSION = "76231";

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
  await expect(page.getByRole("heading", { level: 1, name: "Papers" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("complementary").getByRole("link", { name: "Developer console" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Developer console" })).toBeVisible();
});

test("papers are searched and filtered with a plain form", async ({ page }) => {
  await page.goto("/organiser");
  await page.getByRole("searchbox", { name: "Search papers" }).fill("GeoXO Imager");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=GeoXO\+Imager/);
  await expect(page.getByRole("link", { name: "Update on Development of the GeoXO Imager" })).toBeVisible();
});

test("a withdrawn paper leaves the attendee app, and comes back when restored", async ({ page }) => {
  await page.goto(`/organiser/talks/${PAPER}`);
  await page.getByRole("button", { name: "Withdraw paper" }).click();
  await expect(status(page)).toHaveText("Withdrawn");
  await page.goto(`/talks/${PAPER}`);
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(`/organiser/talks/${PAPER}`);
  await page.getByRole("button", { name: "Restore paper" }).click();
  await expect(status(page)).toHaveText("Scheduled");
  await page.goto(`/talks/${PAPER}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("J1.2 - Update on Development of the GeoXO Imager");
});

test("a paper moves to a session found by search, and the attendee session lists it", async ({ page }) => {
  await page.goto(`/organiser/talks/${PAPER}`);
  await page.getByRole("searchbox", { name: "Find a session" }).fill("Wind Energy Forecasting");
  await page.getByRole("button", { name: "Find" }).click();
  await page.getByRole("button", { name: "Move to 5" }).click();
  await expect(status(page)).toHaveText("Moved");
  await expect(page.getByRole("link", { name: /^5 - Wind Energy Forecasting/ })).toBeVisible();
  await page.goto(`/sessions/${SESSION}`);
  await expect(page.getByRole("link", { name: /J1\.2 Update on Development of the GeoXO Imager/ })).toBeVisible();
  await resetProgramme(page);
});

test("a session's new time and room carry its papers along", async ({ page }) => {
  await page.goto(`/organiser/sessions/${SESSION}`);
  await page.getByLabel("Start (Mountain)").fill("14:45");
  await page.getByLabel("End (Mountain)").fill("16:00");
  await page.getByLabel("Room").fill("Hall Z");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByRole("status")).toHaveText("Session saved");
  await expect(page.getByText("Tue, Jan 12, 2:45 PM - 4:00 PM").first()).toBeVisible();
  await page.goto(`/sessions/${SESSION}`);
  await expect(page.getByText("2:45 PM - 4:00 PM").first()).toBeVisible();
  await expect(page.getByText(/Hall Z/).first()).toBeVisible();
  await resetProgramme(page);
});

test("a session ending before it starts is refused by name", async ({ page }) => {
  await page.goto(`/organiser/sessions/${SESSION}`);
  await page.getByLabel("End (Mountain)").fill("08:00");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The end" })).toHaveText("The end must be after the start.");
});

test("sending asks to confirm, sends the programme and lists the run", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/organiser/send");
  await page.getByRole("button", { name: "Send programme" }).click();
  await page.getByRole("button", { name: "Send now" }).click();
  await expect(page.getByRole("status")).toContainText(/^Sent [\d,]+ papers/, { timeout: 90_000 });
  const runs = page.getByRole("heading", { level: 2, name: "Recent sends" }).locator("..");
  await expect(runs.getByRole("row").nth(1)).toContainText("Sent");
});

test("the developer console tests the connection", async ({ page }) => {
  await page.goto("/developer");
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByRole("status")).toContainText("Connection works");
});
