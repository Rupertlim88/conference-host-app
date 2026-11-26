# Isobar Meetings 2027 (Demo), the AMS app

The host app's AMS version. It approximates the Confex Meeting App that AMS attendees will use at the 107th Annual Meeting (Denver, 10 to 14 January 2027), and shows a sample of that meeting's programme as published so far, from `@repo/host-backend`: every session, and five talks with an abstract from each conference. Times show in Mountain time. It opens as AMS's meeting app: AMS's buttons and pages, and nothing more. The demo bar at the bottom, or pressing Control on its own, switches to Our improvements, where every change shows in a gold outline: each talk page gains a related-talks panel filled by the conference API, and Conferences and Symposia is ordered around the demo's abstract, which the developer console sets.

## Run it locally

1. Load the programme: `HOST_DATABASE_URL=... npm run load --workspace=@repo/host-store -- ams`
2. Run the conference API, with a conference named `ams-2027` and a key for it from the conference API's `issue-key` command (see the conference API's own README). Send it the programme with `npm run sync --workspace=@repo/host-backend`. Until a matching engine runs, fill the related-talks panels with placeholder matches: `npm run cli --workspace=@repo/conference-data -- seed-matches ams-2027 placeholder`, with the API's `MATCHING_ENGINE=placeholder`.
3. Put the settings in `ui/apps/ams/.env.local` (see the table), then `npm run dev --workspace=ams` and open http://localhost:3001.

| Setting | Meaning |
|---|---|
| `HOST_SOCIETY` | `ams` |
| `HOST_DATABASE_URL` | the host app's Postgres |
| `BETTER_AUTH_SECRET` | at least 32 random characters |
| `BETTER_AUTH_URL` | this app's address, such as http://localhost:3001 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in; without them the sign-in page says it is not set up |
| `CONFERENCE_API_URL`, `CONFERENCE_API_KEY` | the conference API's address, and a key from its `issue-key` command |
| `CRON_SECRET` | optional locally: the secret Vercel's daily cron sends to `/api/keep-alive`; without it, the route answers 401 |

The organiser console is at `/organiser` and the developer console at `/developer`. Any signed-in guest can use both. To put the app online, follow `HOSTING.md`.

End-to-end tests: `npm run e2e --workspace=ams`. They sign in through Better Auth's test helper, never through Google.
