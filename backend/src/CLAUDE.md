# Backend code — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of what each backend file does

### Starting up

2. **The backend is built once per process, from settings checked when it starts.** Every setting is read and checked
   at once, and every wrong one is named in a single error. A blank optional setting counts as unset. Web addresses
   must be encrypted (https) unless they stay on this machine. The matching API's address and key come together or not
   at all, as do Google's client id and secret; the key has at least 16 characters, the sign-in secret at least 32, and
   the keep-alive's secret, when set, at least 16. From the settings it builds one backend: the store, the matching API
   for the meeting's conference (or none, when no address is set), sign-in, the keep-alive, and one router joining the
   attendee app's and the consoles' requests. The developer console is told only the API's address, without any query
   or credentials, and whether a key is set: never the key. An unexpected error in a request from the browser is logged
   on the server.
   *How:* code alone: the settings are parsed with zod into typed values once, and one backend is built from them on
   first use, once per process.
   *File:* `server.ts`

3. **Every request passes one gate: only a signed-in guest gets in, and errors never show their insides.** Anyone with
   a Google account may sign in, through Better Auth, choosing their account each time, when Google is set up. Every
   request for the programme or the consoles is refused without a signed-in guest, with "Sign in to see the
   programme."; only the question of who is signed in is open to everyone. An unexpected error tells the browser only
   "Something went wrong", with no stack, unless the app runs in development mode. The gate also fixes what every
   request carries: the store, the organiser's store, the run log, the demo's settings, the matching API, the API's
   settings without the key,
   and the signed-in guest.
   *How:* code alone: Better Auth reads the session from the request's cookies; every request but "who is signed in" is
   built on one tRPC middleware that refuses a request with no guest; tRPC's error formatter strips internal errors.
   *File:* `gate.ts`

### The attendee app

4. **The attendee app's requests read the programme through the store, and a missing item is "not found".** Who is
   signed in, the meeting, days, tracks, the programmes AMS's menu opens by code, Program Highlights' lists, the pages
   of names, sessions, talks, related talks, people, search, the guest's schedule, stars and notes, and, for our
   improvements, the view around the demo's fixed abstract. Every input, and every answer that carries data, is checked against the host app's
   contract. Looking up a talk, session, track or person that does not exist, or a talk that is withdrawn, answers "not
   found", naming what kind of item was missing. Related talks are asked for only for a talk the attendee can see.
   *How:* code alone: tRPC procedures calling the store, with zod schemas from the host app's contract; related talks
   are handed to the related-talks file.
   *File:* `attendee-router.ts`

5. **A talk's related talks are the matching API's matches shown as this programme's talks, in the API's order.** Up
   to five matches are asked for a talk's panel; a caller may ask for more. Each is shown with its kind, score and reason, as the talk this programme holds; a
   match to a talk this programme does not show is left out. When the API cannot answer, the panel says so; when
   nothing is left, it says there are none.
   *How:* code alone: one matches search per talk, joined to the store's talk summaries by talk id.
   *File:* `related.ts`

6. **Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's matches for it with the conferences each is in.**
   The matches are the fixed abstract's related talks, up to twenty of them, each with its talk, kind, score and
   reason, and the conferences its talk is in. The conferences of the abstract's session are the attendee's own. When
   the API cannot answer, the matches are left out, and the abstract and its conferences still show.
   *How:* code alone: the related-talks file's matches, with the abstract's session and each matched talk's conferences
   read from the store.
   *File:* `around-abstract.ts`

### The consoles

7. **The consoles' requests carry out the organiser's and developer's actions, and name every refusal.** Organisers
   list, open, move, withdraw and restore papers, and list, open and change sessions; they see the changes since the
   published programme and the last ten sends, and start a send. A session's new times are given in the meeting's time
   zone, on the meeting's days widened to the published programme's days, and checked by the organiser's rules before
   anything is saved. A send that is already running is refused as a conflict; a send that fails answers with its
   failed run, not an error. The developer sees the API settings, the last send and the changes, tests the connection
   (or is told there is no programme to test with), resets the programme to the published one, and fixes the demo to
   one abstract, refusing by name a talk that cannot be. Every input and answer is checked against the host app's
   contract.
   *How:* code alone: tRPC procedures calling the organiser store, the send and the matching API.
   *File:* `console-router.ts`

8. **An organiser's edit keeps a talk's length and keeps a session's times close to the meeting's days.** A talk moved
   into a session takes the session's room and building and goes after its last shown talk; it starts when the session
   starts or when the last talk ends, whichever is later, and keeps its length. A poster, or a talk with no length,
   takes the session's times; in a session with no time, it has none. Changing a session's start moves its talks by the
   same amount. A session's new times are refused, by name, when only part of a time is given, when the end is not
   after the start, or when the day is more than a day outside the days it is given.
   *How:* code alone: pure functions. The console router checks new times before it edits; the store calls the
   placement and the shift inside its locked edit.
   *File:* `organiser-rules.ts`

### The matching API

9. **The host app talks to a matching API only in the form of the conference API's contract.** Any API can be plugged
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
   *File:* `matching-api.ts`

10. **The programme is sent as one run at a time, in parts of a thousand talks, and stops at a five-minute deadline.**
   - **What is sent:** every talk the store shows, except breaks and talks with no abstract. Text is made plain:
     control characters other than tabs and line breaks become spaces, and each field is cut, never inside a character, to the contract's limits
     (abstract 10,000, title 500, number 64, session title 500, presenter's name 300; at most 20 tracks). An end is
     sent only when it is after the start, or when there is no start. The presenter is sent as an author and a presenter.
   - **How it is sent:** in parts of 1,000 under one sync name. Every part is checked against the conference API's
     contract before the first is written, so a talk that breaks it leaves nothing half sent. The last part completes
     the sync, so the API withdraws talks no longer in the programme. The counts of added, changed, withdrawn and unchanged talks are added up.
   - **One at a time:** each send is a run in the run log, which lets only one run at a time; a send that finds another
     running writes nothing. The five-minute deadline starts before the run does, bounds every write to the API, and
     stays shorter than the time after which a stuck run is taken over.
   - **Failures:** a failed send is recorded with a short reason (the deadline, nothing to send, no API address set, a
     request that does not fit the contract, the API's status and title, a timeout, unreachable, or an unexpected error), never the API's body or the key.
   - The `sync` command does the same from the command line.
   *How:* code alone; the store's run log lets only one run start. The rule "two sends never write at once" is
   model-checked with TLA+ (the verify-send-runs skill).
   *File:* `send.ts`

### Staying on

11. **The keep-alive stops the hosted database pausing, and only the scheduled call with the secret can use it.** A
    request without the secret, or with the wrong one, or when no secret is set, is refused and touches nothing. A
    failure answers only "The database read failed", and the error is logged on the server.
    *How:* code alone: Vercel's daily cron calls it with the secret; the secret is compared in constant time; it runs
    the one trivial read the store gives it.
    *File:* `keep-alive.ts`
