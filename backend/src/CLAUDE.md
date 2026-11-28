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
   the keep-alive's secret, when set, at least 16, and the tester's token, when set, at least 32. From the settings it
   builds one backend: the store, the matching API for the meeting's conference (or none, when no address is set),
   sign-in, the keep-alive, the tester's requests, and one router joining the attendee app's and the consoles'
   requests. A page's caller answers as the guest the page has already looked up, without looking them up again.
   The developer console is told only the API's address, without any query
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
   are handed to the related-talks file, and the view around the fixed abstract to the file for our improvements.
   *File:* `attendee-router.ts`

5. **A talk's related talks are the matching API's matches shown as this programme's talks, in the API's order.** The
   matching API is asked for six of its matches for the whole conference around the talk, one more than the panel
   shows, and the panel shows the first five.
   Each is shown with its kind, score and reason, as the talk this programme holds; a match to a talk this programme
   does not show is left out, and so is anything listed outside the whole conference. When the API cannot answer, the
   panel says so; while the API is still judging the talk, it says its talks are still being matched; when nothing is
   left, it says there are none.
   *How:* code alone: one matches search restricted to the whole conference per talk, joined to the store's talk
   summaries by talk id.
   *File:* `related.ts`

6. **Our improvements see the demo's fixed abstract, the conferences of its session, and the matching API's pools around it, by kind.**
   One request asks the matching API for the fixed abstract's matches in four kinds of restriction: each conference,
   each day, each time block and each session, four in each, one more than the largest box shows. Its pools are grouped
   by kind: a conference by its track, a day by its date, a time block by its start instant and a session by its id.
   Each pool holds exactly what its box shows: the first matches the API lists, in its order, as many as the box shows,
   each with its talk, kind, score and reason, and the conferences its talk is in. A match to a talk this programme
   does not show is left out, and so is a pool this programme cannot name, a pool for the attendee's own conferences or
   for a conference the conferences list does not show, a talk in a time block its session does not start with, and a
   talk in a session it is not in; no pool is empty. Each talk is where the store says it sits: with a test set's
   layout, in its session there, at that session's start. The attendee's own conferences are those of the abstract's
   session, or, with a layout, those the layout puts the abstract in. With a layout, the view also carries the sessions
   the layout places the talks in, each at its start there, keeping its length, with its talks in order.
   When the API cannot answer, the pools are left out, and the abstract and its conferences still show; a restriction
   the API is still judging has no pool until it is judged.
   *How:* code alone: one restricted matches search, every page of it, with where each held talk sits, the matched and
   laid-out talks' and sessions' short forms, and the conferences list, read from the store; the tester's report makes
   its pools the same way.
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
   *How:* code alone: tRPC procedures, with zod schemas from the host app's contract, calling the organiser store, the
   organiser's rules, the run log, the demo's settings, the send and the matching API.
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
   - **Matches by restriction.** A matches search names the kinds of restriction to list the matches under, asking
     for every one of each kind and how many matches to list in each, best first, asks for pages of a thousand, reads
     every page, joins the talk's connections where its entry continues on the next page, keeps the API's order, and
     keeps each restriction the API is still judging; when one page fails, the whole search is unavailable. Each match
     is the other talk of a connection, with the main talk's description of it, since every pair in a connection
     follows the order of its talks, the main talk first.
   - **Verdicts on named talks.** A search for the verdicts on a talk names the talks to judge it against as the talks
     restriction, which, like every restriction, lists only matches, at most a thousand to a search, as the contract
     allows, and asks for as many matches as it names, so that every match among them is listed; it reads every page,
     keeps each connection as the API gave it, and keeps whether those talks are still being judged; when one fails,
     the verdicts are unavailable.
   - **Time limits.** A matches search waits 3 seconds in all, across its pages, a search of named talks 10 seconds
     for each thousand talks, a connection test 5 seconds, a talks write a minute, and a write also stops when its
     send's deadline passes.
   - **Answers.** Every answer is checked against the contract. A refused write reports its status, its problem title
     and its first five errors.
   - **The connection test** sends one matches search for one match of a talk, writes nothing, keeps no body, and
     reports one of: ok, key refused, no programme at the API, an unexpected answer, unreachable, or not set; an
     answer that the talk is still being judged is ok.
   - **With no address set,** every matches search is unavailable, a send is refused with what to set, and the test
     says "not set".
   *How:* code alone: `fetch` with an abort signal; zod schemas from the host app's copy of the conference API's
   contract check each request before it is sent and each answer as it arrives.
   *File:* `matching-api.ts`

10. **The programme is sent as one run at a time, in parts of a thousand talks, and stops at a five-minute deadline.**
   - **What is sent:** every talk the store shows, except breaks and talks with no abstract, each where the store
     says it sits: in the latest test set's layout when it has one, so a talk the layout places nowhere goes without
     a session or conferences. Text is made plain:
     control characters other than tabs and line breaks become spaces, and each field is cut, never inside a character, to the contract's limits
     (abstract 10,000, title 500, number 64, session title 500, presenter's name 300; at most 20 tracks). An end is
     sent only when it is after the start, or when there is no start. The presenter is sent as an author and a presenter.
     A talk's session is sent with its start, as the meeting's clock shows it, with its offset, which sets the talk's
     day and time block at the API; a session with no start is sent without one.
   - **How it is sent:** in parts of 1,000 under one sync name. Every part is checked against the conference API's
     contract before the first is written, so a talk that breaks it leaves nothing half sent. The last part completes
     the sync, so the API withdraws talks no longer in the programme. The counts of added, changed, withdrawn and unchanged talks are added up.
   - **One at a time:** each send is a run in the run log, which lets only one run at a time; a send that finds another
     running writes nothing. The five-minute deadline starts before the run does, bounds every write to the API, and
     stays shorter than the time after which a stuck run is taken over.
   - **Failures:** a failed send is recorded with a short reason (the deadline, nothing to send, no API address set, a
     request that does not fit the contract, the API's status and title, a timeout, unreachable, or an unexpected error), never the API's body or the key.
   - The `sync` command does the same from the command line.
   *How:* code alone; the store's run log lets only one run start. That two sends never write at once is model-checked
   with TLA+ (the verify-send-runs skill).
   *File:* `send.ts`

### The tester

11. **Every request from a tester needs the secret token, and with no token set the tester's requests are switched off.**
    A request without the right token is refused, and so is every tester request while no token is set; the token is
    a setting, kept secret like the matching API's key. An unexpected error tells the tester only that something went
    wrong, and is logged on the server.
    *How:* code alone: one check every tester request passes, comparing the bearer token in constant time.
    *File:* `tester-token.ts`

12. **The programme map lists every time block, session and conference of AMS's whole published programme, with its talks.**
    A time block is every session that starts at the same time on one day, on the meeting's clock, and a lone session
    is a block of its own. Every session lists its talks, and every conference lists its own talks, so that a joint
    session's talk is listed only under its own conferences, as the report's places count it; a session or conference
    with no talk is left out, since a tester can choose nothing from it. Times are the meeting's clock, to the minute,
    and ids are AMS's. Before the whole programme is loaded, the map answers that it is not loaded yet.
    *How:* code alone, from the store's whole published programme; the map is checked against the host app's contract
    before it is sent.
    *File:* `programme-map.ts`

13. **A test set is checked, stored, held and sent to the matching API.** It names the conference, the abstracts to
    test, the first being the demo's fixed abstract, and the talks for the demo to hold. It is refused, with a plain
    message, when it names another conference, lists nothing, names a talk the published programme does not have, or
    an abstract to test that is not among its talks or has no abstract to match, when its layout disagrees with itself
    or names a session or conference the published programme does not have, and before the whole programme is
    loaded. Once it is stored and held, the
    programme is sent to the matching API as one run, and the answer gives the programme version that send returned.
    While another send runs, or when the send fails, the test set stays held and the answer says so.
    *How:* code alone: the test set is parsed against the host app's contract and checked against the store's whole
    published programme; the store holds it, then the send runs as the organiser console's does, and the answer is
    checked against the contract before it is sent.
    *File:* `test-set.ts`

14. **For each abstract tested, the host app reports what each place chose from, what it shows, and every verdict the matching API gave.**
    The places are the abstract's related talks; each other conference; each of the abstract's own conferences, for
    the tester only, which shows nothing; each day; each time block; and each session. For each place it gives the
    held talks the place chose from, the talks it shows visitors, in order and exactly as the pages show them, every
    verdict the matching API lists for the abstract under those talks, each a connection, which are only matches,
    passed on as the API gave it, and each of those talks the matching API listed no verdict for, marked as not judged, which covers both
    talks it judged not to match and talks it never reached. It also gives the programme version of the last send and of the
    matches. The held talks a place chooses from are those the send carries, placed as the matching API places them,
    the abstract itself left out, and a place that holds none is left out. It reports only on an abstract the stored
    test set tests; when the matching API cannot answer, there is no report. While the matching API is still judging
    anything for the abstract, there is no partial report: the answer is 202, saying how many restrictions are still
    being judged, to ask again shortly.
    *How:* code alone: what a place shows comes from the same two restricted searches the pages make, each asking for
    as many matches as its page does, read into the same related talks and pools, which hold what each box shows; the
    verdicts come from the talks restriction searched for each place, one search for each thousand of its talks; every
    search is made even while some are still being judged; the question and the answer are checked against the host
    app's contract.
    *File:* `recommendations.ts`

### Staying on

15. **The keep-alive stops the hosted database pausing, and only the scheduled call with the secret can use it.** A
    request without the secret, or with the wrong one, or when no secret is set, is refused and touches nothing. A
    failure answers only "The database read failed", and the error is logged on the server.
    *How:* code alone: Vercel's daily cron calls it with the secret; the secret is compared in constant time; it runs
    the one trivial read the store gives it.
    *File:* `keep-alive.ts`
