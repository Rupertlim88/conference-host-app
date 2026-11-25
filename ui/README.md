# UIs — where things are

The rules for this part are in this folder's CLAUDE.md. This file says where they are wired up.

| What | Where |
|---|---|
| One app per UI | `ui/apps/<ui>`: `ams` (Isobar Meetings) |
| Each app's features, one file per rule in its features CLAUDE.md | `ui/apps/<ui>/features` |
| Each app's shadcn/ui components | `ui/apps/<ui>/features/ui` |
| Each app's theme tokens | `ui/apps/<ui>/features/theme.css` |
| Each app's English text | `ui/apps/<ui>/features/text/en.json` |
| The files Next.js needs, each handing over to a feature | `ui/apps/<ui>/app` |

- Every app is self-contained. Two apps never share components, styles, or helpers, so each app keeps its own copy.
- Add a missing shadcn primitive to one app from the repo root: `npx shadcn@latest add <name> -c ui/apps/<ui>`.
- An app reaches data only through `@repo/host-backend`. The shared lint config `tooling/eslint-config/next.js` rejects imports of `@repo/host-store`, `drizzle-orm`, and `postgres`.
- Next.js here has breaking changes from older versions. Its own guides are in `node_modules/next/dist/docs/`, resolved from the app's folder, because in this monorepo `next` may not be visible from the repo root.
