# UIs — where things are

The rules for this part are in this folder's CLAUDE.md. This file says where they are wired up.

| What | Where |
|---|---|
| One app per UI | `ui/apps/<ui>`: `ams` (Isobar Meetings) |
| The AMS app's code, one file per rule in each folder's CLAUDE.md | `ui/apps/ams/shared` (what every screen uses), `base` (AMS's meeting app as AMS has it), `improvements` (Our improvements), `versions` (the switch and the gold change points), `consoles` (organiser and developer) |
| Each app's shadcn/ui components | `ui/apps/<ui>/shared/ui` |
| Each app's theme tokens | `ui/apps/<ui>/shared/theme.css` |
| Each app's English text | `ui/apps/<ui>/shared/text/en.json` |
| The files Next.js needs, each handing over to one file | `ui/apps/<ui>/app` |

- Every app is self-contained. Two apps never share components, styles, or helpers, so each app keeps its own copy.
- Add a missing shadcn primitive to one app from the repo root: `npx shadcn@latest add <name> -c ui/apps/<ui>`.
- An app reaches data only through `@repo/host-backend`. The shared lint config `tooling/eslint-config/next.js` rejects imports of `@repo/host-store`, `drizzle-orm`, and `postgres`.
- Next.js here has breaking changes from older versions. Its own guides are in `node_modules/next/dist/docs/`, resolved from the app's folder, because in this monorepo `next` may not be visible from the repo root.
