# The meeting's programme — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the meeting's programme, as kept

2. **The host app holds every talk of the AMS 2027 Annual Meeting, as AMS published it, public fields only.** Every talk and poster of the AMS 107th Annual Meeting, with its abstract and everything else the public programme shows, is kept here, so that the demo's sample, and any test set a tester sends, are drawn from the whole meeting: the four files of AMS's public programme (papers, sessions, time slots and programmes, with the exhibit hall, career fair and sponsor listings that AMS's menu links), Program Highlights' lists and the officers and committees pages of names, refreshed as AMS adds to it. Where the host app does not yet have part of the meeting, it may copy it from the conference matching tester's snapshot of the same meeting, which was read from the same public programme.
   *How:* code fetches the files (the rule on fetching AMS's public programme, in the store's code), keeps only the public fields, and prints how many rows each holds and the hashes of the unfiltered downloads; Claude copies those into the folder's note, with when and from where the files were fetched, so a later download can be compared.
   *File:* `ams2027/`
