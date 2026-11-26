# This UI

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification for this UI

### What this UI is

2. **This UI is the demo for the American Meteorological Society (AMS).** It approximates the meeting app AMS attendees will use at the 107th Annual Meeting: the Confex Meeting App, on the web at ams.confex.com/ams/107ANNUAL/meetingapp.cgi and as a phone app. It follows that app's general layout, screens and flow, not its exact design, at phone and computer sizes, with its own name and logo, and its name says it is a demo.

3. **It carries a sample of the programme of the AMS 107th Annual Meeting (Denver, 10–14 January 2027) as published so far**, refreshed as AMS adds to it: every conference, symposium and event, with all of their sessions, and five abstracts from each, so that the matching API's results can be checked quickly. It shows each talk and poster it carries with its title, presenters, affiliations, session, day, time, room and abstract. Withdrawn entries are left out.

4. **In our improvements, every talk page shows a related-talks panel with the conference API's matches for that talk.** This panel is the point of the demo. The base, which shows only what AMS's own page shows, has no such panel.

### What it takes from AMS, and what it never takes

5. **Every button, conference, event and talk of the AMS meeting app is in the demo, organised as AMS organises them; only the design and the words differ.** Home and the menu offer every button on the AMS meeting app's main screen, with the same sub-items. Every conference, symposium and event in the meeting calendar is there, and opening one shows all of its talks, organised as AMS organises them. The lists of committees, officers, exhibitors, the career fair and sponsors come from AMS's public pages; Program Highlights, General Information, Attendee Resources and Technical Support open short pages in the demo's own words.

6. **The demo never copies AMS's own content.** It never shows the society's logo, its welcome and descriptions, its instructions for joining online, such as by Zoom, its location section, or its thanks to sponsors. Its words differ from AMS's, and that is expected.

### Our versions

7. **The demo shows the base AMS meeting app or one of our versions of it, and a button switches between them.** The base is the meeting app as AMS has it, as the rules above describe. Each of our versions is the base with changes of any size: a list reordered, things moved to other places in the site, pages reorganised, or larger changes. Every change from the base is outlined in gold, so anyone can see what AMS has and what we changed. Several versions are kept side by side, so different options can be shown in a meeting, and a version is added, changed or removed without changing the base or the other versions. Our versions live inside this UI: a button on the screen, and a key, switch from the base to a version and between versions, with no change of UI.

8. **The demo is fixed to one abstract, set in the developer console.** The demo opens as if the person using it were the author of one AMS 2027 abstract, the same for everyone, so that its results can be controlled. Our versions make their changes around that abstract, using the matching API's results for it.

### Organisers

9. **The organiser side approximates the Confex tools AMS uses to collect abstracts and build its programme**, from what is publicly known about them.

### This UI's further CLAUDE.md files

10. **This UI's code sits in five folders, each with a CLAUDE.md holding one rule for each of its files.** The shared folder holds what every screen uses; the base folder, the AMS meeting app as AMS has it; the improvements folder, Our improvements; the versions folder, the switching between them; and the consoles folder, the organiser and developer consoles. The files the web framework needs in its own folders, such as its pages, which read what their address needs from the backend, hand over to one file, and count with that file.
