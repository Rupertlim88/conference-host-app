# Draft: the host app's CLAUDE.md tree and every lowest-level rule

> **A draft for review.** Nothing here is a rule yet: only the CLAUDE.md files are rules. Once approved, each rule is
> copied into its CLAUDE.md with `*File:* needed`, the code is moved into the planned files, and each tie is written
> only after the file is checked against every sentence of its rule. This file is then deleted.

Each lowest-level rule is written as it will appear: a bold sentence saying the one job, the details, a *How:* line,
and the file planned to carry it out. "Planned" files do not exist yet; the list under each says which of today's files
are merged into it.

## 1. Where the CLAUDE.md files sit

A rule sits in the folder that holds its file. Ten CLAUDE.md files; the five marked **lowest** hold every rule that
is tied to a file.

| CLAUDE.md | Level | What it holds |
|---|---|---|
| host app root | top | rules about the CLAUDE.md files; what the host app is; how it is built; connecting a matching API; the rules copied from the global CLAUDE.md |
| `backend/` | part | the backend's security level and what the backend is for |
| `backend/src/` | **lowest** | 9 rules, one per backend file |
| `data/` | part | the data layer's security level; data kept separately, public fields only; gathered gently |
| `data/store/src/` | **lowest** | 12 rules: the database and every read and write |
| `data/programmes/` | **lowest** | 1 rule: the AMS 2027 programme files as published |
| `contracts/src/` | **lowest** | 3 rules: the forms that pass between the host app's parts |
| `ui/` | part | what every UI has: attendee app, organiser console, developer console |
| `ui/ams/` | UI version | what the AMS UI is (today's rules); lists its one further CLAUDE.md |
| `ui/ams/features/` | **lowest** | 22 rules, one per feature |

**47 lowest-level rules in all.**

### Folder moves this needs

- **GSA is removed** (the user's decision): the GSA UI, its data, its loading code, its schema in the database (by a new migration that drops it) and every mention of it.
- `ui/apps/ams` → `ui/ams`: UI versions sit straight inside the UI folder.
- In each UI, the code in `components/`, `components/views/`, `components/console/` and `lib/` merges into one file per
  feature in a new `features/` folder. The shadcn building blocks move to `features/ui/`, and the English text from
  `messages/` to `features/text/`. `app/globals.css` becomes `features/theme.css`.
- `app/` keeps only the files Next.js needs there (`page`, `layout`, `error`, `not-found`, `route`, `manifest`). Each
  becomes a line or two that hands over to its feature's file.
- `data/ams2027` → `data/programmes/ams2027`.
- `data/store/drizzle` → `data/store/src/migrations`.
- `data/loader` (a Python loader for APS's Global Physics Summit 2026, used by nothing in the host app) is deleted.
- `contracts/src/index.ts` splits into three files by who uses each form; `index.ts` stays as the file that re-exports them.
- `backend/src/testing.ts` (used only by tests) moves to `backend/test/`.

### What the tie check does not count

As in the conference API and the tester: tests, the empty or re-export-only `index.ts`, tool setup files, READMEs,
CLAUDE.md files, docs, tools (`scripts/`, `tooling/`, `.claude/`, `backend/verification/`) and the copy of the
conference API's contract. Two additions for the host app:

- **Entry points go with the file they hand over to.** A Next.js file in `app/` and a command-line script that only
  hand over to one feature's or one file's code are counted with that file, as tests are.
- **The shadcn building blocks stand as one item**, as a folder of data does: `features/ui/` holds a short `RULE.md`
  naming its rule.

## 2. Rules for the root and part CLAUDE.md files

These are general direction, tied to no file.

**Root, "Rules about the CLAUDE.md files":** the two rules already in PR #11 (Claude writes the rules; Claude decides
where the global rules leave a change to the user), plus:

- **The host app's CLAUDE.md files: which are allowed, and what each contains.** The table above, in words.
- **Most rules are about what specific code does, and sit in the folder of the file that carries them out.**
- **At the lowest level, each rule is tied to one file, and each file to one rule**, with the not-counted list above,
  including the two additions.
- **Each file states its rule's bold sentence, and each lowest-level rule names its file.**
- **A file and its rule name each other only once the tie is verified.**
- **Every lowest-level rule says how it is done**, with a *How:* line, and categories in the order the work is done.
- **A check confirms every tie, at all times**, run with the tests and in CI.

**`backend/`:** today's security rule (OWASP ASVS 5.0 Level 1), and: **The backend holds all of the host app's rules,
and the UIs reach the data only through it.**

**`data/`:** today's rules: Supabase's PostgreSQL, always on; security level; each society's data kept separately,
public fields only; data gathered gently. (The rule that each society's data is kept separately stays, for a future society.) Rule 5 from PR #11 (every AMS 2027 talk) moves down to `data/programmes/`
and `data/store/src/`, split into its two ideas: the files kept, and the talks loaded.

**`ui/`:** today's three rules (attendee app, organiser console, developer console, with their security level).

**`ui/ams/`:** today's rules, plus: **This UI has one further CLAUDE.md, in its features folder, holding
one rule per feature.**

---

## 3. `backend/src/` — 9 rules

### Starting up

1. **The backend is built once per process, from settings checked when it starts.** Every setting is read and checked
   at once, and every wrong one is named in a single error. A blank setting counts as unset. Web addresses must be
   encrypted (https) unless they stay on this machine. The matching API's address and key come together or not at
   all, as do Google's client id and secret; the key has at least 16 characters, the sign-in secret at least 32. The
   developer console is told only the API's address, without any query or credentials, and whether a key is set:
   never the key.
   *How:* code alone: the settings are parsed with zod into typed values once, and one backend is built from them per
   process.
   *File (planned):* `server.ts` (today's `config.ts`, `server.ts` and `safeApiAddress` from `programme-rules.ts`)

2. **Every request passes one gate: only a signed-in guest gets in, and errors never show their insides.** People sign
   in with Google, through Better Auth, when Google is set up. Every request except "who is signed in" is refused
   without a signed-in guest, with "Sign in to see the programme." An unexpected error tells the browser only
   "Something went wrong", with no stack, except while developing on one's own computer.
   *How:* code alone: Better Auth reads the session from the request's cookies; one tRPC middleware refuses requests
   with no guest; tRPC's error formatter strips internal errors.
   *File (planned):* `gate.ts` (today's `auth.ts` and `trpc.ts`)

### The attendee app

3. **The attendee app's requests read the programme through the store, and a missing item is "not found".** Meeting,
   days, tracks, session kinds, sessions, talks, people, search, stars and notes, each with its input and its answer
   checked against the host app's contract. An item that does not exist, or is withdrawn, answers "not found" with
   what was missing. Related talks are asked for only for a talk the attendee can see.
   *How:* code alone: tRPC procedures, each a single call to the store with zod input and output schemas.
   *File (planned):* `attendee-router.ts` (the attendee half of today's `router.ts`)

4. **A talk's related talks are the matching API's matches shown as this programme's talks, in the API's order.** Up
   to five matches are asked for. Each is shown with its kind, score and reason, as the talk this programme holds; a
   match to a talk this programme does not show is left out. When the API cannot answer, the panel says so; when
   nothing is left, it says there are none.
   *How:* code alone: one matches search per talk, joined to the store's talk summaries by talk id.
   *File (planned):* `related.ts`

### The consoles

5. **The consoles' requests carry out the organiser's and developer's actions, and name every refusal.** Organisers
   list, open, move, withdraw and restore papers, and list, open and change sessions; they see the changes since the
   published programme and the last ten sends, and start a send. A send that is already running is refused as a
   conflict; a send that fails answers with its failed run, not an error. The developer sees the API settings, the
   last send and the changes, tests the connection (or is told there is no programme to test with), and resets the
   programme to the published one. Every input and answer is checked against the host app's contract.
   *How:* code alone: tRPC procedures calling the organiser store, the send and the matching API.
   *File (planned):* `console-router.ts` (the console half of today's `router.ts`)

6. **An organiser's edit keeps a talk's length and keeps a session's times inside the meeting.** A talk moved into a
   session takes the session's room and goes after its last talk; it starts when the session starts or when the last
   talk ends, whichever is later, and keeps its length. A poster, or a talk with no length, takes the session's times;
   in a session with no time, it has none. Changing a session's start moves its talks by the same amount. A session's
   new times are refused, by name, when only part of a time is given, when the end is not after the start, or when the
   day is more than a day outside the meeting.
   *How:* code alone: pure functions the console router calls inside the store's locked edit.
   *File (planned):* `organiser-rules.ts` (today's `programme-rules.ts`, without the connection test and the address)

### The matching API

7. **The host app talks to a matching API only in the form of the conference API's contract.** Any API can be plugged
   in by its address and key. It is called at `/v1/conferences/<conference>/`, with the conference `ams-2027`, and the key as a bearer token.
   - **Requests.** Every request is checked against the conference API's contract before it is sent, and one that
     fails is never sent.
   - **Time limits.** A matches search for related talks waits 3 seconds, a connection test 5 seconds, a talks write a
     minute, and a write also stops when its send's deadline passes.
   - **Answers.** Every answer is checked against the contract. A refused write reports its status, its problem title
     and its first five errors.
   - **The connection test** sends one matches search for a talk, writes nothing, keeps no body, and reports one of:
     ok, key refused, no programme at the API, an unexpected answer, unreachable, or not set.
   - **With no address set,** related talks are unavailable, a send is refused with what to set, and the test says
     "not set".
   *How:* code alone: `fetch` with an abort signal; zod schemas from the host app's copy of the conference API's
   contract check each request before it is sent and each answer as it arrives.
   *File (planned):* `matching-api.ts` (today's `conference-api.ts`, with the connection test's outcomes from
   `programme-rules.ts`)

8. **The programme is sent as one run at a time, in parts of a thousand talks, and stops at a five-minute deadline.**
   - **What is sent:** every talk the programme shows, except breaks and talks with no abstract. Text is made plain:
     control characters become spaces, and each field is cut, never inside a character, to the contract's limits
     (abstract 10,000, title 500, number 64, session title 500, presenter's name 300; at most 20 tracks). An end is
     sent only when it is after the start. The presenter is sent as an author and a presenter.
   - **How it is sent:** in parts of 1,000 under one sync name. The last part completes the sync, so the API withdraws
     talks no longer in the programme. The counts of added, changed, withdrawn and unchanged talks are added up.
   - **One at a time:** each send is a run in the run log. A send that finds another running writes nothing. The
     five-minute deadline starts before the run does, and stays shorter than the time after which a stuck run is taken
     over.
   - **Failures:** a failed send is recorded with a short reason (the deadline, nothing to send, the API's status and
     title, a timeout, or unreachable), never the API's body or the key.
   - The `sync` command does the same from the command line.
   *How:* code alone. The rule "two sends never write at once" is model-checked with TLA+ (the verify-send-runs skill).
   *File (planned):* `send.ts` (today's `send.ts` and `sync.ts`; `cli/sync.ts` counts with it)

### Staying on

9. **The keep-alive stops the hosted database pausing, and only the scheduled call with the secret can use it.** A
   request without the secret, or with the wrong one, is refused and touches nothing. A failure answers with no
   detail.
   *How:* code alone: Vercel's daily cron calls it; the secret is compared in constant time; it runs one trivial query.
   *File (planned):* `keep-alive.ts`

---

## 4. `data/store/src/` — 12 rules

### The database

1. **Each society has its own schema, with the same tables, and sign-in has a schema of its own.** Each society's
   schema holds its meeting, tracks, sessions, talks, people, who gives which talk, stars, notes and send runs. Sessions
   and talks keep the published programme beside the live one, so that every organiser's change can be shown and undone.
   Sign-in's tables (users, sessions, accounts, verifications) sit in their own schema, and an account is unique by
   issuer and account id.
   *How:* code alone: Drizzle table definitions, one function building the same tables for each society.
   *File (planned):* `tables.ts` (today's `schema.ts` and `auth-schema.ts`)

2. **The database's form changes only by adding a migration, never by editing one.** The migrations are applied in
   order, and each runs once.
   *How:* drizzle-kit writes each migration from the tables; Claude reads it before it is committed.
   *File (planned):* `migrations/` (today's `drizzle/`)

3. **Every connection to a database off this machine is encrypted.** A connection with no setting is made to require
   encryption, and a setting that turns it off is refused. Each process keeps a pool of at most four connections.
   *How:* code alone: the connection address's `sslmode` is checked before connecting.
   *File (planned):* `connect.ts` (today's `db.ts`)

4. **Migrations are applied by a command of their own, which loads nothing, so organisers' edits stay.** They are kept
   in their own tracking table. They are a separate entry point, so that the web app never bundles them.
   *How:* code alone: Drizzle's migrator; the `migrate` command counts with this file.
   *File (planned):* `migrate.ts` (today's `migrate.ts`; `migrate-cli.ts` counts with it)

### Gathering the programmes

5. **AMS's public programme is fetched in four requests, two seconds apart, and only what the programme shows is
   kept.** Nothing is written until all four have arrived. Only the fields the public programme shows are kept, for
   each type. Withdrawn papers, rows left out of the web programme, the exhibit hall, sponsor and waste-basket
   programmes, papers in dropped sessions and slots of dropped rows are removed, and lists stop naming them. Abstracts
   and descriptions lose every HTML attribute. Each unfiltered download is hashed, so a later download can be compared,
   and is never written to disk.
   *How:* code alone: `fetch` from the Confex meeting API, one allow-list of fields for each type.
   *File (planned):* `fetch-ams.ts` (today's `fetch-ams.ts` and `ams-public.ts`)

6. **AMS's files become the host app's programme: its sessions, talks, people and tracks.** Session numbers, kinds and
   chairs are read from AMS's own display text; the presenter is the name AMS shows in bold; times come from AMS's
   timestamps; abstracts become plain text; talks are put in order within each session.
   *How:* code alone: the files are checked with zod, then mapped.
   *File (planned):* `ams-rows.ts` (today's `ams.ts` and `html.ts`)

7. **A time in the meeting's own zone is turned into an exact instant, through daylight saving.** A 12-hour clock is
   read as 24-hour; anything else is refused.
   *How:* code alone, with the platform's time-zone data.
   *File (planned):* `time.ts`

8. **Loading a society puts back its published programme in one step, and keeps stars, notes and sign-ins.** The
   meeting, tracks, sessions, talks and people are written as both the live and the published programme, and anything
   no longer in the files is removed. It all happens in one transaction, so a failed load changes nothing. It undoes
   organisers' edits.
   *How:* code alone: one transaction of upserts in chunks of 500; the `load` command migrates first.
   *File (planned):* `load.ts` (today's `load.ts`, `load-rows.ts` and `rows.ts`)

### Reading and writing

9. **The attendee app sees only the talks that are not withdrawn.** It reads the meeting, its days in the meeting's
    zone, tracks, session kinds, sessions, talks and people. A person is listed only while one of their talks is shown.
    Search covers talks, sessions and people, at most 50, 20 and 20. The talks a send carries are the same shown talks,
    with their session's title and format.
    *How:* code alone: SQL through Drizzle; every read filters out withdrawn talks.
    *File (planned):* `programme.ts` (the programme half of today's `queries.ts`)

10. **Each guest's stars and notes are their own, and are kept when a talk is withdrawn, but not shown.** A guest
    stars and unstars talks and sessions, and sees their schedule. A note saved blank is deleted.
    *How:* code alone: every read and write is filtered by the guest's id.
    *File (planned):* `guest-data.ts` (the stars and notes half of today's `queries.ts`)

11. **Organisers see every talk with how it differs from the published programme, and their edits lock the session
    first.**
    - **Reading:** papers in pages of 50, filtered by status (all, scheduled, withdrawn, changed) and search, where a
      page past the end gives the last page; sessions with their count of shown talks and whether they changed; the
      published days; the counts of every change.
    - **Editing:** moving a paper, withdrawing or restoring it, changing a session's time and room (its talks move with
      it, and untimed talks take its times), and putting everything back as published. Each edit locks its session
      first, and putting back does sessions before talks, so two edits never cross.
    *How:* code alone: SQL through Drizzle, with `SELECT … FOR UPDATE` on the session.
    *File (planned):* `organiser.ts`

12. **Only one send runs at a time, and a run that never finished is taken over after ten minutes.** A run starts only
    when no other is running; it ends as sent or failed, and only a running one can end. Its error is kept to 500
    characters. The last ten runs are listed.
    *How:* code alone: a partial unique index allows one running row; the model check in verify-send-runs covers it.
    *File (planned):* `sync-log.ts`

(The organiser rule keeps reading and editing in one file, because both use the same "changed since published" test; if it grows
past about 300 lines, it splits into two rules.)

---

## 5. `data/programmes/` — 1 rule

1. **The host app holds every talk of the AMS 2027 Annual Meeting, as AMS published it, public fields only.** The four
   files of AMS's public programme (papers, sessions, time slots and programmes), refreshed as AMS adds to it. Where the
   host app does not yet have part of the meeting, it may copy it from the conference matching tester's snapshot of the
   same meeting.
   *How:* code fetches them (the rule on fetching AMS's public programme); the note says when, from where, the counts,
   and the hashes of the unfiltered downloads.
   *File (planned):* `ams2027/`


---

## 6. `contracts/src/` — 3 rules

1. **The attendee app and the backend pass the programme in fixed forms.** Ids are 1–64 letters, digits, dots,
   underscores or hyphens. Search takes 2–100 characters; a note at most 5,000; no text may hold a NUL character.
   The meeting, days, tracks, sessions, talks, people, search results, schedule, notes, the signed-in guest and related
   talks each have one form.
   *How:* code alone: zod schemas, with types inferred from them.
   *File (planned):* `programme.ts`

2. **The organiser console's lists and edits have fixed forms and limits.** Pages of 50, page numbers 1–10,000,
   searches up to 100 characters, a paper's status filter and change kind, the session change (date, 24-hour clocks or
   empty, a room up to 200 characters), the changes and the reset's result.
   *How:* code alone: zod schemas.
   *File (planned):* `organiser.ts`

3. **A send and the developer console's checks have fixed forms.** A send run's state and counts, the connection
   test's outcome and HTTP status, and the API status the developer console shows.
   *How:* code alone: zod schemas.
   *File (planned):* `sending.ts`

---

## 7. `ui/ams/features/` — 22 rules

### The frame

1. **The app is installable, English only, and shows times in Denver unless the guest chooses their own zone.** It
   calls the backend through one batched connection, retries a failed call once, and does not refetch when the window
   regains focus. A send may run for up to five minutes, so the backend's address allows that long.
   *How:* code alone: Next.js, next-intl, React Query and tRPC; the manifest and the backend's route count with this
   file.
   *File (planned):* `app.tsx` (today's `providers.tsx`, `manifest.ts`, `lib/trpc.ts`, `lib/meeting.ts`, `lib/params.ts`)

2. **The look is the demo's own, never AMS's: its own name, logo, colours and type.** The name is "Isobar Meetings
   2027 (Demo)".
   *How:* Tailwind v4 theme tokens, with a colour for each kind of session.
   *File (planned):* `theme.css` (today's `app/globals.css`)

3. **Guests sign in with Google, and signing out cannot be undone with Back.** A signed-in guest sent to sign-in goes
   home. A failed sign-in says so. Where Google is not set up, the page says so instead of showing the button. Every
   page sends anyone not signed in to sign-in.
   *How:* code alone: Better Auth's client; every page reads through one server helper that redirects.
   *File (planned):* `sign-in.tsx` (today's sign-in view and buttons, `lib/auth-client.ts`, `lib/server-api.ts`)

4. **Every attendee page sits in one frame, like the Confex meeting app's, and Home opens it.** A skip link; a top bar
   with sign-out, the time-zone switch, search and, on phones, a menu sheet that closes when a link is picked; a banner
   with the logo and the meeting's name and city; on computers, a side menu of eight links (Home, Conferences and
   Symposia, Meeting Calendar, People, My Schedule, Search, Organiser console, Developer console). Home shows a welcome,
   the location and five tiles.
   *How:* code alone.
   *File (planned):* `frame.tsx` (today's app shell, top bar, nav links, logo, page title, home view)

5. **A page that is missing says so, and a page that fails offers to try again.** "We could not find that page", with
   a link home, in exactly one main region; "Something went wrong" with "Try again". A request for an item that does not
   exist, or a bad id, becomes "not found"; any other failure is an error.
   *How:* code alone: Next.js's error and not-found files hand over to this file.
   *File (planned):* `errors.tsx` (today's not-found view, the error and not-found files' content, `lib/or-not-found.ts`)

6. **Times show in meeting time or the guest's own zone, and a place shows its room and building.** The guest's choice
   is remembered on their device, and lasts for the page if the device refuses to store it. The page shows the same
   time on the server and in the browser. A time shows as a day, a date, a time or a range; an item with no time or no
   room hides those lines.
   *How:* code alone: `Intl` formatting; the choice in local storage.
   *File (planned):* `meeting-time.tsx` (today's `time-zone.tsx`, `when.tsx`, `info-box.tsx`, `lib/place.ts`)

7. **Sessions and talks show as cards, coloured by kind.** A session card shows its kind and number, title and place,
   with an edge coloured by kind (event, poster, joint, panel, break or oral), and links to the session. A talk card
   shows its time, number, title, authors and place; a break is shown but is not a link.
   *How:* code alone.
   *File (planned):* `cards.tsx` (today's session and talk cards, `lib/tones.ts`)

### Finding talks

8. **The Meeting Calendar shows one day at a time, its sessions grouped by time.** It opens on the first day of the
   meeting. A strip of days marks the current one. Sessions with the same start and end are grouped, earliest first;
   untimed sessions are left out; a day with none says so; a bad date is "not found".
   *How:* code alone.
   *File (planned):* `calendar.tsx` (today's calendar view, day strip, `lib/blocks.ts`, `firstDay`)

9. **Conferences and Symposia lists every track, and each track lists its sessions by day.** A track shows how many
   sessions it has, then its sessions under each day in meeting time, untimed ones last.
   *How:* code alone.
   *File (planned):* `programmes.tsx` (today's programs views, `byMeetingDay`)

10. **People are listed A to Z by surname, and each person shows their talks.** Letters ignore accents; names that do
    not start with A–Z go under "#", last. With no letter chosen, the first group shows.
    *How:* code alone.
    *File (planned):* `people.tsx` (today's people views, `lib/people.ts`)

11. **Search finds talks, sessions and people from two to a hundred characters.** A shorter or longer query is not run
    and says why; no hits says nothing matches. Results show people, then sessions, then presentations.
    *How:* code alone: a plain form that puts the query in the address.
    *File (planned):* `search.tsx` (today's search view and box)

### A session and a talk

12. **A session's page shows its time, place, chairs and talks.** Its tracks above the title; "Session N - title";
    a star; time and place; its description; its organisers; its presentations, or that none are listed; links to its
    tracks.
    *How:* code alone.
    *File (planned):* `session.tsx` (today's session view)

13. **A talk's page shows everything the programme publishes about it.** Number and title, a star, time and place,
    poster board, authors, the abstract in paragraphs (or that none was published), its session and its citation; then
    its related talks.
    *How:* code alone.
    *File (planned):* `talk.tsx` (today's talk view)

14. **On every talk page, a related-talks panel shows the matching API's matches for that talk, and never breaks the
    page.** While loading it shows placeholders. When the API cannot answer, it says the related talks are unavailable
    right now; with none, it says so. Each match shows whether it is close or unexpected, its time, number, title and
    reason, and links to the talk.
    *How:* code alone: loads in the browser after the page, so a slow API never holds up the talk.
    *File (planned):* `related-talks.tsx` (today's related panel and related talks)

15. **A guest stars talks and sessions, and My Schedule lists what they starred.** The star shows whether it is on, and
    cannot be pressed while stars load or a change saves. My Schedule lists sessions, then presentations; with nothing
    starred, it says how to add some.
    *How:* code alone.
    *File (planned):* `my-schedule.tsx` (today's star button, star toggle, schedule view)

### The organiser console

16. **The consoles have their own frame, with tables, pages of fifty and Mountain time.** A dark header with the
    console's name ("Program Builder" or "Developer Console"), its sections, a link to the attendee app and sign-out.
    Tables are dense; a pager shows "Page x of y" and hides when one page holds everything. Times are always Mountain
    time. Chips show a paper's status (scheduled, withdrawn, moved, rescheduled) and a session's (published, changed);
    a summary counts the changes. Searches are cut to 100 characters, an unknown filter means all, and a bad page means
    the first.
    *How:* code alone.
    *File (planned):* `console-frame.tsx` (today's console shell, table, pager, chips, time, changes summary,
    `lib/list-params.ts`)

17. **Organisers find any paper, withdraw or restore it, and move it to another session.** Papers are searched and
    filtered by status, 50 a page. A paper's page shows its status, presenter, session, time and room. Withdraw and
    Restore cannot be pressed twice and say when a change did not save. A paper is moved by searching for a session;
    its own session is marked. A withdrawn paper has no link to the attendee app.
    *How:* code alone.
    *File (planned):* `organiser-papers.tsx` (today's papers views, withdraw and move buttons)

18. **Organisers change a session's date, times and room, and are told by name why a change is refused.** Sessions are
    searched, 50 a page. A session's page shows its status and every paper in it, withdrawn ones too. Times are in
    Mountain time; leaving them empty clears them. A refusal names its reason: a time half given, an end not after the
    start, or a day outside the meeting.
    *How:* code alone.
    *File (planned):* `organiser-sessions.tsx` (today's sessions views, session form, `lib/meeting-clock.ts`)

19. **Organisers send the programme to the matching API, after confirming, and see the last ten sends.** The page says
    withdrawn papers are left out and shows the changes. Send asks to confirm, then shows it is sending. It reports what
    was sent, added, changed and withdrawn, or the failure, or that a send is already running.
    *How:* code alone.
    *File (planned):* `send.tsx` (today's send view and panel)

### The developer console

20. **The developer console shows the matching API's settings, tests the connection, and can put the published
    programme back.** It shows the API's address (or that none is set), whether a key is set, and the last send. The
    test reports one of: ok (with its HTTP status and time), not set, key refused, no programme or no talks, unreachable,
    or an unexpected answer. It can send the programme again, and put the published programme back after confirming,
    saying how many papers and sessions changed.
    *How:* code alone.
    *File (planned):* `developer.tsx` (today's developer view and actions)

### Building blocks

21. **The UI's building blocks are shadcn/ui components, kept as shadcn makes them.** Badge, button, input, sheet and
    skeleton.
    *How:* added with the shadcn command; changed only where the look needs it.
    *File (planned):* `ui/` (today's `components/ui/` and `lib/utils.ts`; the unused separator is deleted)

22. **Every word the UI shows is in one English text file.**
    *How:* next-intl reads it; every key is used.
    *File (planned):* `text/` (today's `messages/en.json`)

---

## 8. How each rule was kept narrow

Each rule names one job that one file of about 50–300 lines can do in full, at the level the conference API's
lowest-level rules use: what is done, its limits and its edge cases, never "the UI is good" or "the backend is secure".
Rules that are broad on purpose stay in the part CLAUDE.md files above as direction, tied to no file. Where two drafted
rules described the same code, they were merged so that one file serves one rule:

- The three matching-API rules (talking to the API, checking requests before sending, and the connection test) are one
  rule, because one file does all three.
- PR #11's data rule on holding every AMS 2027 talk splits into its two ideas: the files kept, and the talks loaded.
- Where today's files hold two unrelated jobs, they split: `router.ts` into attendee and console routers,
  `programme-rules.ts` into organiser rules and the matching API, `queries.ts` into the attendee's programme and the
  guest's own data, `contracts/src/index.ts` into three.

## 9. Things the reading found that are not right today

- **The request check before sending is not built.** Requests are typed but not checked against the contract.
- **The AMS 2027 data is nine days old:** 886 sessions here against 922 in the tester's snapshot of 24 November.
- `data/README.md` says the sign-in tables are in schema `auth`; they are in `sign_in`.
- Three identical `error.tsx` files and two identical console `not-found.tsx` files; one unused shadcn
  component (separator) in AMS.
- Two unused re-exports from the backend (`authOptions`, `readConfig`).
