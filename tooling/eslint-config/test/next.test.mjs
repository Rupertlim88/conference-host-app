import assert from "node:assert/strict";
import { test } from "node:test";

import { ESLint } from "eslint";

import { nextJsConfig } from "../next.js";

const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: nextJsConfig });

/** The guard messages ESLint reports for one snippet of app code. */
async function guardMessages(code) {
  const [result] = await eslint.lintText(code, { filePath: "app/page.tsx" });
  return result.messages.filter((m) => m.ruleId?.startsWith("no-restricted-")).map((m) => m.message);
}

for (const [what, code] of [
  ["the store package", 'import { createStore } from "@repo/host-store";'],
  ["a file inside the store", 'import { migrateStore } from "@repo/host-store/migrate";'],
  ["drizzle", 'import { eq } from "drizzle-orm";'],
  ["a drizzle subpath", 'import { pgTable } from "drizzle-orm/pg-core";'],
  ["the postgres driver", 'import postgres from "postgres";'],
  ["the store, loaded lazily", 'export const store = () => import("@repo/host-store/migrate");'],
  ["the store, through require", 'const store = require("@repo/host-store");'],
]) {
  test(`an app may not import ${what}`, async () => {
    const messages = await guardMessages(code);
    assert.ok(messages.length > 0, "expected a guard message");
    for (const message of messages) assert.match(message, /@repo\/host-backend/);
  });
}

test("an app may import the backend and its test helper", async () => {
  assert.deepEqual(await guardMessages('import { getHostServer } from "@repo/host-backend";'), []);
  assert.deepEqual(await guardMessages('import { signInForTest } from "@repo/host-backend/testing";'), []);
});

test("fonts must come from the repository", async () => {
  const [message] = await guardMessages('import { Inter } from "next/font/google";');
  assert.match(message, /next\/font\/local/);
});
