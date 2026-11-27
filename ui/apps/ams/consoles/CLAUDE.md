# The consoles — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the organiser and developer consoles

### The organiser console

2. **The consoles have their own frame, with tables, pages of fifty and Mountain time.** A dark header with the
    console's name ("Program Builder" or "Developer Console"), its sections (the developer console's include the
    organiser console), a link to the attendee app and sign-out.
    Tables are dense; a pager shows "Page x of y" and hides when one page holds everything. Times are always Mountain
    time, written one way in every console, and a stored time fills a console's time fields, such as a session's
    form, as the meeting's own clock shows it. Chips show a paper's status (scheduled,
    withdrawn, moved, rescheduled) and a session's (published, changed); a summary counts the changes. Searches are cut
    to 100 characters and an unknown filter means all; a page past the end shows the last page, and any other page
    that is not a page number shows the first.
    *How:* code alone; the two console layouts count with this file.
    *File:* `console-frame.tsx`

3. **Organisers find any paper, withdraw or restore it, and move it to another session.** Papers are searched and
    filtered by status, 50 a page. A paper's page shows its status, presenter, session, time and room. Withdraw and
    Restore cannot be pressed twice and say when a change did not save. A paper is moved by searching for a session;
    its own session is marked. A withdrawn paper has no link to the attendee app.
    *How:* code alone; the papers pages count with this file.
    *File:* `organiser-papers.tsx`

4. **Organisers change a session's date, times and room, and are told by name why a change is refused.** Sessions are
    searched, 50 a page. A session's page shows its status and every paper in it, withdrawn ones too. Times are in
    Mountain time; leaving them empty clears them. A refusal names its reason: a time half given, an end not after the
    start, or a day more than a day outside the meeting.
    *How:* code alone; the sessions pages count with this file.
    *File:* `organiser-sessions.tsx`

5. **Organisers send the programme to the matching API, after confirming, and see the last ten sends.** The page says
    withdrawn papers are left out and shows the changes. Send asks to confirm, then shows it is sending. It reports what
    was sent, added, changed and withdrawn, or the failure, or that a send is already running.
    *How:* code alone; the send page counts with this file.
    *File:* `send.tsx`

### The developer console

6. **The developer console shows the matching API's settings, tests the connection, and can put the published programme back.** It shows the API's address (or that none is set), whether a key is set, and the last send. The
    test reports one of: ok (with its HTTP status and time), not set, key refused, no programme or no talks, unreachable,
    or an unexpected answer. It can send the programme again, and put the published programme back after confirming,
    saying how many papers and sessions changed. It shows the abstract the demo is fixed to, and fixes it to another by
    the talk's id, saying why a talk is refused; a save or a test that fails for any other reason says it did not
    finish.
    *How:* code alone; the developer page counts with this file.
    *File:* `developer.tsx`
