# Organiser console

The app has an organiser console at `/organiser`, reached from **Organiser console** in the attendee menu. AMS calls it "Isobar Program Builder (Demo)", with Papers, Sessions and Send to API in Confex's words. Any signed-in guest can withdraw or restore a talk, move it to another session, change a session's time and room, and send the programme to the conference API. The attendee app shows every change at once.

## Sub-features

- `org-list` lists talks 50 a page, with a search box and a status filter (All, Scheduled, Withdrawn, Changed), as a plain GET form.
- `org-withdraw` withdraws a talk, which leaves every attendee page, and restores it.
- `org-move` finds a session by search and moves the talk into it, after the session's last talk, in its room.
- `org-session` changes a session's date, start, end and room in meeting time. Every talk in it moves with it. An end before the start is refused by name.
- `org-send` sends the programme after a confirm, reports the counts, and lists the last ten sends.

## How to get to it (user POV)

- Open the menu, then **Organiser console**. The console's own bar has the sections, **Attendee app** and **Sign Out**.
- Open a talk from the list to withdraw or move it. Open a session from Sessions to change its time and room.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.
- The programme is as published. The developer console's **Changes from the published programme** says "No changes". If it does not, run the reset step below first.

These records are free for console recipes, because the attendee recipes and e2e tests never open them:

| | AMS |
| --- | --- |
| Talk | `498161`, J1.2, "Update on Development of the GeoXO Imager", in session `75968` |
| Its session, for time changes | `76231`, session 5, "Wind Energy Forecasting", 8:30 AM - 10:00 AM Mountain, Tuesday |
| Session to move into | search `Wind Energy Forecasting`, then `Move to 5` (`76231`) |
| Time labels | `Start (Mountain)`, `End (Mountain)` |
| Withdraw button | `Withdraw paper`, `Restore paper` |

Use `--computer`: the tables are wide. Every recipe that changes the programme ends with the reset step.

- **List and search, AMS.** Run `L ams /organiser org-list --computer --fill "Search papers=GeoXO Imager" --click "button=Search" --expect "link=Update on Development of the GeoXO Imager"`. The URL in the `.aria.txt` has `q=GeoXO+Imager`.
- **Withdraw, AMS.** Run `L ams /organiser/talks/498161 org-withdraw --computer --click "button=Withdraw paper" --expect "button=Restore paper"`. The first `definition` in the `.aria.txt` is `Withdrawn`. Prove it from a second page: `L ams /talks/498161 org-withdrawn --expect "link=Back to Home"`, whose `.aria.txt` says `We could not find that page.` Then reset.
- **Move.** Run `L ams "/organiser/talks/498161?sq=Wind Energy Forecasting" org-move --computer --click "button=Move to 5" --expect "link=5 - Wind Energy Forecasting"`. The first `definition` is `Moved`. Prove it from a second page: `L ams /sessions/76231 org-moved --expect "link=J1.2 Update on Development of the GeoXO Imager"`. Then reset.
- **Session time and room, AMS.** Run `L ams /organiser/sessions/76231 org-session --computer --fill "Start (Mountain)=14:45" --fill "End (Mountain)=16:00" --fill "Room=Hall Z" --click "button=Save session" --expect "status=Session saved"`. The `.aria.txt` shows `Tue, Jan 12, 2:45 PM - 4:00 PM` and every talk in the table starts 6 hours 15 minutes later. Prove it from a second page: `L ams /sessions/76231 org-session-attendee --expect "heading=Wind Energy Forecasting"`, whose `.aria.txt` shows `2:45 PM - 4:00 PM` and `Hall Z`. Then reset.
- **Bad times.** Run `L ams /organiser/sessions/76231 org-bad-times --computer --fill "End (Mountain)=08:00" --click "button=Save session" --expect "alert=The end must be after the start."`. Nothing is saved, so no reset is needed.
- **Send.** Run `L ams /organiser/send org-send --computer --click "button=Send programme" --click "button=Send now" --expect "status=Sent"`. The status reads `Sent 4,368 papers: …`, and the first row of **Recent sends** reads `Sent`.
- **Reset.** Run `L ams /developer org-reset --computer --click "button=Reset to published programme" --click "button=Reset now" --expect "status=Programme reset"`. The status counts what it put back.

## Gotchas

- Every look signs in as the same guest, and the programme is shared by every guest and the e2e suite. Run console recipes one at a time, and never while `npm run e2e` runs.
- The talk count in the console is higher than the count a send reports: breaks and talks with no abstract are never sent.
- Next.js puts an empty element with the role `alert` on every page. An `--expect "alert=…"` matches by text, so name the message.
- Times in the consoles are always meeting time, whatever the attendee app's `MST` or `MT` button says, because the session form reads times that way.
