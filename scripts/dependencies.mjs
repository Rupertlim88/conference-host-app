#!/usr/bin/env node
/**
 * Writes DEPENDENCIES.md: every runtime, tool and library the repo depends on, with the
 * version range each manifest declares and the exact version its lockfile installs.
 * Generated from package.json / package-lock.json, pyproject.toml / uv.lock, the pinned-tools manifest
 * (backend/verification) and the CI workflow; never edited by hand.
 *
 *   npm run deps          rewrite DEPENDENCIES.md
 *   npm run deps:check    exit 1 if DEPENDENCIES.md is out of date (CI runs this)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = "DEPENDENCIES.md";
const PYPROJECT = "pyproject.toml";
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const readText = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

/** Workspace directories for globs of the form "dir/*", in sorted order. */
function workspaceDirs(root, patterns) {
  return patterns.flatMap((pattern) => {
    // An exact path ("data/store") names one workspace; "dir/*" names each package in dir.
    if (!pattern.endsWith("/*"))
      return existsSync(join(root, pattern, "package.json")) ? [pattern] : [];
    const base = pattern.slice(0, -2);
    if (!existsSync(join(root, base))) return [];
    return readdirSync(join(root, base), { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() &&
          existsSync(join(root, base, d.name, "package.json")),
      )
      .map((d) => `${base}/${d.name}`)
      .sort();
  });
}

function npmDependencies(root) {
  const rootPkg = readJson(join(root, "package.json"));
  const lock = readJson(join(root, "package-lock.json")).packages ?? {};
  const locked = (dir, name) =>
    lock[`${dir}/node_modules/${name}`]?.version ??
    lock[`node_modules/${name}`]?.version ??
    "not installed";
  const rows = [];
  for (const dir of ["", ...workspaceDirs(root, rootPkg.workspaces ?? [])]) {
    const pkg = dir ? readJson(join(root, dir, "package.json")) : rootPkg;
    for (const [field, kind] of [
      ["dependencies", "runtime"],
      ["devDependencies", "dev"],
    ]) {
      for (const [name, range] of Object.entries(pkg[field] ?? {}).sort(
        ([a], [b]) => a.localeCompare(b),
      )) {
        if (range === "*" && name.startsWith("@repo/")) continue; // our own workspace packages
        rows.push({
          package: pkg.name,
          name,
          range,
          locked: locked(dir, name),
          kind,
        });
      }
    }
  }
  return rows;
}

/** The quoted requirement strings inside a TOML array such as `dependencies = [ ... ]`. */
function tomlArray(text, key) {
  const m = text.match(new RegExp(`^${key}\\s*=\\s*\\[([\\s\\S]*?)^\\]`, "m"));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
}

function pythonDependencies(root) {
  const rows = [];
  const pyproject = readText(join(root, PYPROJECT));
  if (!pyproject) return rows;
  const project = pyproject.match(/^name\s*=\s*"([^"]+)"/m)?.[1] ?? "python";
  const lock = new Map(
    [
      ...readText(join(root, "uv.lock")).matchAll(
        /\[\[package\]\]\nname = "([^"]+)"\nversion = "([^"]+)"/g,
      ),
    ].map((m) => [m[1].toLowerCase(), m[2]]),
  );
  // Every dependency group is listed under its own name, up to the next section of the file.
  const groups = (pyproject.split(/^\[dependency-groups\]$/m)[1] ?? "").split(/^\[/m)[0];
  const groupNames = [...groups.matchAll(/^([A-Za-z0-9_-]+)\s*=\s*\[/gm)].map((m) => m[1]);
  for (const [reqs, kind] of [
    [tomlArray(pyproject, "dependencies"), "runtime"],
    ...groupNames.map((name) => [tomlArray(groups, name), name]),
  ]) {
    for (const req of reqs) {
      const [, name, range] = req.match(/^([A-Za-z0-9_.\-]+)\s*(.*)$/);
      rows.push({
        project,
        name,
        range: range || "any",
        locked: lock.get(name.toLowerCase()) ?? "not locked",
        kind,
      });
    }
  }
  return rows;
}

/** Manifests of tools downloaded at a pinned version and SHA-256, and the runtimes they need. */
const PINNED_TOOLS = ["backend/verification/pinned-tools.json"];

function pinnedTools(root) {
  return PINNED_TOOLS.flatMap((manifest) => {
    const text = readText(join(root, manifest));
    if (!text) return [];
    const { runtimes: needs = [], tools = [] } = JSON.parse(text);
    return [
      ...needs.map((r) => ({
        name: r.name,
        declared: `${r.requires} (${manifest})`,
        used: "not pinned (the machine's own install)",
      })),
      ...tools.map((t) => ({
        name: t.name,
        declared: `${t.version} (${manifest})`,
        used: `${t.version}, SHA-256 ${t.sha256}`,
      })),
    ];
  });
}

function runtimes(root) {
  const pkg = readJson(join(root, "package.json"));
  const ci = readText(join(root, ".github/workflows/ci.yml"));
  const pyproject = readText(join(root, PYPROJECT));
  const npmVersion =
    (pkg.packageManager ?? "").replace(/^npm@/, "") || "not pinned";
  return [
    {
      name: "Node.js",
      declared: `${pkg.engines?.node ?? "not declared"} (package.json engines)`,
      used: `${ci.match(/node-version:\s*([\w.]+)/)?.[1] ?? "not pinned"} (CI)`,
    },
    {
      name: "npm",
      declared: `${npmVersion} (package.json packageManager)`,
      used: npmVersion,
    },
    {
      name: "Python",
      declared: `${pyproject.match(/requires-python\s*=\s*"([^"]+)"/)?.[1] ?? "not declared"} (${PYPROJECT})`,
      used: `${ci.match(/uv python install ([\d.]+)/)?.[1] ?? "not pinned"} (CI)`,
    },
    {
      name: "uv",
      declared: `${ci.match(/astral-sh\/(setup-uv@[\w.]+)/)?.[1] ?? "not used"} (CI)`,
      used: "latest uv at CI time (not pinned)",
    },
    ...pinnedTools(root),
  ];
}

export function collect(root) {
  return {
    runtimes: runtimes(root),
    npm: npmDependencies(root),
    python: pythonDependencies(root),
  };
}

const table = (head, rows) =>
  [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");

export function render({ runtimes: rt, npm, python }) {
  return [
    "# Dependencies",
    "",
    "Every runtime, tool and library this repo depends on, with the version range each manifest",
    "declares and the exact version the lockfile installs. Generated by `scripts/dependencies.mjs`",
    "from `package.json` / `package-lock.json`, `pyproject.toml` / `uv.lock`,",
    `\`${PINNED_TOOLS}\` and the CI workflow. Do not edit by hand: change the manifest, update the lockfile, then run`,
    "`npm run deps`. CI fails when this file is out of date (`npm run deps:check`).",
    "",
    "## Runtimes and tools",
    "",
    table(
      ["Tool", "Declared", "Used"],
      rt.map((r) => [r.name, r.declared, r.used]),
    ),
    "",
    "## TypeScript packages (npm workspaces)",
    "",
    table(
      ["Package", "Dependency", "Declared", "Installed", "Kind"],
      npm.map((d) => [d.package, d.name, d.range, d.locked, d.kind]),
    ),
    "",
    "## Python: the programme loader and the contract's Python tests",
    "",
    table(
      ["Project", "Dependency", "Declared", "Installed", "Kind"],
      python.map((d) => [d.project, d.name, d.range, d.locked, d.kind]),
    ),
    "",
  ].join("\n");
}

export function isCurrent(root) {
  return readText(join(root, OUT)) === render(collect(root));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (process.argv.includes("--check")) {
    if (!isCurrent(root)) {
      console.error(
        `${OUT} is out of date: run \`npm run deps\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(`${OUT} is current.`);
  } else {
    writeFileSync(join(root, OUT), render(collect(root)));
    console.log(`Wrote ${OUT}.`);
  }
}
