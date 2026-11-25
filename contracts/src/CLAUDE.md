# The host app's contract — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the forms that pass between the host app's parts

2. **The attendee app and the backend pass the programme in fixed forms.** Ids are 1–64 letters, digits, dots,
   underscores or hyphens. Search takes 2–100 characters; a note at most 5,000; no text may hold a NUL character.
   The meeting, days, tracks, sessions, talks, people, search results, schedule, notes, the signed-in guest and related
   talks each have one form.
   *How:* code alone: zod schemas, with types inferred from them.
   *File:* needed

3. **The organiser console's lists and edits have fixed forms and limits.** Pages of 50, page numbers 1–10,000,
   searches up to 100 characters, a paper's status filter and change kind, the session change (date, 24-hour clocks or
   empty, a room up to 200 characters), the changes and the reset's result.
   *How:* code alone: zod schemas.
   *File:* needed

4. **A send and the developer console's checks have fixed forms.** A send run's state and counts, the connection
   test's outcome and HTTP status, and the API status the developer console shows.
   *How:* code alone: zod schemas.
   *File:* needed
