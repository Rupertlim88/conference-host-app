// Checks the ties between the rules of every lowest-level CLAUDE.md and the files that carry them out, as the host
// app's rules on one rule per file, on each file's heading, on how each rule is done and on the check of every tie
// ask. It fails on a tie that does not hold or a rule with no How line, and lists every rule and file not yet tied.
//
// A lowest-level CLAUDE.md is one with no CLAUDE.md below its folder. A rule names its file by a line in the rule,
// `*File:* \`path\``, the path from the CLAUDE.md's folder; a path that ends in `/` is a folder that stands as one file,
// whose note RULE.md opens with the heading for everything in it; `*File:* the whole folder` marks a rule that covers
// its whole folder; `*File:* needed` marks a rule not yet tied. Every rule also has a `*How:*` line. A file's heading is
// its first comment line (after any "use client" line), a SQL file's first comment, or a Markdown file's title.
//
// Not counted: a file's own tests, an entry point that only hands over to one file (Next.js's page, layout, error,
// not-found, route and manifest files, and command-line scripts), files that only set up the tools, overviews, the
// docs, the tools themselves and the copy of the conference API's contract.
//
//     node scripts/claude-ties.mjs            the broken ties, and how many rules and files are not yet tied or marked
//     node scripts/claude-ties.mjs --list     the same, with every rule and file not yet tied, and every rule not marked
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const WHOLE_FOLDER = "the whole folder";
const NEEDED = "needed";
const NOTE = "RULE.md";
/** The copied opening of every CLAUDE.md, whose rules are not tied. */
const OPENING = /^## (What the CLAUDE\.md files are|The rule on who writes the rules|Rules about the CLAUDE\.md files)/;

const folderOf = (path) => (posix.dirname(path) === "." ? "" : posix.dirname(path));
const inside = (path, folder) => folder === "" || path.startsWith(`${folder}/`);

/** A file's own tests, and anything that only supports tests, go with the file they test. */
function isTest(path) {
  return /(^|\/)(tests?|__tests__|e2e)\//.test(path) || /\.(test|spec|e2e)\.[cm]?[jt]sx?$/.test(posix.basename(path));
}

/** An entry point that only hands over to one file: Next.js's own files in a UI's app folder, and command-line
 *  scripts. It counts with the file it hands over to, as a test does. */
function isEntryPoint(path) {
  return (
    /(^|\/)app\/(.+\/)?(page|layout|error|not-found|route|manifest)\.[jt]sx?$/.test(path) ||
    /(^|\/)cli\/[^/]+\.[cm]?ts$/.test(path) ||
    /-cli\.[cm]?ts$/.test(path)
  );
}

/** Files that only set up the tools: settings, manifests, lockfiles, ignore lists, generated lists. */
const SETUP =
  /^(\.git(ignore|attributes)|\.npmrc|\.python-version|pyproject\.toml|uv\.lock|package(-lock)?\.json|tsconfig(\..+)?\.json|turbo\.json|components\.json|vercel\.json|next-env\.d\.ts|.+\.config\.[cm]?[jt]s|DEPENDENCIES\.md)$/;
/** Folders that hold the tools, the docs, or a copy of another product's code. */
const NOT_COUNTED_FOLDERS = /^(docs|scripts|tooling|\.claude|\.github|backend\/verification|conference-api-contract)\//;

/** An index file that only gathers its folder's code for other code to use: nothing in it but re-exports. */
const onlyGathers = (path, text) =>
  /(^|\/)index\.[cm]?[jt]s$/.test(path) &&
  text.split("\n").every((l) => l.trim() === "" || /^export (\*|\{[^}]*\}) from ["'][^"']+["'];?$/.test(l.trim()));

function notCounted(path) {
  const name = posix.basename(path);
  return (
    name === "CLAUDE.md" ||
    name === "README.md" ||
    name === "HOSTING.md" ||
    SETUP.test(name) ||
    NOT_COUNTED_FOLDERS.test(path) ||
    /(^|\/)i18n\/request\.ts$/.test(path) ||
    isTest(path) ||
    isEntryPoint(path)
  );
}

/** The heading a file opens with: its first comment line, a SQL file's first comment, or a Markdown file's title. */
export function heading(path, text) {
  const lines = text.split("\n");
  if (/\.([cm]?[jt]sx?|css)$/.test(path)) {
    const first = lines.findIndex((l) => l.trim() !== "" && !/^["']use (client|server)["'];?$/.test(l.trim()));
    const m = first >= 0 && lines[first].match(/^\s*(?:\/\/|\/\*\*?)\s*(.*?)\s*(?:\*\/)?\s*$/);
    return m && m[1] ? m[1] : null;
  }
  if (path.endsWith(".sql")) {
    const m = (lines[0] || "").match(/^--\s*(.*\S)\s*$/);
    return m ? m[1] : null;
  }
  if (path.endsWith(".md")) {
    const m = (lines[0] || "").match(/^#\s+(.*\S)\s*$/);
    return m ? m[1] : null;
  }
  return null;
}

/** The rules of a CLAUDE.md's own specification: each top-level rule's bold sentence, whether it says how it is done,
 *  and the file it names. */
export function rules(text) {
  const out = [];
  let copied = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) copied = OPENING.test(line);
    if (copied) continue;
    if (/^\d+\. \*\*/.test(line) && !/^\d+\. \*\*.+?\*\*/.test(line)) {
      out.push({ sentence: line.replace(/^\d+\. \*\*/, "").trim(), file: null, how: false, split: true });
      continue;
    }
    const found = line.match(/^(\d+)\. \*\*(.+?)\*\*/);
    if (found) {
      out.push({ sentence: found[2].trim(), file: null, how: false });
      continue;
    }
    const last = out[out.length - 1];
    if (!last) continue;
    if (/^\s*\*How:\*\s*\S/.test(line)) last.how = true;
    const tie = line.match(/^\s*\*File:\*\s*(?:`([^`]+)`|(the whole folder|needed)\s*$)/);
    if (tie) last.file = tie[1] || tie[2];
  }
  return out;
}

/** The files of the working tree: those git tracks and the new ones it does not ignore, without any deleted but not
 *  yet committed. */
export function repoFiles(root) {
  const listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  return [...new Set(listed.split("\n").filter(Boolean))].filter((f) => existsSync(join(root, f)));
}

/** The broken ties, and every rule and file not yet tied, in a repo of these files. */
export function check({ files, read }) {
  const claudes = files.filter((f) => posix.basename(f) === "CLAUDE.md");
  const folders = claudes.map(folderOf);
  const isLowest = (c) => !folders.some((f) => f !== folderOf(c) && inside(f, folderOf(c)));
  const closest = (path) =>
    claudes.filter((c) => inside(path, folderOf(c))).sort((a, b) => folderOf(b).length - folderOf(a).length)[0];
  const known = new Set(files);
  const broken = [];
  const untiedRules = [];
  const unmarkedRules = [];
  const tied = new Map();
  const fail = (claude, sentence, file, problem) => broken.push({ claude, rule: sentence, file, problem });

  for (const claude of claudes.filter(isLowest)) {
    for (const rule of rules(read(claude))) {
      if (rule.split) {
        fail(claude, rule.sentence, claude, "a rule's bold sentence does not end on the line it starts");
        continue;
      }
      if (!rule.how) fail(claude, rule.sentence, claude, `the rule "${rule.sentence}" has no How line`);
      if (rule.file === null || rule.file === NEEDED) {
        (rule.file === null ? unmarkedRules : untiedRules).push({ claude, sentence: rule.sentence });
        continue;
      }
      if (rule.file === WHOLE_FOLDER) continue;
      const path = posix.join(folderOf(claude), rule.file);
      if (tied.has(path)) fail(claude, rule.sentence, path, "is named by two rules");
      tied.set(path, { claude, sentence: rule.sentence });
      if (path.endsWith("/")) {
        const note = path + NOTE;
        if (!known.has(note)) fail(claude, rule.sentence, path, "is a folder of data with no note naming its rule");
        else if (heading(note, read(note)) !== rule.sentence)
          fail(claude, rule.sentence, path, "its note does not state the bold sentence of the rule that names it");
      } else if (!known.has(path)) fail(claude, rule.sentence, path, "names a file that does not exist");
      else if (closest(path) !== claude) fail(claude, rule.sentence, path, "is not in the folder of the CLAUDE.md that names it");
      else if (heading(path, read(path)) !== rule.sentence)
        fail(claude, rule.sentence, path, "its heading does not state the bold sentence of the rule that names it");
    }
  }

  const tiedFolders = [...tied.keys()].filter((p) => p.endsWith("/"));
  const untiedFiles = [];
  for (const file of files.filter((f) => !notCounted(f) && !onlyGathers(f, read(f))).sort()) {
    if (tied.has(file) || tiedFolders.some((d) => file.startsWith(d))) continue;
    const owner = closest(file);
    const claims = owner && isLowest(owner) && heading(file, read(file));
    if (claims && rules(read(owner)).some((r) => r.sentence === claims))
      fail(owner, claims, file, "its heading states a rule that does not name it");
    else untiedFiles.push(file);
  }
  return { broken, untiedRules, unmarkedRules, untiedFiles };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const r = check({ files: repoFiles(root), read: (path) => readFileSync(join(root, path), "utf8") });
  for (const b of r.broken) console.log(`BROKEN  ${b.file}: ${b.problem} (${b.claude}: "${b.rule}")`);
  console.log(
    `${r.broken.length} broken ties; ${r.untiedRules.length} rules needing a file and ${r.untiedFiles.length} files not yet tied; ` +
      `${r.unmarkedRules.length} rules not yet marked`,
  );
  if (process.argv.includes("--list")) {
    for (const u of r.untiedRules) console.log(`rule not yet tied  ${u.claude}: ${u.sentence}`);
    for (const u of r.unmarkedRules) console.log(`rule not yet marked  ${u.claude}: ${u.sentence}`);
    for (const f of r.untiedFiles) console.log(`file not yet tied  ${f}`);
  }
  process.exitCode = r.broken.length ? 1 : 0;
}
