# Conference host app

A demo conference system for the American Meteorological Society's 2027 Annual Meeting: Isobar Meetings, with an attendee app, an organiser console and a developer console. The app gets its talk matches from the conference API over HTTP, as any outside conference system would. It has no other link to the conference API.

## What it needs to run by itself

This repo began as a copy of the host app from ConferenceApp. These were added so it runs by itself:

- a copy of the conference API's contract;
- the shared lint and TypeScript settings;
- the npm and Turborepo setup, with the same package versions as ConferenceApp;
- file paths fixed for the new layout.

## Layout

| Folder | What it holds |
| --- | --- |
| `ui/apps/ams` | The AMS app, in Next.js |
| `backend` | `@repo/host-backend`: the tRPC routers, and the client that calls the conference API |
| `data/store` | `@repo/host-store`: the Postgres schema, migrations and the programme loader |
| `data/programmes/ams2027` | AMS's published programme, public fields only |
| `contracts` | `@repo/host-contracts`: what passes between the host app's parts |
| `conference-api-contract` | `@repo/contracts`: a copy of the conference API's contract, which the backend uses to build and check its calls |
| `tooling` | Shared ESLint and TypeScript settings |

## Connecting to a conference API

Set these in the app's `.env.local` (see the app's README for the full list):

- `CONFERENCE_API_URL`: the API's address.
- `CONFERENCE_API_KEY`: a key for the conference `ams-2027` from the conference API's `issue-key` command.

Then send the programme to the API:

```bash
npm run load --workspace=@repo/host-store -- ams
npm run sync --workspace=@repo/host-backend
```

## Checks

```bash
npm ci
npm run boundaries && npm run lint && npm run check-types && npm run test
npm run test:scripts && npm run deps:check
uv run pytest
```

The store and backend database tests run only when `HOST_TEST_DATABASE_URL` and `HOST_BACKEND_TEST_DATABASE_URL` point at a Postgres database. The end-to-end tests (`npm run e2e --workspace=ams`) need a running conference API with the society's programme sent and matches stored.

## The conference API's contract

`conference-api-contract` is a copy. When the conference API's contract changes, copy the new version here and run the checks. To confirm its generated JSON Schema and OpenAPI files still match its zod source, run `npm run emit --workspace=@repo/contracts`; `git diff` should show nothing.

To put the app online, follow `HOSTING.md`.

`docs/parked-rules.md` holds rules deleted from the CLAUDE.md files that are not used in this version. Nothing in it is in force.
