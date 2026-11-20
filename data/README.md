# Data layer — where things are

The rules for this part are in this folder's CLAUDE.md. This file says where they are wired up.

| What | Where |
|---|---|
| Postgres schema, migrations, programme loaders, and queries (`@repo/host-store`) | `data/store` |
| AMS 107th Annual Meeting programme (Denver, January 2027) as published so far, public fields only, and how to refresh it | `data/ams2027` |
| GSA Connects 2026 programme and abstracts, public fields only | `data/gsa2026` |
| Programme loader that turns a crawled archive into contract-shaped talks (Python package `gps-data`) | `data/loader` |
| Raw GPS 2026 programme crawl (gitignored, kept only on the machine that crawled it) | `data/gps2026` |

- Database connection: `HOST_DATABASE_URL`. `npm run load --workspace=@repo/host-store -- ams` (or `gsa`) migrates the database and loads that society's programme as published. Running it again puts back the published programme and undoes organiser edits; stars, notes and sign-ins stay.
- `npm run migrate --workspace=@repo/host-store` applies new migrations and loads nothing, so organiser edits stay. Use it on the hosted database (`HOSTING.md`).
- Every connection to a database off this machine uses TLS: `connect()` requires it, and refuses an address that turns it off.
- Each society's current meeting has its own Postgres schema (`ams2027`, `gsa2026`). Sign-in tables are in the `auth` schema.
- The loader is its own Python package. Its tests run from the repository root with `uv run pytest`, which also runs the conference API contract's Python tests.
- UIs never import the store. They reach it through `@repo/host-backend`.
