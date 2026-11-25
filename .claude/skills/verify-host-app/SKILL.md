---
name: verify-host-app
description: Launch the host app's AMS app (Isobar Meetings), with its organiser and developer consoles, against the local conference API, sign in as a test guest, drive real pages in a browser, and save screenshots and ARIA snapshots as proof. Use to prove any user-facing change under  works in the running app, not only in tests.
---

# Verify the host app

The host app has one attendee app, for AMS, with an organiser console at `/organiser` and a developer console at `/developer`. It runs as a production build on this machine, read the local Postgres through `@repo/host-backend`, and get related talks from the conference API at `CONFERENCE_API_URL`. Locally that is the real conference API (`conference-api/backend`) on port 8787, serving placeholder matches.

| Society | App | Folder | Address |
| --- | --- | --- | --- |
| `ams` | Isobar Meetings 2027 (Demo) | `ui/apps/ams` | http://localhost:3001 |

All commands below run from the repository root. `S` stands for `ams`.

## Before the first launch

- Postgres must be running, and the database named in the app's `HOST_DATABASE_URL` must exist. It may be empty. On Rupert's Mac the cluster is `~/pgsql/data` on port 54329: start it with `~/pgsql/bin/pg_ctl -D ~/pgsql/data -l ~/pgsql/data/server.log -o "-p 54329" start`.
- The app needs `ui/apps/S/.env.local`, which git ignores. The app's `README.md` lists its settings. For the local conference API set `CONFERENCE_API_URL=http://127.0.0.1:8787`; launch issues the key, so `CONFERENCE_API_KEY` there is ignored. The conference API needs Postgres with `pgcrypto`. On Rupert's Mac that is a second cluster: start it with `/opt/homebrew/opt/postgresql@18/bin/pg_ctl -D ~/pgsql-api/data -l ~/pgsql-api/server.log -o "-p 54330" start` and set `API_DATABASE_URL=postgres://rupertlim@localhost:54330/postgres`. Without `API_DATABASE_URL` the API's databases go on the host database's server, as in CI.

## Launch

```sh
.claude/skills/verify-host-app/scripts/verify.sh launch S
```

Launch migrates the database and loads the society's programme. When `CONFERENCE_API_URL` points at port 8787, it prepares the conference API (control database, the `host-demo` partner, both conferences, a key for the society's conference that lasts a day, kept in `.verify/run/<society>-conference-api.key`) and starts it if nothing listens there. It then sends the programme, seeds placeholder matches, builds the app and starts it with that key. Every step is safe to repeat. The app is ready when the script prints `READY S http://localhost:PORT`. A first launch takes about a minute, later ones about 20 seconds.

Launch refuses to start when another process holds the app's port. It never drives an app it did not start.

## Doctor

```sh
.claude/skills/verify-host-app/scripts/verify.sh doctor S
```

Run it first whenever anything looks wrong. Every line must start with `ok:`. Doctor checks that the app on the port is the one this skill started, that its sign-in page names the right app, that the store holds the society's talks, and that the conference API answers `matches:search` for a known talk with the app's key. Doctor changes nothing.

## Drive

`look.mts` opens one route in Chromium, runs steps in order, and saves the evidence:

```sh
npx tsx .claude/skills/verify-host-app/scripts/look.mts S <route> <name> [options]
```

| Option | Effect |
| --- | --- |
| `--computer` | Use a 1280×900 window. The default is a 390×844 phone. |
| `--signed-out` | Open the route without signing in. |
| `--click role=name` | Click the first element with that ARIA role and accessible name. |
| `--fill label=text` | Type the text into the field with that label. |
| `--press key` | Press a key, such as `Escape`. |
| `--expect role=name` | Wait up to 10 seconds for that element. If it never appears, the look fails with exit code 1. |

The first signed-in look after a launch signs in a new guest through `signInForTest` in `@repo/host-backend/testing`, the helper the Playwright suites use, and prints `signed in as e2e-…@example.com`. Later looks reuse that guest, so a star or note made in one look shows in the next. A launch or stop forgets the guest.

The recipes for each feature are in [features/README.md](features/README.md).

## Evidence

Each look saves two files in `.verify/evidence/S/`, named `<time>-<name>-<device>`:

- `.png`, a full-page screenshot.
- `.aria.txt`, the final URL followed by the ARIA snapshot of the page.

A proof follows these rules:

- Drive the path a user takes. Never call tRPC or the database to set up the state you then claim to see.
- End each action with `--expect` on the state it should produce. A screenshot taken mid-save can show the old state.
- Prove a change that saves something from a second page. A star shows on `/schedule`, and a note shows on `/notes`.
- Read the `.aria.txt` before you claim what a page shows, and look at the `.png` when layout matters.
- Report the look commands you ran with the files they saved.

## Stop

```sh
.claude/skills/verify-host-app/scripts/verify.sh stop S
```

Stop ends the app's process group, and ends the conference API too once no app started by this skill is left. It never touches processes it did not start. The evidence in `.verify/evidence/` stays. Logs from the last launch are in `.verify/run/`.

## Helpers

| File | What it does |
| --- | --- |
| `scripts/verify.sh` | `launch`, `doctor` and `stop` for one society. |
| `scripts/look.mts` | Opens a route, runs steps, saves the evidence. |
| `scripts/lib.mjs` | The facts about each app (folder, port, name, conference id, schema, a known talk) and the parser for `look.mts`. `node scripts/lib.mjs S port` prints one fact. |
| `scripts/lib.test.mjs` | Tests for `lib.mjs`. They run with `npm run test:scripts`. |

## Gotchas

- The app uses the conference API on port 8787 and the one host database. The key lasts a day: after that, related talks show as unavailable until the next launch.
- `verify.sh launch` builds the app. After editing app code, stop and launch again before you drive it.
- Talk numbers repeat in AMS (several talks are numbered J1.2), and 197 of its 4,531 programme entries (162 of them breaks) have no number. Open talks by id, such as `/talks/493803`, not by number.
- Times show in the meeting's time zone by default: Mountain. The `MST` button in the top bar switches to the device's zone.
- The matches are placeholders (each talk matches the next three, and says so). Check that the related-talks panel fills and links to real talks, not that the matches are good.
- Google sign-in is not set up locally. The sign-in page says so, and looks sign in through the test helper instead.
