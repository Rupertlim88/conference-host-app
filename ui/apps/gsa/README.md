# Strata Guide (Demo), the GSA app

The host app's GSA version. It imitates GSA Meetings Guide, the Guidebook app GSA attendees used in 2026, and shows the GSA Connects 2026 programme from `@repo/host-backend`. Every abstract page has a related-talks panel filled by the conference API.

## Run it locally

1. Load the programme: `HOST_DATABASE_URL=... npm run load --workspace=@repo/host-store -- gsa`
2. Run the conference API, with a conference named `gsa-2026` and a token for it (see the conference API's own README). Send it the programme with `npm run sync --workspace=@repo/host-backend`. Until a matching engine runs, fill the related-talks panels with placeholder matches: `npm run cli --workspace=@repo/conference-data -- seed-matches gsa-2026 placeholder`, with the API's `MATCHING_ENGINE=placeholder`.
3. Put the settings in `ui/apps/gsa/.env.local` (see the table), then `npm run dev --workspace=gsa` and open http://localhost:3002.

| Setting | Meaning |
|---|---|
| `HOST_SOCIETY` | `gsa` |
| `HOST_DATABASE_URL` | the host app's Postgres |
| `BETTER_AUTH_SECRET` | at least 32 random characters |
| `BETTER_AUTH_URL` | this app's address, such as http://localhost:3002 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in; without them the sign-in page says it is not set up |
| `CONFERENCE_API_URL`, `CONFERENCE_API_KEY` | the conference API's address, and a token from its `issue-token` command |
| `CRON_SECRET` | optional locally: the secret Vercel's daily cron sends to `/api/keep-alive`; without it, the route answers 401 |

The organiser console is at `/organiser` and the developer console at `/developer`. Any signed-in guest can use both. To put the app online, follow `HOSTING.md`.

End-to-end tests: `npm run e2e --workspace=gsa`. They sign in through Better Auth's test helper, never through Google.
