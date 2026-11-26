# Our improvements — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of Our improvements: the changes we make to the base

### The list of changes

2. **Our improvements list their changes, each at a change point in the base.** After a talk's abstract, its related
   talks; in place of Conferences and Symposia's list, the list ordered around the demo's abstract. Each change has a
   label naming what it changed.
   *How:* code alone: a map from change point to its change.
   *File:* `changes.tsx`

### Changes on a talk's page

3. **In our improvements, every talk page shows a related-talks panel with the matching API's matches for that talk, and never breaks the page.** While loading it shows placeholders. When the API cannot answer, it says the related talks are unavailable
    right now; with none, it says so. Each match shows whether it is close or unexpected, its time, number, title and
    reason, and links to the talk.
    *How:* code alone: our improvements' change after a talk's abstract, outlined in gold; it loads in the browser after
    the page, so a slow API never holds up the talk.
    *File:* `related-talks.tsx`

### Changes to finding talks

4. **In our improvements, Conferences and Symposia puts the tracks with talks related to the demo's abstract first.**
   Tracks are ordered by how many of the matching API's matches for the fixed abstract each holds, the rest after them
   in AMS's order. The list is outlined in gold, naming the abstract; when the API cannot answer, AMS's order stays and
   the outline says so.
   *How:* code alone: our improvements' change to the conferences list.
   *File:* `programme-order.tsx`
