# Our improvements: each time block's recommendations — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the per-time-block improvement

### On the Meeting Calendar

2. **In our improvements, each time block of the Meeting Calendar starts with up to two sessions recommended around the demo's abstract.**
   A time block is every session that starts at the same time on that day. Its recommendations are the sessions of the
   talks the matching API lists in its pool for that block, for the fixed abstract: at most two, from different
   sessions, in the matching API's order, and never padded with weak ones. Each shows whether it is a close or an
   unexpected match, the reason, and the time of its related talk. They sit at the top of the block in a gold outline
   that opens with the block's time as a heading, like AMS's own, so that it reads as the start of that block; the rest of the block follows in AMS's order, without them. A
   block with no recommendation opens with its box empty, and the rest of the block stays as AMS has it. When the
   matching API cannot answer, every block's box is empty, the rest of the calendar stays as AMS has it, and one gold
   note says so. With a test set's layout, the day holds the sessions the layout places on it, at their start there,
   under one gold note saying the sessions and talks sit where the test set lays them out.
   *How:* code alone: our improvements' change to the calendar's day, from the backend's time-block pool for the fixed
   abstract, the one that starts when the block does, which holds the first two talks the matching API lists whose
   session starts with the block; the matching API lists at most one talk from each session in a time block.
   *File:* `time-block-picks.tsx`
