# Host app verification map

This folder lists the user-facing features of the AMS app (Isobar Meetings 2027), and how to prove each one in the running app. Read this index, then use the matching feature file as the recipe.

## Baseline preconditions

- `verify.sh launch S` printed `READY`, and `verify.sh doctor S` printed only `ok:` lines.
- The guest is new: no stars and no notes. A launch starts a new guest.
- `L` below stands for `npx tsx .claude/skills/verify-host-app/scripts/look.mts`.

## Driving conventions

- Use ARIA roles and accessible names, as the recipes do. Never select by CSS class or position.
- Use the fixed records below. Their ids and times come from AMS's 2027 programme.
  - The demo carries a sample: every conference, symposium and event with all their sessions, and five talks with an abstract from each.
  - AMS talk `484769` is 10.2, "Understanding and Predicting El Niño: Tony Busalacchi’s Legacy to Climate Science", Wednesday, January 13, 2027, 11:00 AM - 11:15 AM, Mile High 2A (Colorado Convention Center), in session `76558`. Locally the placeholder engine gives it two matches, so the related-talks and versions recipes use it.
  - AMS talk `493803` is J1.2, "What is a Snow Squall? What Eight Years of Snow Squall Warnings Tells Us.", Monday, January 11, 2027, 8:45 AM - 9:00 AM, room 403 (Colorado Convention Center), in joint session `77102` (J1, "Decision Support I").
- Run each recipe on the phone first, then again with `--computer` when the feature's layout differs between the two.

## Proof and skip reporting

- End every action with `--expect` on its result.
- Prove a saved change from a second page.
- Report each look's command and the two files it saved.
- If a recipe cannot run, report the command, its output, and the unmet precondition. Never report a feature as verified through a different entry point.

## Feature entry contract

Each feature file has an H1 title and one paragraph on what the user sees, then four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with look.mts`, and `Gotchas`.

## Features

- [Sign-in gate](./sign-in.md): signed-out visitors land on the sign-in page.
- [Browse the programme](./browse-programme.md): home, the day calendar, a session, and a talk.
- [AMS's buttons and pages](./ams-pages.md): AMS's menu and home tiles, and every page they open.
- [Our versions](./versions.md): the demo bar and the Control key switch between AMS's meeting app and Our improvements, whose changes show in gold: the conferences ordered around the abstract, and each calendar time block's recommended sessions.
- [Related talks](./related-talks.md): in Our improvements, the conference API's matches on every talk page. This is the demo.
- [My Schedule](./my-schedule.md): starring a talk and finding it on My Schedule.
- [Search](./search.md): finding a talk by its title.
- [Organiser console](./organiser-console.md): withdraw, move and retime talks, and send the programme to the conference API.
- [Developer console](./developer-console.md): the API connection, test, send again, reset, and the demo's fixed abstract.
