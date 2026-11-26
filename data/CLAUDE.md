# Data layer — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The database

2. **The database is Supabase's PostgreSQL database, always on.**

3. **The hosted database's login is stored locally, on the computer of each person who looks after the database.** Besides those computers, it is kept only by the host that runs the app, which needs it to read and write the data; it is never put in the repository, a pull request, the chat or a cloud Claude session. Migrating the hosted database, and loading the meeting's programme into it, are run from one of those computers.

## Security level

4. **The host app's data layer meets OWASP ASVS 5.0 at Level 1.** Every Level 1 requirement of OWASP ASVS 5.0 applies to it.

## The meeting's data

5. **The meeting's data holds only what the public programme shows.** Fields the public programme does not show, such as reviewers' ratings, submitters' comments or internal notes, are removed before the data is stored anywhere, including the repository, and are never kept or shown. Withdrawn entries are left out.

6. **Data is gathered gently.** Where a society offers a public download, it is used; where pages must be read one by one, they are read slowly enough never to burden the society's site, and each page is read once and kept.

7. **The whole published programme is loaded, and a test set chooses which of its talks the demo holds.** The load, run from one of the computers that look after the database, stores every talk AMS publishes. The demo holds and shows only the talks of the latest test set, or the sample until a test set arrives. Choosing which loaded talks the demo holds is not loading: the host app does it when a test set arrives, and every session and conference stays.
