import { signInForTest } from "@repo/host-backend/testing";
import { expect, test } from "@playwright/test";

const SIGNED_IN_ROUTES = [
  "/",
  "/about",
  "/calendar",
  "/calendar/2026-10-12",
  "/programs",
  "/programs/discipline-economic-geology",
  "/types",
  "/types/Topical%20Sessions",
  "/sessions/96389",
  "/talks/16121",
  "/schedule",
  "/search",
  "/search?q=hydrolog",
  "/notes",
  "/notifications",
  "/organiser",
  "/organiser/talks/16121",
  "/organiser/sessions",
  "/organiser/sessions/96389",
  "/organiser/send",
  "/developer",
];

test.describe("signed out", () => {
  test("is sent to the sign-in page", async ({ page }) => {
    await page.goto("/talks/16121");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("every signed-in page sends a signed-out visitor to sign in", async ({ page }) => {
    for (const route of SIGNED_IN_ROUTES) {
      await page.goto(route);
      await expect(page, route).toHaveURL(/\/sign-in$/);
    }
  });
});

test.describe("signed in", () => {
  test.beforeEach(async ({ context }) => {
    const { cookies } = await signInForTest(process.env, "localhost");
    await context.addCookies(cookies);
  });

  test("home, then the schedule, a session and an abstract with related talks", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "GSA Connects 2026" })).toBeVisible();
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/calendar\/2026-1\d-\d\d$/);
    await page.goto("/sessions/96389");
    await page.getByRole("link", { name: /173-1 Multi-Objective Optimization/ }).click();
    await expect(page).toHaveURL(/\/talks\/16121$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("173-1 Multi-Objective Optimization");
    await expect(page.getByText("1:35 PM").first()).toBeVisible();
    await expect(page.getByText("10.1130/abs/2026AM-16121")).toBeVisible();
    await expect(page.getByRole("region", { name: "Related talks" }).getByRole("link").first()).toBeVisible();
  });

  test("a note saved on an abstract shows on Notes", async ({ page }) => {
    await page.goto("/talks/16121");
    await page.getByLabel("My note").fill("Ask about the emulators.");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await page.goto("/notes");
    await expect(page.getByText("Ask about the emulators.")).toBeVisible();
  });

  test("starring an abstract puts it in My Schedule", async ({ page }) => {
    await page.goto("/talks/16121");
    await page.getByRole("button", { name: "Add to My Schedule" }).click();
    await expect(page.getByRole("button", { name: "Remove from My Schedule" })).toBeVisible();
    await page.goto("/schedule");
    await expect(page.getByRole("link", { name: /Multi-Objective Optimization/ })).toBeVisible();

    await page.goto("/talks/16121");
    await page.getByRole("button", { name: "Remove from My Schedule" }).click();
    await expect(page.getByRole("button", { name: "Add to My Schedule" })).toBeEnabled();
    await page.goto("/schedule");
    await expect(page.getByText("You have not starred anything yet.")).toBeVisible();
  });

  test("Add to calendar downloads the abstract as an .ics file", async ({ page }) => {
    await page.goto("/talks/16121");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Add to calendar" }).click();
    expect((await download).suggestedFilename()).toBe("173-1.ics");
  });

  test("the attendee app and both consoles link to the credential verification page", async ({ page }) => {
    const url = process.env.CONFERENCE_API_VERIFY_URL;
    test.skip(!url, "CONFERENCE_API_VERIFY_URL is not set");
    for (const route of ["/", "/organiser", "/developer"]) {
      await page.goto(route);
      await expect(page.getByRole("link", { name: "Verify a credential" }), route).toHaveAttribute("href", url!);
    }
  });

  test("a signed-in guest who opens the sign-in page goes home", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "GSA Connects 2026" })).toBeVisible();
  });

  test("Sign Out ends the session and lands on the sign-in page", async ({ page }) => {
    await page.goto("/schedule");
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/schedule");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("filter by session type leads to sessions", async ({ page }) => {
    await page.goto("/types");
    await page.getByRole("link", { name: /^Topical Sessions/ }).click();
    await expect(page.getByRole("link", { name: /T104\. Advances in hydrologic modeling/ })).toBeVisible();
  });

  test("notifications are empty, as in the real app", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByText("No notifications")).toBeVisible();
  });
  test("a search address with the query twice uses the first, and a blank query asks for two characters", async ({ page }) => {
    await page.goto("/search?q=hydrolog&q=rain");
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search titles, abstracts, numbers and names" })).toHaveValue("hydrolog");
    await page.goto("/search?q=%20%20%20");
    await expect(page.getByText("Type at least two characters.")).toBeVisible();
  });

  test("not-found pages have exactly one main region, inside the app or out", async ({ page }) => {
    await page.goto("/talks/nope");
    await expect(page.getByText("We could not find that page.")).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await page.goto("/no-such-page");
    await expect(page.getByText("We could not find that page.")).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
  });

  test("after Sign Out, going Back does not show the signed-in page", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole("link", { name: "My Schedule" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "My Schedule" })).toBeVisible();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to the demo" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "My Schedule" })).toHaveCount(0);
  });
});
