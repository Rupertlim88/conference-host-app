import { signInForTest } from "@repo/host-backend/testing";
import { expect, test } from "@playwright/test";

const SIGNED_IN_ROUTES = [
  "/",
  "/calendar",
  "/calendar/2027-01-12",
  "/programs",
  "/programs/1968",
  "/sessions/77102",
  "/talks/493803",
  "/people",
  "/people/gonzalo-gonzalez-abad",
  "/schedule",
  "/search",
  "/search?q=storm",
  "/organiser",
  "/organiser/talks/493803",
  "/organiser/sessions",
  "/organiser/sessions/77102",
  "/organiser/send",
  "/developer",
];

test.describe("signed out", () => {
  test("is sent to the sign-in page", async ({ page }) => {
    await page.goto("/talks/493803");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in to the demo" })).toBeVisible();
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

  test("home leads to the calendar, a session and a talk, and Our improvements add related talks", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to the 107th AMS Annual Meeting" })).toBeVisible();
    await page.getByRole("link", { name: "Meeting Calendar" }).first().click();
    await expect(page).toHaveURL(/\/calendar\/2027-01-1\d$/);

    await page.goto("/sessions/77102");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Decision Support I");
    await expect(page.getByText("403 (Colorado Convention Center)").first()).toBeVisible();
    await page.getByRole("link", { name: /J1\.2 What is a Snow Squall/ }).click();

    await expect(page).toHaveURL(/\/talks\/493803$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("J1.2 - What is a Snow Squall?");
    await expect(page.getByText("Monday, January 11, 2027")).toBeVisible();
    await expect(page.getByText("8:45 AM - 9:00 AM")).toBeVisible();
    // AMS's meeting app has no related talks; Our improvements add them in a gold outline.
    await expect(page.getByRole("region", { name: "Related talks" })).toHaveCount(0);
    await page.getByRole("button", { name: "Switch to Our improvements" }).click();
    await expect(page.getByText("Our change: related talks")).toBeVisible();
    await page.goto("/talks/484769");
    const related = page.getByRole("region", { name: "Related talks" });
    await expect(related.getByRole("link").first()).toBeVisible();
  });

  test("starring a talk puts it in My Schedule", async ({ page }) => {
    await page.goto("/talks/493803");
    await page.getByRole("button", { name: "Add to My Schedule" }).click();
    await expect(page.getByRole("button", { name: "Remove from My Schedule" })).toBeVisible();
    await page.goto("/schedule");
    await expect(page.getByRole("link", { name: /Snow Squall/ })).toBeVisible();

    await page.goto("/talks/493803");
    await page.getByRole("button", { name: "Remove from My Schedule" }).click();
    await expect(page.getByRole("button", { name: "Add to My Schedule" })).toBeEnabled();
    await page.goto("/schedule");
    await expect(page.getByText("You have not starred anything yet.")).toBeVisible();
  });

  test("a signed-in guest who opens the sign-in page goes home", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Welcome to the 107th AMS Annual Meeting" })).toBeVisible();
  });

  test("Sign Out ends the session and lands on the sign-in page", async ({ page }) => {
    await page.goto("/schedule");
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/schedule");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("search finds a talk by its title", async ({ page }) => {
    await page.goto("/search?q=Snow%20Squall");
    await expect(page.getByRole("link", { name: /J1\.2 What is a Snow Squall/ })).toBeVisible();
  });

  test("an unknown talk shows the not-found page", async ({ page }) => {
    await page.goto("/talks/does-not-exist");
    await expect(page.getByText("We could not find that page.")).toBeVisible();
  });
  test("a search address with the query twice uses the first, and a blank query asks for two characters", async ({ page }) => {
    await page.goto("/search?q=storm&q=rain");
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search titles, abstracts, numbers and names" })).toHaveValue("storm");
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
    await page.getByRole("link", { name: "My Schedule" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "My Schedule" })).toBeVisible();
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to the demo" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "My Schedule" })).toHaveCount(0);
  });

  test("a plain session's title reads Session and its number", async ({ page }) => {
    await page.goto("/sessions/76096");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Session 5 - Global Lightning Observations and Climatology/);
  });
});
