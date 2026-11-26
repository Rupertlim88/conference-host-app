# Our versions

A gold demo bar sits at the bottom of every attendee page. It names the version shown, AMS's meeting app (the base) or Our improvements, and its button switches to the other; pressing Control on its own does the same. In Our improvements, each change shows in a gold outline with a label saying what changed. The bar also links the organiser and developer consoles.

## Sub-features

- `bar` names the version and switches it; `control` switches on Control pressed and released alone.
- `gold` outlines each change with a label, such as "Our change: related talks".
- `programme-order` orders Conferences and Symposia around the demo's fixed abstract, with conferences holding its matches first.
- `calendar-picks` starts each Meeting Calendar time block that holds the fixed abstract's matches with up to two recommended sessions, in a gold outline labelled with the block's time; without the API, one gold note says so and AMS's day stays.

## How to get to it (user POV)

- On any attendee page, the bar at the bottom right.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold. For the order step, the developer console recipe's fixed abstract step has fixed the demo to `484769`. The calendar steps need the default abstract, `498388`: its one local match, `498631`, is in poster session `75479` (Radar Meteorology), Sunday, January 10, 2027 at 2:30 PM.

- **Switch by button.** Run `L ams /programs switch --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. The `.aria.txt` has `Showing: Our improvements` and `Our change: conferences ordered around your abstract`.
- **Switch by Control.** Run `L ams /programs control --computer --press Control --expect "button=Switch to AMS's meeting app"`.
- **Calendar, base.** Run `L ams /calendar/2027-01-10 cal-base --computer --expect "heading=Sunday, January 10, 2027"`. The `.aria.txt` has no `Our change`, and Radar Meteorology is under `2:30 PM - 4:30 PM`.
- **Calendar picks.** Run `L ams /calendar/2027-01-10 cal-improved --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. The `.aria.txt` has `Our change: recommended around your abstract · 2:30 PM`, then a list whose item links `/sessions/75479` and reads `Close match 1 related talk First related talk at 2:30 PM`. Compared with the base `.aria.txt`, nothing else changes except that Radar Meteorology leaves `2:30 PM - 4:30 PM`.
- **Calendar, API down.** Stop only the conference API with `kill -TERM -$(cat .verify/run/conference-api.pid)`, then repeat the picks step as `cal-api-down`. The `.aria.txt` is the base's with one gold note: `Our change: recommended around your abstract` and `The matching API cannot answer right now, so no sessions are recommended around your abstract and the calendar stays as AMS has it.` Afterwards run `verify.sh stop ams`, then `verify.sh launch ams`.
- **Order around the abstract.** In the `.aria.txt` of either step, the note reads `Ordered around your abstract: 10.2 - Understanding and Predicting El Niño…`, and the first links carry `1 related talk`, before `Events`.

## Gotchas

- A look's switch lasts only for that look: the saved state is the one from signing in, so every look starts in the base.
- The bar is fixed to the window, so a full-page screenshot shows it over the page's middle.
