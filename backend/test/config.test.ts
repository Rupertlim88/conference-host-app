import { describe, expect, test } from "vitest";

import { readConfig } from "../src/config";

const base = {
  HOST_SOCIETY: "ams",
  HOST_DATABASE_URL: "postgres://u@localhost:5432/db",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3001",
};

describe("readConfig", () => {
  test("reads the required settings, and leaves the optional ones unset", () => {
    expect(readConfig(base)).toEqual({
      society: "ams",
      databaseUrl: "postgres://u@localhost:5432/db",
      authSecret: "s".repeat(32),
      authUrl: "http://localhost:3001",
      google: null,
      api: null,
      cronSecret: null,
    });
  });
  test("refuses an unknown society and a short secret", () => {
    expect(() => readConfig({ ...base, HOST_SOCIETY: "agu" })).toThrow(/HOST_SOCIETY/);
    expect(() => readConfig({ ...base, BETTER_AUTH_SECRET: "short" })).toThrow(/BETTER_AUTH_SECRET/);
  });
  test("treats blank optional settings as unset", () => {
    expect(readConfig({ ...base, CONFERENCE_API_URL: "", CONFERENCE_API_KEY: "" }).api).toBeNull();
  });
  test("the API needs both its address and its key", () => {
    const api = { CONFERENCE_API_URL: "http://127.0.0.1:4010", CONFERENCE_API_KEY: "k".repeat(16) };
    expect(readConfig({ ...base, ...api }).api).toEqual({ url: "http://127.0.0.1:4010", key: "k".repeat(16) });
    expect(() => readConfig({ ...base, CONFERENCE_API_URL: api.CONFERENCE_API_URL })).toThrow(/CONFERENCE_API_KEY/);
  });
  test("web addresses off this machine must use HTTPS, so the API key never travels in the clear", () => {
    const key = { CONFERENCE_API_KEY: "k".repeat(16) };
    expect(() => readConfig({ ...base, ...key, CONFERENCE_API_URL: "http://api.example.org" })).toThrow(/CONFERENCE_API_URL/);
    expect(readConfig({ ...base, ...key, CONFERENCE_API_URL: "https://api.example.org" }).api?.url).toBe("https://api.example.org");
    expect(readConfig({ ...base, ...key, CONFERENCE_API_URL: "http://127.0.0.1:8787" }).api?.url).toBe("http://127.0.0.1:8787");
    expect(() => readConfig({ ...base, BETTER_AUTH_URL: "http://isobar.example.org" })).toThrow(/BETTER_AUTH_URL/);
  });
  test("the cron secret is optional and at least 16 characters", () => {
    expect(readConfig(base).cronSecret).toBeNull();
    expect(readConfig({ ...base, CRON_SECRET: "c".repeat(16) }).cronSecret).toBe("c".repeat(16));
    expect(() => readConfig({ ...base, CRON_SECRET: "short" })).toThrow(/CRON_SECRET/);
  });
  test("Google sign-in needs both its client id and secret", () => {
    const google = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };
    expect(readConfig({ ...base, ...google }).google).toEqual({ clientId: "id", clientSecret: "secret" });
    expect(() => readConfig({ ...base, GOOGLE_CLIENT_ID: "id" })).toThrow(/GOOGLE_CLIENT_SECRET/);
  });
});
