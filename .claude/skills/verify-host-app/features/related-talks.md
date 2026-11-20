# Related talks

Every talk page has a **Related talks** panel, subtitled "Picked for you by the conference API". It lists up to five talks the conference API matched to this one. Each shows a match kind, the talk's day and time, a link to the talk, and the reason the API gave. This panel is what the demo shows societies.

## Sub-features

- `related-list` shows up to five matches, each linking to a talk in the same app.
- `related-kind` labels each match "Close match" or "Unexpected match".
- `related-reason` shows the reason text the API returned.
- `related-unavailable` says "Related talks are unavailable right now." when the API does not answer.

## How to get to it (user POV)

- Open any talk page and scroll below the abstract.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold, including doctor's line about the conference API.

- **Panel, AMS.** Run `L ams /talks/493803 related --expect "heading=Related talks"`. In the `.aria.txt`, the `region "Related talks"` holds at least one link to `/talks/…`, and the text `Picked for you by the conference API`.
- **Panel, GSA.** Run `L gsa /talks/16121 related --expect "heading=Related talks"`. Same checks.
- **Follow a match.** Take a talk title from the panel in the `.aria.txt` of the last step, then run `L ams /talks/493803 follow --click "link=<title>" --expect "heading=Abstract"`. The URL in the new `.aria.txt` is that talk's page.
- **API down.** Stop only the conference API with `kill -TERM -$(cat .verify/run/conference-api.pid)`. Run `L ams /talks/493803 down --expect "heading=Related talks"`. The `.aria.txt` contains `Related talks are unavailable right now.` and the rest of the talk page. Afterwards run `verify.sh stop ams`, then `verify.sh launch ams`.

## Gotchas

- Locally the matches are placeholders: each talk matches the next three talks, and the reason says it is a placeholder. Check the panel's shape and links, not match quality.
- A message with no ARIA role, such as the unavailable message, cannot be an `--expect` target. Check it in the `.aria.txt`.
- The panel loads after the page. `--expect "heading=Related talks"` waits for the heading only. Wait for a match link before claiming the list filled.
