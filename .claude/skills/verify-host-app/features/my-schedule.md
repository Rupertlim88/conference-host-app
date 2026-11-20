# My Schedule

A guest stars a talk or session with the star button. Starred items appear on **My Schedule**, grouped into Presentations and Sessions. Starring again removes the item.

## Sub-features

- `star-add` turns the star on and lists the talk on My Schedule.
- `star-remove` turns the star off and removes the talk from My Schedule.
- `schedule-empty` explains how to add items when nothing is starred.

## How to get to it (user POV)

- The star button on a talk or session page.
- **My Schedule** in the menu or the bottom bar.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold. A new guest has nothing starred.

- **Empty schedule.** Run `L ams /schedule empty --expect "heading=My Schedule"`. The `.aria.txt` contains `You have not starred anything yet.`
- **Star.** Run `L ams /talks/493803 star --click "button=Add to My Schedule" --expect "button=Remove from My Schedule"`.
- **Second view.** Run `L ams /schedule listed --expect "link=Snow Squall"`.
- **Unstar.** Run `L ams /talks/493803 unstar --click "button=Remove from My Schedule" --expect "button=Add to My Schedule"`, then `L ams /schedule cleared --expect "heading=My Schedule"`. The `.aria.txt` has no `Snow Squall` link.
- **GSA.** Repeat the star and second view with `L gsa /talks/16121 star --click "button=Add to My Schedule" --expect "button=Remove from My Schedule"` and `L gsa /schedule listed --expect "link=Multi-Objective Optimization"`.

## Gotchas

- The button is disabled while it saves and changes name only after the server confirms. Always end with `--expect` on the new button name.
- Stars belong to the guest. A launch starts a new guest, so stars from an earlier launch do not show.
