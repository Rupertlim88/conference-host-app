# Our improvements: conferences ranked — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the per-conference improvement

### On Conferences and Symposia

2. **In our improvements, Conferences and Symposia puts first the other conferences that hold a talk for the attendee's abstract, each with that talk and its reason.**
   The attendee's own conferences, those of the fixed abstract's session, are left out: they stay where AMS lists them,
   marked as the attendee's own. Every other conference that the matching API lists a pool for, around the fixed
   abstract, moves to the top, its best talk being the first its pool lists, the conference whose best talk scores
   higher first, and shows that talk's number and title, whether it is a close or an unexpected match, its day and
   time and the reason, linking to the talk. These
   picks sit in a gold box of their own at the top, naming the abstract; with none, the box at the top shows empty. The
   rest follow below it in AMS's order. When the matching API cannot answer, or the demo has no abstract, AMS's order
   stays below the box, and one line in the box says so.
   *How:* code alone: the improvement's change to the conferences list, from the matching API's sub-conference pools
   for the fixed abstract.
   *File:* `conference-picks.tsx`
