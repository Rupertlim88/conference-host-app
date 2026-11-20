#!/usr/bin/env node
/**
 * Model-checks the programme send's run log (SendRuns.tla) with TLC, the TLA+ model checker.
 *
 *   node backend/verification/run.mjs              run every check (a few seconds)
 *   node backend/verification/run.mjs --only NAME  run one check
 *   node backend/verification/run.mjs --install    download the pinned tla2tools.jar (2 MB)
 *
 * The model's Deadline and StaleAfter are read from the code: SEND_DEADLINE_MS in backend/src/send.ts
 * and STALE_AFTER_MINUTES in data/store/src/sync-log.ts. Each check expects one outcome. "holds": TLC
 * finds no error. "witness" and "mutant": TLC must report the named property violated. A witness shows that
 * something the design allows can happen; a mutant is a copy of the model, or of the code's constants, with one
 * deliberate break that its property must catch. TLC's full output for each check goes to .out/NAME.txt.
 * Exit code 0 means every check came out as expected.
 */
import { spawnSync } from "node:child_process";
import console from "node:console";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const MODEL = "SendRuns.tla";
const OUT = join(HERE, ".out");
const TLA = JSON.parse(readFileSync(join(HERE, "pinned-tools.json"), "utf8")).tools.find((t) => t.id === "tla2tools");
const CACHE = join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "conference-app");
const JAR = join(CACHE, `tla2tools-${TLA.version}.jar`);

/** The model's timing constants, in minutes, read from the code they stand for. */
function codeConstants() {
  const read = (file, pattern, name) => {
    const m = readFileSync(join(ROOT, file), "utf8").match(pattern);
    if (!m) fail(`Could not read ${name} from ${file}. The check takes the model's constants from the code; update run.mjs.`);
    return Number(m[1]);
  };
  return {
    Deadline: read("backend/src/send.ts", /export const SEND_DEADLINE_MS = (\d+) \* 60_000;/, "SEND_DEADLINE_MS"),
    StaleAfter: read("data/store/src/sync-log.ts", /export const STALE_AFTER_MINUTES = (\d+);/, "STALE_AFTER_MINUTES"),
  };
}

/** Each mutant's edits are [text in SendRuns.tla, its replacement]; each text must occur once. */
const checks = [
  { name: "safety", expect: "holds", about: "properties 1-4; 3 senders" },
  { name: "recovery-after-crash", expect: "witness", property: "NoRecoveryAfterCrash",
    about: "after a sender crashes, a later send can still start and finish" },
  { name: "mutant-insert-ignores-running-row", expect: "mutant", property: "OneSenderAtATime",
    about: "start inserts a running row even while another runs (no partial unique index)",
    edits: [[String.raw`/\ IF \E r \in 1..Len(runs) : Running(r)`, String.raw`/\ IF FALSE`]] },
  { name: "mutant-finish-ignores-state", expect: "mutant", property: "FinishedRunsStayFinished",
    about: "finish and fail update the row without requiring state = 'running'",
    edits: [[`runs' = IF runs[mine[s]].state = "running"`, `runs' = IF TRUE`]] },
  { name: "mutant-no-deadline", expect: "mutant", property: "SendingOwnsTheRunningRow",
    about: "writes to the API are not aborted at the deadline",
    edits: [[String.raw`/\ \A s \in Senders : pc[s] = "sending" => left[s] > 0`, String.raw`/\ TRUE`]] },
  { name: "mutant-deadline-as-long-as-stale", expect: "mutant", property: "SendingOwnsTheRunningRow",
    about: "SEND_DEADLINE_MS raised to STALE_AFTER_MINUTES",
    constants: (c) => ({ ...c, Deadline: c.StaleAfter }) },
];

const sha256 = (data) => createHash("sha256").update(data).digest("hex");

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

function install() {
  mkdirSync(CACHE, { recursive: true });
  const part = `${JAR}.part`;
  console.log(`Downloading ${TLA.url}`);
  const curl = spawnSync("curl", ["-fsSL", "--retry", "3", "--proto", "=https", "-o", part, TLA.url], { stdio: "inherit" });
  if (curl.status !== 0) fail(`The download failed (curl exit ${curl.status ?? curl.error?.message}).`);
  const actual = sha256(readFileSync(part));
  if (actual !== TLA.sha256) {
    rmSync(part, { force: true });
    fail(`Refused: the download's SHA-256 is ${actual}, but pinned-tools.json pins ${TLA.sha256}.`);
  }
  renameSync(part, JAR);
  console.log(`Installed tla2tools.jar ${TLA.version} at ${JAR} (SHA-256 checked).`);
}

function checkJar() {
  if (!existsSync(JAR))
    fail(
      `tla2tools.jar ${TLA.version} is not installed. It is a 2 MB download from GitHub. ` +
        `With the user's go, run: node backend/verification/run.mjs --install`,
    );
  const actual = sha256(readFileSync(JAR));
  if (actual !== TLA.sha256)
    fail(`Refused: ${JAR} has SHA-256 ${actual}, not the pinned ${TLA.sha256}. Delete it and run --install again.`);
}

function javaMajor() {
  const java = spawnSync("java", ["-version"], { encoding: "utf8" });
  const version = `${java.stderr ?? ""}${java.stdout ?? ""}`.match(/version "(\d+)(?:\.(\d+))?/);
  if (!version) fail("Java was not found. TLC needs Java 11 or later on the PATH.");
  const major = version[1] === "1" ? Number(version[2]) : Number(version[1]);
  if (major < 11) fail(`TLC needs Java 11 or later; found Java ${major}.`);
  return major;
}

function modelFor(check) {
  let text = readFileSync(join(HERE, MODEL), "utf8");
  for (const [from, to] of check.edits ?? []) {
    const count = text.split(from).length - 1;
    if (count !== 1) return { missing: from, count };
    text = text.replace(from, () => to);
  }
  return { text };
}

/** Properties checked over steps, not states. */
const ACTION = new Set(["FinishedRunsStayFinished"]);

function configFor(check, constants) {
  const values = check.constants ? check.constants(constants) : constants;
  let text = readFileSync(join(HERE, "SendRuns.cfg"), "utf8").replace(
    /^(\s*Senders = .*)$/m,
    (line) => `${line}\n    Deadline = ${values.Deadline}\n    StaleAfter = ${values.StaleAfter}`,
  );
  if (check.property) {
    const head = text.split(/^(?:INVARIANTS?|PROPERTY|PROPERTIES)\b/m)[0];
    text = `${head}${ACTION.has(check.property) ? "PROPERTY" : "INVARIANT"} ${check.property}\n`;
  }
  return { text, values };
}

function verdict(output) {
  if (/Model checking completed\. No error has been found\./.test(output)) return { result: "holds" };
  const violated = output.match(/Error: (?:Invariant|Action property) (\w+) is violated/);
  if (violated) return { result: "violated", property: violated[1] };
  return { result: "error" };
}

function runTlc(model, config) {
  const dir = mkdtempSync(join(tmpdir(), "send-runs-"));
  try {
    writeFileSync(join(dir, MODEL), model);
    writeFileSync(join(dir, "check.cfg"), config);
    const tlc = spawnSync(
      "java",
      ["-XX:+UseParallelGC", `-Djava.io.tmpdir=${dir}`, "-cp", JAR, "tlc2.TLC", "-nowarning",
       "-workers", String(availableParallelism()), "-metadir", join(dir, "states"), "-config", "check.cfg", MODEL],
      { cwd: dir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    return `${tlc.stdout ?? ""}${tlc.stderr ?? ""}`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const advice = {
  holds: "The model of the current code breaks a property. Read the counterexample with /statechart, then check each step against the code before calling it a bug.",
  witness: "Recovery after a crash is no longer possible in the model. Check whether start still marks old running rows interrupted.",
  mutant: "The property did not catch this deliberate break, so it can no longer fail as it should. Fix the property or the model.",
};

function main(args) {
  if (args.includes("--install")) return install();
  checkJar();
  const java = javaMajor();
  const constants = codeConstants();
  const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
  const selected = only ? checks.filter((c) => c.name === only) : checks;
  if (selected.length === 0) fail(`No check named ${only}. Checks: ${checks.map((c) => c.name).join(", ")}`);
  mkdirSync(OUT, { recursive: true });
  console.log(`TLC from tla2tools.jar ${TLA.version} (SHA-256 checked), Java ${java}.`);
  console.log(`From the code: SEND_DEADLINE_MS = ${constants.Deadline} minutes, STALE_AFTER_MINUTES = ${constants.StaleAfter}.`);

  const surprises = [];
  selected.forEach((check, i) => {
    process.stdout.write(`[${i + 1}/${selected.length}] ${check.name}: ${check.about} ... `);
    const { text: model, missing, count } = modelFor(check);
    if (missing !== undefined) {
      console.log(`NOT AS EXPECTED: the text this mutant breaks occurs ${count} times in ${MODEL}, not once`);
      surprises.push({ check, record: { result: "stale-mutant", missing } });
      return;
    }
    const { text: config } = configFor(check, constants);
    const started = Date.now();
    const output = runTlc(model, config);
    writeFileSync(join(OUT, `${check.name}.txt`), output);
    const found = [...output.matchAll(/([\d,]+) distinct states found/g)].pop()?.[1];
    const record = { ...verdict(output), states: found ?? "?", seconds: Math.round((Date.now() - started) / 1000) };
    const ok = check.expect === "holds" ? record.result === "holds" : record.result === "violated" && record.property === check.property;
    const what = { holds: "holds", violated: `violates ${record.property}`, error: "TLC stopped without a verdict" }[record.result];
    console.log(`${what}, ${ok ? "as expected" : "NOT AS EXPECTED"} (${record.states} states, ${record.seconds}s)`);
    if (!ok) surprises.push({ check, record });
  });

  if (surprises.length === 0) {
    console.log(`All ${selected.length} checks came out as expected.`);
    return;
  }
  for (const { check, record } of surprises) {
    if (record.result === "stale-mutant") {
      console.log(`\n${check.name}: the model changed where this mutant breaks it. Rewrite its edit in run.mjs`);
      console.log(`so it makes the same break in the new text. It looked for:\n${record.missing}`);
      continue;
    }
    console.log(`\n${check.name}: TLC's output is in ${join(OUT, `${check.name}.txt`)}`);
    console.log(record.result === "error" ? "TLC reported a parse, config or runtime error, not a verdict. Fix that first." : advice[check.expect]);
  }
  process.exit(1);
}

main(process.argv.slice(2));
