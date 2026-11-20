import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { collect, render, isCurrent } from "./dependencies.mjs";

/** A minimal repo: one npm workspace, a Python project with a dev group, and CI. */
function fakeRepo() {
  const root = mkdtempSync(join(tmpdir(), "dependencies-"));
  const write = (path, text) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  write(
    "package.json",
    JSON.stringify({
      name: "repo",
      packageManager: "npm@10.9.3",
      engines: { node: ">=24" },
      workspaces: ["ui/apps/*", "data/store"],
      devDependencies: { turbo: "^2.5.0" },
    }),
  );
  write(
    "ui/apps/ams/package.json",
    JSON.stringify({
      name: "ams",
      dependencies: { zod: "^4.4.3", next: "16.0.0" },
      devDependencies: { vitest: "^4.1.0" },
    }),
  );
  write(
    "data/store/package.json",
    JSON.stringify({ name: "@repo/host-store", dependencies: { "drizzle-orm": "^0.45.0" } }),
  );
  write(
    "package-lock.json",
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "node_modules/turbo": { version: "2.5.4" },
        "node_modules/zod": { version: "4.4.3" },
        "node_modules/shadcn/node_modules/zod": { version: "3.25.0" },
        "ui/apps/ams/node_modules/next": { version: "16.0.0" },
        "node_modules/next": { version: "15.0.0" },
        "node_modules/vitest": { version: "4.1.11" },
        "node_modules/drizzle-orm": { version: "0.45.2" },
      },
    }),
  );
  write(
    "pyproject.toml",
    [
      "[project]",
      'name = "host-python"',
      'requires-python = ">=3.12"',
      "dependencies = [",
      '    "anthropic>=0.40",',
      '    "jsonschema>=4.23",',
      "]",
      "",
      "[dependency-groups]",
      "dev = [",
      '    "pytest>=8",',
      "]",
      "pilot = [",
      '    "numpy>=2.5",',
      "]",
      "",
    ].join("\n"),
  );
  write(
    "uv.lock",
    [
      "version = 1",
      "",
      "[[package]]",
      'name = "anthropic"',
      'version = "0.75.0"',
      "",
      "[[package]]",
      'name = "jsonschema"',
      'version = "4.25.1"',
      "",
      "[[package]]",
      'name = "pytest"',
      'version = "8.4.2"',
      "",
    ].join("\n"),
  );
  write(
    ".github/workflows/ci.yml",
    [
      "jobs:",
      "  web:",
      "    steps:",
      "      - uses: actions/setup-node@v4",
      "        with:",
      "          node-version: 24",
      "  python:",
      "    steps:",
      "      - uses: astral-sh/setup-uv@v6",
      "      - run: uv python install 3.12",
    ].join("\n"),
  );
  return root;
}

test("npm dependencies carry the declared range and the version the lockfile installs", () => {
  const { npm } = collect(fakeRepo());
  const row = (pkg, name) =>
    npm.find((d) => d.package === pkg && d.name === name);
  assert.deepEqual(row("ams", "zod"), {
    package: "ams",
    name: "zod",
    range: "^4.4.3",
    locked: "4.4.3",
    kind: "runtime",
  });
  // a copy nested under the workspace wins over the hoisted one
  assert.equal(row("ams", "next").locked, "16.0.0");
  assert.equal(row("ams", "vitest").kind, "dev");
  assert.equal(row("repo", "turbo").locked, "2.5.4");
});

test("workspaces named by exact path are read, not only dir/* globs", () => {
  const { npm } = collect(fakeRepo());
  assert.deepEqual(
    npm.find((d) => d.package === "@repo/host-store" && d.name === "drizzle-orm"),
    { package: "@repo/host-store", name: "drizzle-orm", range: "^0.45.0", locked: "0.45.2", kind: "runtime" },
  );
});

test("python dependencies carry the declared range and the uv.lock version, dev group included", () => {
  const { python } = collect(fakeRepo());
  assert.deepEqual(
    python.find((d) => d.name === "anthropic"),
    {
      project: "host-python",
      name: "anthropic",
      range: ">=0.40",
      locked: "0.75.0",
      kind: "runtime",
    },
  );
  assert.equal(python.find((d) => d.name === "pytest").kind, "dev");
});

test("every python dependency group is listed under its own name, not only dev", () => {
  const { python } = collect(fakeRepo());
  assert.deepEqual(python.find((d) => d.name === "numpy"), {
    project: "host-python",
    name: "numpy",
    range: ">=2.5",
    locked: "not locked",
    kind: "pilot",
  });
});

test("runtimes come from the manifests and from CI", () => {
  const { runtimes } = collect(fakeRepo());
  assert.deepEqual(runtimes, [
    {
      name: "Node.js",
      declared: ">=24 (package.json engines)",
      used: "24 (CI)",
    },
    {
      name: "npm",
      declared: "10.9.3 (package.json packageManager)",
      used: "10.9.3",
    },
    {
      name: "Python",
      declared: ">=3.12 (pyproject.toml)",
      used: "3.12 (CI)",
    },
    {
      name: "uv",
      declared: "setup-uv@v6 (CI)",
      used: "latest uv at CI time (not pinned)",
    },
  ]);
});

test("pinned tools and the runtimes they need come from the verification manifest", () => {
  const root = fakeRepo();
  const manifest = "backend/verification/pinned-tools.json";
  const sha256 = "ab".repeat(32);
  mkdirSync(join(root, manifest, ".."), { recursive: true });
  writeFileSync(
    join(root, manifest),
    JSON.stringify({
      runtimes: [{ name: "Java", requires: ">=11" }],
      tools: [
        {
          id: "tla2tools",
          name: "TLA+ tools (tla2tools.jar)",
          version: "1.7.4",
          url: "https://example.test/tla2tools.jar",
          sha256,
        },
      ],
    }),
  );
  const { runtimes } = collect(root);
  const row = (name) => runtimes.find((r) => r.name === name);
  assert.deepEqual(row("Java"), {
    name: "Java",
    declared: `>=11 (${manifest})`,
    used: "not pinned (the machine's own install)",
  });
  assert.deepEqual(row("TLA+ tools (tla2tools.jar)"), {
    name: "TLA+ tools (tla2tools.jar)",
    declared: `1.7.4 (${manifest})`,
    used: `1.7.4, SHA-256 ${sha256}`,
  });
  assert.match(
    render(collect(root)),
    /\| TLA\+ tools \(tla2tools\.jar\) \| 1\.7\.4 \(backend\/verification\/pinned-tools\.json\) \| 1\.7\.4, SHA-256 (ab){32} \|/,
  );
});

test("the rendered file is stable, and a stale file is detected", () => {
  const root = fakeRepo();
  const text = render(collect(root));
  assert.equal(text, render(collect(root)));
  assert.match(text, /\| ams \| zod \| \^4\.4\.3 \| 4\.4\.3 \|/);
  assert.match(text, /do not edit by hand/i);
  writeFileSync(join(root, "DEPENDENCIES.md"), text);
  assert.equal(isCurrent(root), true);
  writeFileSync(
    join(root, "DEPENDENCIES.md"),
    text.replace("4.4.3 |", "4.4.2 |"),
  );
  assert.equal(isCurrent(root), false);
});
