# Our versions

A gold demo bar sits at the bottom of every attendee page. It names the version shown, AMS's meeting app (the base) or Our improvements, and its button switches to the other; pressing Control on its own does the same. In Our improvements, each change shows in a gold outline with a label saying what changed. The bar also links the organiser and developer consoles.

## Sub-features

- `bar` names the version and switches it; `control` switches on Control pressed and released alone.
- `gold` outlines each change with a label, such as "Our change: related talks".
- `programme-order` orders Conferences and Symposia around the demo's fixed abstract, with conferences holding its matches first.

## How to get to it (user POV)

- On any attendee page, the bar at the bottom right.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold. For the order step, the developer console recipe's fixed abstract step has fixed the demo to `484769`.

- **Switch by button.** Run `L ams /programs switch --computer --click "button=Switch to Our improvements" --expect "button=Switch to AMS's meeting app"`. The `.aria.txt` has `Showing: Our improvements` and `Our change: conferences ordered around your abstract`.
- **Switch by Control.** Run `L ams /programs control --computer --press Control --expect "button=Switch to AMS's meeting app"`.
- **Order around the abstract.** In the `.aria.txt` of either step, the note reads `Ordered around your abstract: 10.2 - Understanding and Predicting El Niño…`, and the first links carry `1 related talk`, before `Events`.

## Gotchas

- A look's switch lasts only for that look: the saved state is the one from signing in, so every look starts in the base.
- The bar is fixed to the window, so a full-page screenshot shows it over the page's middle.
