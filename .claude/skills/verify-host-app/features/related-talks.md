# Related talks

In Our improvements, every talk page has a **Related talks** panel, in a gold outline labelled "Our change: related talks", subtitled "Talks related to this one, found by the conference API". It lists up to five talks the conference API matched to this one. Each shows a match kind, the talk's day and time, a link to the talk, and the reason the API gave. With no matches, the panel is empty: only its heading and subtitle. This panel is what the demo shows societies.

## Sub-features

- `related-list` shows up to five matches, each linking to a talk in the same app.
- `related-kind` labels each match "Close match" or "Unexpected match".
- `related-reason` shows the reason text the API returned.
- `related-empty` shows only the panel's heading and subtitle when the talk has no matches.
- `related-unavailable` says "Related talks are unavailable right now." when the API does not answer.

## How to get to it (user POV)

- Switch to Our improvements with the demo bar (or press Control on its own), open any talk page, and scroll below the abstract. AMS's meeting app, the base, has no panel.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold, including doctor's line about the conference API.

- **No panel in the base.** Run `L ams /talks/484769 base --expect "heading=Abstract"`. The `.aria.txt` has no `Related talks`.
- **Panel, AMS.** Run `L ams /talks/484769 related --click "button=Switch to Our improvements" --expect "heading=Related talks"`. In the `.aria.txt`, the `region "Related talks"` holds at least one link to `/talks/…`, and the text `Talks related to this one, found by the conference API`.
- **Follow a match.** Take a talk title from the panel in the `.aria.txt` of the last step, then run `L ams /talks/484769 follow --click "button=Switch to Our improvements" --click "link=<title>" --expect "heading=Abstract"`. The URL in the new `.aria.txt` is that talk's page.
- **Empty panel.** Run `L ams /talks/497950 empty --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app" --press Shift --press Shift`. In the `.aria.txt`, the `region "Related talks"` holds only its heading and `Talks related to this one, found by the conference API`. The `.png` shows the panel with no grey placeholders.
- **API down.** Stop only the conference API with `kill -TERM -$(cat .verify/run/conference-api.pid)`. Run `L ams /talks/484769 down --click "button=Switch to Our improvements" --expect "paragraph=Related talks are unavailable right now."`. The `.aria.txt` contains `Related talks are unavailable right now.` and the rest of the talk page. Afterwards run `verify.sh stop ams`, then `verify.sh launch ams`.

## Gotchas

- Locally the matches are placeholders, and the reason says so. Seeded over the whole programme and then cut to the sample, some talks have none: `484769` has two, `497950` none. Check the panel's shape and links, not match quality.
- A look's switch lasts only for that look: the saved state is the one from signing in. Switch in the same look as the check.
- The panel streams in after the rest of the page, behind placeholders that already show its heading. `--expect "heading=Related talks"` waits for the placeholders only: wait for a match link, such as `--expect "link=J13.1 When Disaster Doesn't Follow the Script"` on `484769`, or for the unavailable paragraph. An empty panel has nothing to wait for, and its placeholders have no role, so the `.aria.txt` looks the same while it loads. Add `--press Shift --press Shift` after the switch, which waits for the network twice more, and check the `.png`.
