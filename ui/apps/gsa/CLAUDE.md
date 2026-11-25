# This UI

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification for this UI

### What this UI is

1. **This UI is the demo for the Geological Society of America (GSA).** It replicates the meeting app GSA attendees use: "GSA Meetings Guide", built on Guidebook, with search, a personal schedule, maps, exhibitors, notes and calendar sync. Because that app runs only on phones, it is copied from its app store pages and screenshots. It follows that app's layout, screens and flow as closely as possible, at phone and computer sizes, with its own name and logo, and its name says it is a demo.

2. **It carries the programme of GSA Connects 2026 (Denver, 11–14 October 2026)**: every session and talk with its number, title, authors, affiliations, abstract, date, time and room, taken from GSA's public programme pages.

3. **On every talk page, a related-talks panel shows the conference API's matches for that talk.** This panel is the point of the demo.

### Organisers

4. **The organiser side approximates OpenWater, the system GSA uses to collect abstracts and build its programme**, from what is publicly known about it.
