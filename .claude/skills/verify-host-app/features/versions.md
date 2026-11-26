# Our versions

A gold demo bar sits at the bottom of every attendee page. It names the version shown, AMS's meeting app (the base) or Our improvements, and its button switches to the other; pressing Control on its own does the same. In Our improvements, each change shows in a gold outline with a label saying what changed. Four of the five changes are picked for the demo's fixed abstract: Conferences and Symposia ranked for it, each calendar day's best talks, each calendar time block's recommended sessions, and a session's talk to come for. The bar also links the organiser and developer consoles.

## Sub-features

- `bar` names the version and switches it; `control` switches on Control pressed and released alone.
- `gold` outlines each change with a label, such as "Our change: related talks".
- `conference-picks` puts first, in Conferences and Symposia, the other conferences holding the fixed abstract's matches, the one whose best talk scores higher first. Each shows that talk's number and title, kind of match, day and time, and reason. The attendee's own conferences stay in AMS's place, marked "Your conference"; the rest keep AMS's order.
- `day-picks` opens each Meeting Calendar day with up to three of the abstract's matches that start that day, from different sessions, in a gold outline. A day with none shows nothing.
- `calendar-picks` starts each time block that holds the abstract's matches with up to two recommended sessions, in a gold outline that opens with the block's start time as a heading.
- `session-picks` outlines in gold, in its place, the session's talk that holds the abstract's best match: "come for this talk", or "visit this board first" in a poster session.
- `api-down`: without the conference API, the conferences list and the calendar keep AMS's order, each with one gold line saying so, and session pages stay as AMS has them.

## How to get to it (user POV)

- On any attendee page, the bar at the bottom right. Then open Conferences and Symposia, the Meeting Calendar, or a session.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.
- The default fixed abstract is `498388`, 10.1 "Emerging Satellite Constraints on Fire Combustion…", in the 29th Conference on Atmospheric Chemistry. Its one local match, `498631` (S282), is in the 26th Annual Student Conference, in poster session `75479` (Radar Meteorology), Sunday, January 10, 2027 at 2:30 PM.
- For fuller pages, fix the demo to `497087` with the developer console: `L ams /developer dev-fix --computer --fill "Talk id=497087" --click "button=Fix the demo to this talk" --expect "paragraph=208 - Cirrus Cloud Thinning in Mountainous Regions using a High-Resolution Atmosphere Model"`. Its own conferences are the 19th Symposium on Aerosol-Cloud-Climate Interactions and the Fourth Symposium on Cloud Physics. Its three local matches are all on Tuesday, January 12, 2027: `497167` (5.1, session `77136`, 8:30 AM, 23rd Major Weather Impacts of 2026), `497095` (J7.1, joint session `76871`, 1:45 PM, 28th Conference on Satellite Meteorology, Oceanography, and Climatology) and `497089` (428, poster session `77153`, 3:00 PM, 25th Symposium on the Coastal Environment). Fix it back to `498388` the same way when you finish.

Steps:

- **Switch by button.** Run `L ams /programs switch --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. The `.aria.txt` has `Showing: Our improvements` and `Our change: other conferences, ranked for your abstract`.
- **Switch by Control.** Run `L ams /programs control --computer --press Control --expect "button=Switch to AMS's meeting app"`.
- **Conferences, base.** Run `L ams /programs programs-base --computer --expect "heading=Conferences and Symposia"`. The `.aria.txt` has no `Our change`.
- **Conferences ranked.** Run `L ams /programs programs-improved --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. With `498388`, after the page's heading come `Our change: other conferences, ranked for your abstract` and `Picked for your abstract: 10.1 Emerging Satellite Constraints…`, then a list with one item: link `26th Annual Student Conference` (`/programs/1982`), link `S282 Validation of Radar-defined Hydrometeor Classification…` (`/talks/498631`), `Close match Sun, Jan 10 · 2:30 PM` and `Why: …`. Then the heading `The rest, in AMS's order` and AMS's list, holding `29th Conference on Atmospheric Chemistry Your conference` in its place. With `497087`, the first list holds Coastal Environment, Satellite Meteorology and Major Weather Impacts, and the rest holds two `Your conference` marks.
- **Calendar, base.** Run `L ams /calendar/2027-01-10 cal-base --computer --expect "heading=Sunday, January 10, 2027"`. The `.aria.txt` has no `Our change`, and Radar Meteorology is under `2:30 PM - 4:30 PM`.
- **Calendar picks.** Run `L ams /calendar/2027-01-10 cal-improved --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. Compared with the base `.aria.txt`, three things change. After the strip of days: `Our change: your best talks today`, `Picked for your abstract, from every event on Sunday`, and one item: `2:30 PM`, the link to `/talks/498631`, `Close match`, `26th Annual Student Conference` and `Why: …`. Before `2:30 PM - 3:30 PM`: `Our change: recommended around your abstract`, the heading `2:30 PM`, and an item linking `/sessions/75479` that reads `Close match 1 related talk First related talk at 2:30 PM`. And Radar Meteorology leaves `2:30 PM - 4:30 PM`.
- **A full day, and a day with none.** With `497087`, repeat the picks step on `/calendar/2027-01-12` as `tue-improved`: three day picks, then gold time-block outlines with the headings `8:30 AM`, `1:45 PM` and `3:00 PM`. On `/calendar/2027-01-11`, as `mon-improved`, the `.aria.txt` has no `Our change`.
- **One answer for each page.** Count `grep -c 'matches:search","remoteAddress' .verify/run/conference-api.log` before and after the `tue-improved` look. It rises by 1, though the page shows four gold outlines.
- **Session, base.** Run `L ams /sessions/75479 poster-base --computer --expect "heading=Presentations"`.
- **Session picks.** Run `L ams /sessions/75479 poster-improved --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. Compared with the base, the talk's link has `Our change: visit this board first` before it and `Close match` and `Why, for your abstract: …` after it; nothing else changes. With `497087`, `/sessions/77136` reads `Our change: come for this talk` around 5.1 at 8:30 AM, and 5.4 at 9:15 AM follows outside the outline.
- **API down.** Stop only the conference API with `kill -TERM -$(cat .verify/run/conference-api.pid)`, then repeat the improved steps as `down-programs`, `down-calendar` and `down-session`. Conferences: `The matching API cannot answer right now, so AMS's order stays.` over AMS's order, with the own conferences still marked. Calendar: the base `.aria.txt` with two lines added after the strip of days, `The matching API cannot answer right now, so no talks are picked for your abstract today.` and `The matching API cannot answer right now, so no sessions are recommended around your abstract and the calendar stays as AMS has it.`, each under its gold label. Session: the Presentations list is the base's. Afterwards run `verify.sh stop ams`, then `verify.sh launch ams`.

## Gotchas

- A look's switch lasts only for that look: the saved state is the one from signing in, so every look starts in the base.
- The bar is fixed to the window, so a full-page screenshot shows it over the page's middle.
- Local matches are placeholders that all score 0.5. Ties keep AMS's order in the conferences list and the API's order in a day's picks.
- The sample keeps few talks per session; most sessions holding a match show only that talk. `77136` shows two.
- The fixed abstract stays in the database through a stop and launch. Fix it back to `498388` when you finish.
