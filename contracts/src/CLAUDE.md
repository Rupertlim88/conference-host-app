# The host app's contract — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the forms that pass between the host app's parts

2. **The attendee app and the backend pass the programme in fixed forms.** Ids are 1–64 letters, digits, dots,
   underscores or hyphens. Search takes 2–100 characters; a note at most 5,000; no text sent in may hold a NUL
   character. Only the programmes AMS's menu opens by name, Program Highlights' lists and the two pages of names can be
   asked for. The meeting, days, tracks, sessions, talks, people, search results, schedule, notes, the signed-in guest,
   related talks, highlight lists, pages of names and the view around the demo's fixed abstract each have fixed forms:
   a short form for lists and a full one where a page shows more. The view around the abstract carries the conferences
   of the abstract's session, and the matching API's pools around it by kind: each other conference by its track id,
   each day by its date, each time block by its start instant and each session by its id, each pool holding at least
   one match, with the conferences of each match's talk.
   *How:* code alone: zod schemas, with types inferred from them.
   *File:* `programme.ts`

3. **The organiser console's lists and edits have fixed forms and limits.** Pages of 50, page numbers 1–10,000,
   searches up to 100 characters, a paper's status filter and change kind, the lists of papers and sessions, a paper's
   move to another session, the session change (a date and 24-hour clocks, each of which may be left empty, and a room
   up to 200 characters), the changes and the reset's result.
   *How:* code alone: zod schemas.
   *File:* `organiser.ts`

4. **A send and the developer console's checks have fixed forms.** A send run's state and counts, the connection
   test's outcome and HTTP status, the API status the developer console shows, and the talk the demo is fixed to.
   *How:* code alone: zod schemas.
   *File:* `sending.ts`

5. **The tester's three requests have fixed forms.** The programme map, the test set and the report on each abstract
   tested have one form each, checked where they enter and leave; AMS ids are strings, times are the meeting's clock
   to the minute, and the report passes on each verdict exactly as the matching API gave it. How many talks each place
   shows visitors is fixed in one place, which the pages and the report both read.
   *How:* code alone: one schema for each form.
   *File:* `tester.ts`
