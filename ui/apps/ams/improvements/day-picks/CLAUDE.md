# Our improvements: each day's best talks — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the per-day improvement

### On the Meeting Calendar

2. **In our improvements, each day of the Meeting Calendar starts with the attendee's best talks that day.**
   Above the day's first time block sit up to three talks from any event that day, from different sessions, chosen from
   the matching API's matches for the fixed abstract, the better score first and never padded with weak ones. Each
   shows its time, number and title, whether it is a close or an unexpected match, its conference and the reason, and
   links to the talk. They sit in a gold outline saying they were picked for the attendee's abstract. A day with none
   shows the box empty; when the matching API cannot answer, one line there says so.
   *How:* code alone: the improvement's addition above the calendar's day, from the fixed abstract's matches that start
   on that day.
   *File:* `day-picks.tsx`
