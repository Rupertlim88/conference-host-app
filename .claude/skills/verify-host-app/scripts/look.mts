// Opens one host-app route in a real browser, runs the given steps, and saves an ARIA
// snapshot and a screenshot. Usage is in ../SKILL.md; run it with `npx tsx`.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import nextEnv from "@next/env";
import { signInForTest } from "@repo/host-backend/testing";
import { chromium, devices } from "playwright";

import { parseLook } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const look = parseLook(process.argv.slice(2));
const { app } = look;
nextEnv.loadEnvConfig(join(root, app.dir));

const baseURL = `http://localhost:${app.port}`;
const run = join(root, ".verify/run");
const evidence = join(root, ".verify/evidence", app.society);
mkdirSync(run, { recursive: true });
mkdirSync(evidence, { recursive: true });

// One guest per launch: the first signed-in look creates it, later looks reuse its cookies.
const statePath = join(run, `${app.society}-state.json`);
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  ...(look.device === "phone" ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } : { viewport: { width: 1280, height: 900 } }),
  ...(look.signedIn && existsSync(statePath) ? { storageState: statePath } : {}),
});
if (look.signedIn && !existsSync(statePath)) {
  const { email, cookies } = await signInForTest(process.env, "localhost");
  await context.addCookies(cookies);
  await context.storageState({ path: statePath });
  console.log(`signed in as ${email}`);
}

const page = await context.newPage();

/** Saves the page as it is now: the final URL with its ARIA snapshot, and a full-page screenshot. */
async function save(name: string): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = join(evidence, `${stamp}-${name}-${look.device}`);
  writeFileSync(`${base}.aria.txt`, `${page.url()}\n\n${await page.locator("body").ariaSnapshot()}\n`);
  await page.screenshot({ path: `${base}.png`, fullPage: true });
  console.log(`url ${page.url()}`);
  console.log(`saved ${base}.png`);
  console.log(`saved ${base}.aria.txt`);
}

// A role's accessible name sometimes comes from its text (a heading) and sometimes not (a status), so match either.
const byRole = (target: { role: string; name: string }) => {
  const role = target.role as Parameters<typeof page.getByRole>[0];
  return page.getByRole(role, { name: target.name }).or(page.getByRole(role).filter({ hasText: target.name })).first();
};

try {
  await page.goto(look.route);
  await page.waitForLoadState("networkidle");
  for (const step of look.steps) {
    if ("click" in step) await byRole(step.click).click();
    else if ("expect" in step) await byRole(step.expect).waitFor({ state: "visible", timeout: 10_000 });
    else if ("fill" in step) await page.getByLabel(step.fill.label).fill(step.fill.text);
    else await page.keyboard.press(step.press);
    await page.waitForLoadState("networkidle");
  }
  await save(look.name);
} catch (error) {
  await save(`${look.name}-failed`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
