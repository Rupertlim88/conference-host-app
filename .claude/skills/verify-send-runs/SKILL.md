---
name: verify-send-runs
description: Use when a change touches how the host app sends a programme to the conference API, or its run log: backend/src/send.ts (sendProgramme, SEND_DEADLINE_MS), the deadline or signal in syncProgramme (also backend/src/send.ts) or conferenceApi.writeTalks (backend/src/matching-api.ts), data/store/src/sync-log.ts (start, finish, fail, STALE_AFTER_MINUTES), or the sync_runs table and its index sync_runs_one_running. Model-checks "two sends never write at once" with TLA+ (TLC) and runs the database tests that tie the model to the code.
---

# Verify the programme send's run log

Organisers press Send programme, and the CLI runs `npm run sync`. Each send writes the whole programme to the conference API under its own sync name and completes it, so the API withdraws whatever that send left out. Two sends writing at once would race to decide which talks the API keeps. The run log in `sync_runs` allows one send at a time. This check covers every order of steps for three senders. It runs TLC, the TLA+ model checker, on `backend/verification/SendRuns.tla`, a model with one step per SQL statement or per phase of `sendProgramme`.

## Coverage record

| File | What the model covers |
| --- | --- |
| `backend/src/send.ts` | `sendProgramme`: the deadline signal made before `log.start()`, the refusal when start returns null, `log.finish` or `log.fail` after the writes; `SEND_DEADLINE_MS` |
| `backend/src/send.ts` | `syncProgramme` passing the signal to every write, and `NothingToSend`, thrown before any write when no talk can be sent (one of the failures `ApiDone` covers) |
| `backend/src/matching-api.ts` | `writeTalks` aborting on the caller's signal |
| `data/store/src/sync-log.ts` | `start` (mark stale runs interrupted, then insert ... on conflict do nothing), `finish` and `fail` (update only `where state = 'running'`); `STALE_AFTER_MINUTES` |
| `data/store/src/schema.ts`, `data/store/drizzle/0004_send_runs.sql` | table `sync_runs` and the partial unique index `sync_runs_one_running` |

Any later migration that changes `sync_runs` or its indexes is covered code too.

**Sync commit: `bdc0f7f52ad90cb8988798af476fc117581ea2b7`.** At this commit the model was confirmed to describe the code above. Move it forward only after you have read the covered code at the new commit and confirmed that the model still describes it, or updated the model so it does, and both commands below come out as expected.

## 1. Check whether your change touches the verified code

```sh
git diff bdc0f7f52ad90cb8988798af476fc117581ea2b7 -- backend/src/send.ts backend/src/matching-api.ts data/store/src/sync-log.ts data/store/src/schema.ts data/store/drizzle/
rg -n "sync_runs|syncRuns|createSyncLog|sendProgramme|SEND_DEADLINE_MS|STALE_AFTER_MINUTES" host-app --glob '!**/node_modules/**'
```

The first command shows every change to the covered files since the sync commit, including ones not yet committed. The second finds new callers or writers. The change touches the verified code if it changes the order of steps in `sendProgramme`, what `start`, `finish` or `fail` write or require, the two constants, the index, or whether a write gets the signal. A new caller of `sendProgramme`, such as a router procedure, does not, as long as it does not write `sync_runs` itself.

## 2. Run the check

```sh
npm run verify:sends --workspace=@repo/host-backend
HOST_TEST_DATABASE_URL=postgres://... npx vitest run --root data/store test/sync-log.db.test.ts
HOST_BACKEND_TEST_DATABASE_URL=postgres://... npx vitest run --root backend test/send.db.test.ts
```

The first command runs TLC in a few seconds. It reads `SEND_DEADLINE_MS` and `STALE_AFTER_MINUTES` from the code, so changing either number changes what is checked. It needs Java 11 or later and `tla2tools.jar` 1.7.4. If the jar is missing, the run stops and says so. Installing it is a 2 MB download from GitHub, and the project rules require the user's go for downloads, so ask first. Then run `node backend/verification/run.mjs --install`, which checks the SHA-256 pinned in `backend/verification/pinned-tools.json`. The jar is shared with the conference API's queue check, in `~/.cache/conference-app/`.

The two database tests tie the model's steps to the code. They need an empty Postgres database each. On Rupert's Mac they are `postgres://rupertlim@localhost:54329/host_app_test` and `.../host_app_test_backend`, on the cluster started by `~/pgsql/bin/pg_ctl -D ~/pgsql/data -l ~/pgsql/data/server.log -o "-p 54329" start`.

## 3. Read the result

A good TLC run ends with `All 6 checks came out as expected.` and exits with code 0. Each check expects one outcome:

| Check | Expected | Meaning |
| --- | --- | --- |
| `safety` | holds | properties 1 to 4 for 3 senders |
| `recovery-after-crash` | violated | witness: after a sender crashes, a later send can still start and finish |
| `mutant-insert-ignores-running-row` | violated | start without the partial unique index lets two senders write at once |
| `mutant-finish-ignores-state` | violated | finish without `state = 'running'` turns an interrupted run into a sent one |
| `mutant-no-deadline` | violated | without the deadline, a slow sender is taken over while it still writes |
| `mutant-deadline-as-long-as-stale` | violated | a deadline as long as the stale threshold leaves no margin |

TLC's full output for each check is in `backend/verification/.out/NAME.txt`. Read every result with the pstack `/statechart` skill when it can run here. It tells a violation as the shortest path in plain words. Otherwise read the trace in the `.out` file: each state lists `runs` (each row's state and age in minutes), `pc` (each sender's phase), `mine` (its row) and `left` (minutes before its deadline).

`NOT AS EXPECTED` means one of four things:

- `safety` is violated. The model of the current code breaks a property. Go to step 4.
- The witness holds. Recovery after a crash is gone: check that `start` still marks old running rows interrupted.
- A mutant holds. Its property can no longer fail as it should. Fix the property or the model. Do not weaken the mutant until it passes.
- A mutant's text is missing from the model. The model changed. See step 5.

`TLC stopped without a verdict` is a parse, config or runtime error in the model, not a result. `Could not read SEND_DEADLINE_MS` means a constant's line changed shape: update the pattern in `run.mjs` to read it.

The database tests must all pass. `of ten starts at the same moment, exactly one gets a run` proves the index decides races, as the model's `Insert` step assumes. `a late finish leaves an interrupted run interrupted` proves the guard the model's `Finish` step has. `stops writing at its deadline` proves writes stop on the signal, as `Tick` assumes.

## 4. Tell a real bug from a modelling error

Walk the counterexample on the code, one TLC step per row of this table, and check that each step does what the trace says.

| TLC step | Code |
| --- | --- |
| `MarkStale` | `sendProgramme` makes the deadline signal, then `log.start()` runs `update sync_runs set state = 'interrupted' ... where state = 'running' and started_at < now() - STALE_AFTER_MINUTES` |
| `Insert` | `log.start()` runs `insert into sync_runs ... on conflict do nothing returning id`; no row means `SendRunning` |
| `ApiDone` | `syncProgramme` returns or throws: every part answered, one failed, or the signal aborted a write |
| `Finish` | `log.finish` or `log.fail`: `update sync_runs ... where id = $run and state = 'running'` |
| `Crash` | the process ends: Vercel stops the function, or the CLI's machine stops |
| `Tick` | a minute passes |

If every step matches the code, it is a real bug. Report it as the sequence of steps in these words, with the harm in one sentence. Do not weaken the property or the model to make it pass. If a step does something else in the code, the model is wrong. Fix the model to match, and say what was wrong.

## 5. Update the verification for an intended change

1. Change the action in `SendRuns.tla` that mirrors the code you changed. One SQL statement stays one step. Point its comment at the code.
2. Change a property only when the promise changed on purpose, with evidence such as a rule in a CLAUDE.md, the function's comment, the tests or the commit message. Write down the old and new wording.
3. Rerun. A mutant whose text no longer occurs exactly once in the model reports `NOT AS EXPECTED` and prints the text it looked for. Rewrite its edit in `run.mjs` so it makes the same break in the new text.
4. Break the new code the way its property guards against, and confirm a check fails. Then drop the break.
5. Update this skill: the coverage record, the checks, the bounds and the sync commit.

For changes that reached the covered code without this skill, use the pstack `/maintain-formal-verification-skill` skill.

## Properties

| # | Property | Harm if broken | TLA+ name |
| --- | --- | --- | --- |
| 1 | At most one sender writes the programme to the API at any moment. | Two sends race to complete their syncs, and the API keeps or withdraws talks by whichever finished last. | `OneSenderAtATime` |
| 2 | While a sender writes, its own row is the running one. | A later send takes over a send that is still writing, which breaks property 1. | `SendingOwnsTheRunningRow` |
| 3 | At most one row is running. | The console shows two sends running, and the log no longer says which result counts. | `OneRunningRow` |
| 4 | A row that is no longer running never changes again. | A late finish turns an interrupted run into a sent one, and the log says a send succeeded when another took over. | `FinishedRunsStayFinished` |

## Scope and assumptions

- **Bounds:** 3 senders, each trying one send; time in whole minutes, with ages counted up to the stale threshold. The model leans the unsafe way on both sides of each minute: a run counts as stale a minute early, and a sender may write a minute past its deadline.
- **One clock:** `started_at` and the stale test both use Postgres's `now()`. The sender's deadline timer runs at the same rate as that clock. A server clock that runs fast or slow by minutes breaks this.
- **Not covered:** what the conference API does with a write after the host app stops waiting for it (the API has its own lock, checked by `verify-matching-queue`); liveness, such as whether a send eventually finishes; the console's UI.
