import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { check, heading, repoFiles } from "./claude-ties.mjs";

const OPENING = [
  "# This part",
  "",
  "## What the CLAUDE.md files are",
  "The summary.",
  "",
  "## The rule on who writes the rules (from the host app's CLAUDE.md)",
  "",
  "1. **Claude writes and changes the rules, always from the user's intent.** Rule one's text.",
  "",
  "## The user's specification",
  "",
].join("\n");

/** A repo of the given files, each path with its text. */
const repo = (files) => ({ files: Object.keys(files), read: (path) => files[path] });
const lowest = (rules) => OPENING + rules.join("\n\n") + "\n";
/** A rule with its How line and its File line. */
const rule = (n, sentence, file) => `${n}. **${sentence}** Text.\n   *How:* code alone.\n   *File:* ${file}`;

test("a rule and its file that name each other tie, so neither is listed", () => {
  const r = check(repo({
    "CLAUDE.md": "# Global\n",
    "part/CLAUDE.md": lowest([rule(2, "Steps run in order.", "`runner.ts`")]),
    "part/runner.ts": "// Steps run in order.\nexport {};\n",
    "part/runner.test.ts": "",
    "part/test/more.test.ts": "",
  }));
  assert.deepEqual(r.broken, []);
  assert.deepEqual(r.untiedRules, []);
  assert.deepEqual(r.untiedFiles, []);
});

test("a rule with no How line is broken, even before it is tied", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest(["2. **Steps run in order.** They run.\n   *File:* needed"]),
  }));
  assert.deepEqual(r.broken.map((b) => b.problem), ['the rule "Steps run in order." has no How line']);
});

test("a bold sentence split over two lines is broken, so no rule is silently skipped", () => {
  const r = check(repo({ "part/CLAUDE.md": lowest(["2. **Steps run\n   in order.** They run.\n   *How:* code.\n   *File:* needed"]) }));
  assert.deepEqual(r.broken.map((b) => b.problem), ["a rule's bold sentence does not end on the line it starts"]);
});

test("a rule that names a file that does not exist is a broken tie", () => {
  const r = check(repo({ "part/CLAUDE.md": lowest([rule(2, "Steps run in order.", "`gone.ts`")]) }));
  assert.deepEqual(r.broken.map((b) => b.problem), ["names a file that does not exist"]);
});

test("a file whose heading is not the bold sentence of the rule that names it is a broken tie", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest([rule(2, "Steps run in order.", "`runner.ts`")]),
    "part/runner.ts": "// Runs the steps.\n",
  }));
  assert.deepEqual(r.broken.map((b) => b.problem), ["its heading does not state the bold sentence of the rule that names it"]);
});

test("a file named by two rules is a broken tie", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest([rule(2, "Steps run in order.", "`runner.ts`"), rule(3, "The runner records each step.", "`runner.ts`")]),
    "part/runner.ts": "// Steps run in order.\n",
  }));
  assert.ok(r.broken.some((b) => b.problem === "is named by two rules"));
});

test("a file tied by its own rule and again through a folder another rule names is tied to two rules", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest([rule(2, "Every answer is kept.", "`d/`"), rule(3, "Steps run in order.", "`d/x.ts`")]),
    "part/d/RULE.md": "# Every answer is kept.\n",
    "part/d/x.ts": "// Steps run in order.\n",
  }));
  assert.ok(r.broken.some((b) => b.problem === "is named by two rules"));
});

test("a folder tie that reaches outside its CLAUDE.md's folder is broken, and ties nothing there", () => {
  const r = check(repo({
    "a/CLAUDE.md": lowest([rule(2, "Every answer is kept.", "`../b/`")]),
    "b/RULE.md": "# Every answer is kept.\n",
    "b/x.ts": "// x\n",
  }));
  assert.ok(r.broken.some((b) => b.problem === "is not in the folder of the CLAUDE.md that names it"));
});

test("a file whose heading claims a rule that does not name it is a broken tie", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest([rule(2, "Steps run in order.", "needed")]),
    "part/runner.ts": "// Steps run in order.\n",
  }));
  assert.deepEqual(r.broken.map((b) => b.problem), ["its heading states a rule that does not name it"]);
});

test("only the lowest CLAUDE.md files are tied: a higher one gives direction, and the file below stays untied", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest(["2. **Steps run in order.** Direction only."]),
    "part/sub/CLAUDE.md": lowest([rule(2, "The runner records each step.", "needed")]),
    "part/sub/runner.ts": "// Runs.\n",
  }));
  assert.deepEqual(r.broken, []);
  assert.deepEqual(r.unmarkedRules, []);
  assert.deepEqual(r.untiedRules.map((u) => u.claude), ["part/sub/CLAUDE.md"]);
  assert.deepEqual(r.untiedFiles, ["part/sub/runner.ts"]);
});

test("a folder of data ties through the one short note in it, and its files need no heading", () => {
  const files = {
    "part/CLAUDE.md": lowest([rule(2, "Every word is in one text file.", "`text/`")]),
    "part/text/RULE.md": "# Every word is in one text file.\n",
    "part/text/en.json": "{}",
  };
  assert.deepEqual(check(repo(files)).broken, []);
  assert.deepEqual(check(repo(files)).untiedFiles, []);
  delete files["part/text/RULE.md"];
  assert.deepEqual(check(repo(files)).broken.map((b) => b.problem), ["is a folder of data with no note naming its rule"]);
});

test("every rule and every file not yet tied is listed, and a rule with no mark is listed as not yet marked", () => {
  const r = check(repo({
    "CLAUDE.md": "# Global\n\n## Rules\n\n9. **English only.** Text.\n",
    "part/CLAUDE.md": lowest([
      rule(2, "Steps run in order.", "needed"),
      rule(3, "A security level.", "the whole folder"),
      "4. **The runner records each step.** It records.\n   *How:* code alone.",
    ]),
    "part/runner.ts": "// Runs.\n",
    "loose.ts": "// Loose.\n",
  }));
  assert.deepEqual(r.broken, []);
  assert.deepEqual(r.untiedRules.map((u) => `${u.claude} ${u.sentence}`), ["part/CLAUDE.md Steps run in order."]);
  assert.deepEqual(r.unmarkedRules.map((u) => u.sentence), ["The runner records each step."]);
  assert.deepEqual(r.untiedFiles, ["loose.ts", "part/runner.ts"]);
});

test("a Next.js entry file and a command-line script count with the file they hand over to", () => {
  const r = check(repo({
    "ui/ams/CLAUDE.md": lowest([]),
    "ui/ams/app/(app)/talks/[id]/page.tsx": "export { default } from '@/features/talk';\n",
    "ui/ams/app/layout.tsx": "",
    "ui/ams/app/(app)/error.tsx": "",
    "ui/ams/app/(app)/loading.tsx": "",
    "ui/ams/app/not-found.tsx": "",
    "ui/ams/app/manifest.ts": "",
    "ui/ams/app/api/trpc/[trpc]/route.ts": "",
    "ui/ams/app/global-error.tsx": "",
    "ui/ams/app/icon.svg": "<svg/>",
    "ui/ams/app/apple-icon.png": "",
    "backend/src/cli/sync.ts": "",
    "data/store/src/migrate-cli.ts": "",
    "ui/ams/app/stray.tsx": "// Stray.\n",
  }));
  assert.deepEqual(r.untiedFiles, ["ui/ams/app/stray.tsx"]);
});

test("an index file that only gathers its folder's code is not counted; one with code of its own is", () => {
  const r = check(repo({
    "part/CLAUDE.md": lowest([]),
    "part/index.ts": 'export { a } from "./a";\nexport { b, type B } from "./b";\nexport * from "./c";\nexport type { D } from "./d";\n',
    "part/sub/index.ts": 'export { a } from "./a";\nexport const x = 1;\n',
  }));
  assert.deepEqual(r.untiedFiles, ["part/sub/index.ts"]);
});

test("files that only set up the tools, overviews, docs, tools and the copy of the conference API's contract are not counted", () => {
  const r = check(repo({
    "CLAUDE.md": "# Global\n",
    "package.json": "{}", "package-lock.json": "{}", "turbo.json": "{}", "tsconfig.json": "{}", ".gitignore": "",
    ".npmrc": "", ".python-version": "", "pyproject.toml": "", "uv.lock": "", "DEPENDENCIES.md": "# Deps\n",
    "HOSTING.md": "# Hosting\n", "README.md": "# Readme\n",
    "ui/ams/next.config.js": "", "ui/ams/postcss.config.mjs": "", "ui/ams/eslint.config.js": "", "ui/ams/vitest.config.ts": "",
    "ui/ams/playwright.config.ts": "", "ui/ams/components.json": "{}", "ui/ams/vercel.json": "{}", "ui/ams/next-env.d.ts": "",
    "ui/ams/i18n/request.ts": "", "ui/ams/e2e/ams.e2e.ts": "",
    "docs/plan.md": "# Plan\n", "scripts/deps.mjs": "", "tooling/eslint-config/base.js": "", ".claude/skills/x/SKILL.md": "",
    "backend/verification/run.mjs": "", "backend/verification/pinned-tools.json": "{}",
    "conference-api-contract/src/index.ts": "", ".github/workflows/ci.yml": "",
    "part/runner.ts": "// Runs.\n",
  }));
  assert.deepEqual(r.untiedFiles, ["part/runner.ts"]);
});

test("a file's heading is its first comment line, a SQL file's first comment, or a Markdown file's title", () => {
  assert.equal(heading("a.ts", "// Steps run in order.\n// More.\nexport {};"), "Steps run in order.");
  assert.equal(heading("a.tsx", "/** Steps run in order. */\nexport {};"), "Steps run in order.");
  assert.equal(heading("a.tsx", '"use client";\n\n// Steps run in order.\nexport {};'), "Steps run in order.");
  assert.equal(heading("a.mjs", "// Steps run in order.\nexport {};"), "Steps run in order.");
  assert.equal(heading("a.css", "/* Steps run in order. */\n:root {}"), "Steps run in order.");
  assert.equal(heading("a.md", "# Steps run in order.\n\nText."), "Steps run in order.");
  assert.equal(heading("a.sql", "-- Steps run in order.\ncreate table t ();"), "Steps run in order.");
  assert.equal(heading("a.json", "{}"), null);
  assert.equal(heading("a.ts", "export {};\n// Not a heading."), null);
});

test("the files checked are those in the working tree: a file deleted but not yet committed is left out, a new one is in", () => {
  const dir = mkdtempSync(join(tmpdir(), "ties-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  writeFileSync(join(dir, "kept.ts"), "");
  writeFileSync(join(dir, "gone.ts"), "");
  git("add", ".");
  rmSync(join(dir, "gone.ts"));
  writeFileSync(join(dir, "new.ts"), "");
  assert.deepEqual(repoFiles(dir).sort(), ["kept.ts", "new.ts"]);
});

test("every tie written in this repo holds", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const r = check({ files: repoFiles(root), read: (path) => readFileSync(join(root, path), "utf8") });
  assert.deepEqual(r.broken, []);
});
