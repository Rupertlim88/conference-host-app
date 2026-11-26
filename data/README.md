# Data layer — where things are

The rules for this part are in this folder's CLAUDE.md. This file says where they are wired up.

| What | Where |
|---|---|
| Postgres schema, migrations, the programme loader, and queries (`@repo/host-store`) | `data/store` |
| AMS 107th Annual Meeting programme (Denver, January 2027) as published so far, public fields only, and how to refresh it | `data/programmes/ams2027` |

- Database connection: `HOST_DATABASE_URL`. `npm run load --workspace=@repo/host-store -- ams` migrates the database and loads AMS's whole programme as published; the demo holds the latest test set's talks, or a sample until a tester sends one. Running it again puts back the published programme and undoes organiser edits; stars, notes and sign-ins stay.
- `npm run migrate --workspace=@repo/host-store` applies new migrations and loads nothing, so organiser edits stay. Use it on the hosted database (`HOSTING.md`).
- Every connection to a database off this machine uses TLS: `connect()` requires it, and refuses an address that turns it off.
- The meeting has its own Postgres schema (`ams2027`). Sign-in tables are in the `sign_in` schema.
- UIs never import the store. They reach it through `@repo/host-backend`.
