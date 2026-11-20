# Conference host app

A demo conference system for two societies: AMS (Isobar Meetings) and GSA (Strata Guide). Each has an attendee app, an organiser console and a developer console. The app gets its talk matches from the conference API over HTTP, as any outside conference system would. It has no other link to the conference API.

## Layout

| Folder | What it holds |
| --- | --- |
| `ui/apps/ams`, `ui/apps/gsa` | One Next.js app per society |
| `backend` | `@repo/host-backend`: the tRPC routers, and the client that calls the conference API |
| `data/store` | `@repo/host-store`: the Postgres schema, migrations and programme loaders |
| `data/ams2027`, `data/gsa2026` | Each society's published programme, public fields only |
| `data/loader` | The Python programme loader (`gps-data`) |
| `contracts` | `@repo/host-contracts`: what passes between the host app's parts |
| `conference-api-contract` | `@repo/contracts`: a copy of the conference API's contract, which the backend uses to build and check its calls |
| `tooling` | Shared ESLint and TypeScript settings |

## Connecting to a conference API

Set these in each app's `.env.local` (see the app's README for the full list):

- `CONFERENCE_API_URL`: the API's address.
- `CONFERENCE_API_KEY`: a partner token with `talks:write` and `matches:read` on the society's conference (`ams-2027` or `gsa-2026`).
- `CONFERENCE_API_VERIFY_URL`: the API's public credential verification page.

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

The store and backend database tests run only when `HOST_TEST_DATABASE_URL` and `HOST_BACKEND_TEST_DATABASE_URL` point at a Postgres database. The end-to-end tests (`npm run e2e --workspace=ams`, or `gsa`) need a running conference API with the society's programme sent and matches stored.

## The conference API's contract

`conference-api-contract` is a copy. When the conference API's contract changes, copy the new version here and run the checks. To confirm its generated JSON Schema and OpenAPI files still match its zod source, run `npm run emit --workspace=@repo/contracts`; `git diff` should show nothing.

To put the apps online, follow `HOSTING.md`.
