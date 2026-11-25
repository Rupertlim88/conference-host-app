import { describe, expect, test } from "vitest";

import { sslFor } from "../src/connect";

describe("sslFor", () => {
  test("a database off this machine is always reached over TLS", () => {
    expect(sslFor("postgres://u:p@aws-0-eu-west-2.pooler.supabase.com:6543/postgres")).toBe("require");
  });
  test("an address that already asks for TLS is left to say how", () => {
    for (const mode of ["require", "verify-ca", "verify-full"]) {
      expect(sslFor(`postgres://u:p@db.example.org:5432/postgres?sslmode=${mode}`)).toBeUndefined();
    }
  });
  test("an address off this machine that turns TLS off is refused, without its password", () => {
    for (const mode of ["disable", "allow", "prefer"]) {
      expect(() => sslFor(`postgres://u:secret@db.example.org/postgres?sslmode=${mode}`)).toThrow(/encrypted/);
      expect(() => sslFor(`postgres://u:secret@db.example.org/postgres?sslmode=${mode}`)).not.toThrow(/secret/);
    }
  });
  test("an address that names sslmode twice is refused unless every one asks for TLS", () => {
    expect(() => sslFor("postgres://u:p@db.example.org/postgres?sslmode=require&sslmode=disable")).toThrow(/encrypted/);
    expect(sslFor("postgres://u:p@db.example.org/postgres?sslmode=require&sslmode=verify-full")).toBeUndefined();
  });
  test("a database on this machine is reached as its address says", () => {
    expect(sslFor("postgres://rupertlim@localhost:54329/host_app_dev")).toBeUndefined();
    expect(sslFor("postgres://kindred:kindred@127.0.0.1:5432/kindred")).toBeUndefined();
  });
  test("an address with no host is judged by the host the driver falls back to", () => {
    expect(sslFor("postgres:///postgres", { PGHOST: "db.example.org" })).toBe("require");
    expect(sslFor("postgres:///postgres", { PGHOST: "/var/run/postgresql" })).toBeUndefined();
    expect(sslFor("postgres:///postgres", {})).toBeUndefined();
  });
});
