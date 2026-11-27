# Our improvements — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of Our improvements: the changes we make to the base

### Our improvements as a set

2. **Our improvements are a set of improvements, each in a folder of its own, which can be added or removed one at a time.** Each improvement is one change to AMS's meeting app, at one change point in the base, and its folder holds its own CLAUDE.md, with one rule for each of its files. One list in this folder names the improvements Our improvements has switched on: adding an improvement is a new folder and a line in that list, and removing one is taking its line out, without changing any other improvement, as the conference API keeps its matching engines side by side. No improvement uses another improvement's code; what several share sits in the base, in the shared folder, or in the matches folder.

3. **Every improvement gets its matches from the same system: the host app's requests to the matching API.** The backend asks the matching API for them, through the host app's one connection to it, and an improvement never works matches out for itself or asks anywhere else. Each request names the kind of match the improvements it serves show: the whole conference, around the talk on the screen, for related talks; and, in one request around the attendee's own abstract, each other conference, each day, each time block and each session, which those improvements share in one answer on each page through the matches folder. The backend groups that answer into a pool for each place, holding exactly what the place's box shows, and each improvement shows only what its own kind of pool holds, never sorting matches into pools or choosing which of a pool's matches to show.
