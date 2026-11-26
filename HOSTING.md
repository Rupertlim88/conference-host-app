# Host the AMS app on Vercel and Supabase

This guide puts the host app online on free tiers. One Supabase project holds the data, and the app is a Vercel Hobby project. The owner does every step that creates an account, a project or a secret, in each service's own dashboard. Secrets go straight into those dashboards, never into the repository or a chat.

## Before you start

You need these:

- the repository on GitHub, with `main` holding the version to host
- a Supabase account, a Google Cloud account, and a Vercel account on the Hobby plan
- the conference API's HTTPS address, and a key that can write talks and read matches for `ams-2027`
- this repository on your machine, with `npm install` done, for the one-off load

The conference API's `issue-key` command makes keys that last the number of days it is given, at most a year. When the key expires, the related-talks panels and the programme sends stop until someone sets a new key. The hosted apps need a key that lasts longer, and that change belongs to the conference API.

## 1. Create the database

1. In Supabase, create a project on the free plan. Pick the region closest to your Vercel functions. Vercel's default region is Washington, D.C. (`iad1`).
2. Open **Connect** and copy two connection strings, each with the database password filled in:
   - the **transaction pooler** string (port 6543), which the app uses
   - the **session pooler** string (port 5432), which you use from your machine
3. Keep both strings on your own computer. The only other place either goes is Vercel, which gets the transaction pooler string in section 5. Never put them in the repository, a pull request, a chat, or a cloud Claude session. Run `load` and `migrate` for the hosted database from your computer.

The store's `connect()` requires TLS for any database off your machine, and refuses an address that turns TLS off with `sslmode=disable`, `allow` or `prefer`.

## 2. Load the programme

From the repository root, with the session pooler string:

```sh
HOST_DATABASE_URL='<session pooler string>' npm run load --workspace=@repo/host-store -- ams
```

It applies the migrations, then prints the counts it loaded. The demo loads a sample: every conference and session, with five talks per conference plus the talks AMS highlights, such as `ams: 52 tracks, 1070 sessions, 391 talks, 266 people`.

## 3. Create the Google sign-in client

1. In Google Cloud, open **APIs & Services**, then **OAuth consent screen**. Choose **External**, fill in the app name and contact address, and publish the app (**In production**), so that any Google account can sign in.
2. Open **Credentials**, then **Create credentials**, then **OAuth client ID**, and choose **Web application**.
3. Add the authorised redirect URI, using the app's production address: `https://<AMS address>/api/auth/callback/google`
4. Copy the client ID and the client secret.

If you do not know the address yet, create the Vercel project first (step 4), then come back.

## 4. Create the Vercel project

Import the repository:

| Project setting | Value |
| --- | --- |
| Root Directory | `ui/apps/ams` |
| Framework Preset | Next.js |
| Node.js Version | 24.x |
| Include files outside the root directory | on |

Vercel installs the whole npm workspace from the repository root, so the app builds with its workspace packages.

## 5. Enter the settings

In the project, open **Settings**, then **Environment Variables**, and add these for **Production**. Mark every secret as **Sensitive**.

| Setting | Value | Secret |
| --- | --- | --- |
| `HOST_SOCIETY` | `ams` | no |
| `HOST_DATABASE_URL` | the transaction pooler string (port 6543) | yes |
| `BETTER_AUTH_SECRET` | the output of `openssl rand -base64 32` | yes |
| `BETTER_AUTH_URL` | the app's production address, such as `https://<AMS address>` | no |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 3 | yes |
| `CONFERENCE_API_URL` | the conference API's address | no |
| `CONFERENCE_API_KEY` | the conference API key | yes |
| `CRON_SECRET` | the output of `openssl rand -hex 24` | yes |

The app checks every setting when it starts and names each one that is wrong. Settings that go in pairs must be set together: `CONFERENCE_API_URL` with `CONFERENCE_API_KEY`, and `GOOGLE_CLIENT_ID` with `GOOGLE_CLIENT_SECRET`. A key or secret set alone stops the app at start-up, so check an existing project's settings before deploying this version.

## 6. Deploy and send the programme

1. Deploy the project to production.
2. Sign in to the app, open **Organiser console**, then **Send to API**, and press **Send programme**, then **Send now**. The page reports how many talks it sent.

## 7. Check that it works

1. On the app's address, sign in with a Google account, open a talk, and check that **Related talks** lists talks.
2. Open **Developer console** and press **Test connection**. It says **Connection works**.
3. In the Vercel project, open **Schedules**, then **Cron Jobs**. `/api/keep-alive` runs daily at 06:00 UTC, at any minute within that hour. Its log shows status 200. Supabase pauses a free project that goes unused, and this daily database read keeps the project in use.

## Change the schema later

When a new version adds a migration, apply it before you deploy that version:

```sh
HOST_DATABASE_URL='<session pooler string>' npm run migrate --workspace=@repo/host-store
```

`migrate` loads nothing, so organiser edits, stars, notes and sign-ins stay. Run `load` on the hosted database again only to start the demo over. It puts back the published programme and undoes every organiser edit, and it keeps stars, notes and sign-ins.

## Limits

- Google sign-in works only on the production addresses, because the client lists only those callbacks. Preview deployments show the sign-in page but cannot complete it.
- A programme send stops at its 5-minute deadline, which is also the longest a Hobby function may run (300 seconds). A send to the local conference API took about 2 seconds.
- Anyone who signs in can edit the programme, send it and reset it, by the owner's decision. **Reset to published programme** in the developer console, then **Send programme again**, restores the demo.
