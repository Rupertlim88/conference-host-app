# Developer console

The app has a developer console at `/developer`, reached from **Developer console** on the demo bar. It shows how the app reaches the conference API, and lets any signed-in guest test the connection, send the programme again, reset the programme to the published one, and fix the demo to one abstract.

## Sub-features

- `dev-status` lists the conference API address (without credentials), whether a key is set, the last send, and the changes from the published programme.
- `dev-test` makes one `matches:search` call and says what it found: "Connection works (200, N ms)." or why not.
- `dev-send-again` sends the programme after a confirm, like the organiser console's send.
- `dev-reset` puts back the published programme after a confirm, and says how many talks and sessions it put back.
- `dev-fixed` shows the abstract the demo is fixed to, and fixes it to another talk by its id, or says why a talk is refused.

## How to get to it (user POV)

- On the demo bar at the bottom of every attendee page, **Developer console**.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.

- **Status.** Run `L ams /developer dev-status --computer --expect "heading=Developer console"`. The `.aria.txt` lists the terms `Conference API address`, `API key` and `Last send`, with `http://127.0.0.1:8787/` and `Set` as the first two definitions.
- **Test connection.** Run `L ams /developer dev-test --computer --click "button=Test connection" --expect "status=Connection works"`.
- **Send again.** Run `L ams /developer dev-send --computer --click "button=Send programme again" --click "button=Send now" --expect "status=Sent"`. Prove it from a second page: `L ams /organiser/send dev-send-runs --computer --expect "heading=Recent sends"`, whose first row reads `Sent`.
- **Reset.** Make one change first, such as the withdraw step in the organiser console recipes. Run `L ams /developer dev-reset --computer --click "button=Reset to published programme" --click "button=Reset now" --expect "status=Programme reset"`. The status reads `Programme reset: 1 paper and 0 sessions put back.` Prove it from a second page: the withdrawn talk's attendee page shows its heading again.

- **Fixed abstract.** Run `L ams /developer dev-fix --computer --fill "Talk id=484769" --click "button=Fix the demo to this talk" --expect "paragraph=10.2 - Understanding and Predicting El Niño: Tony Busalacchi’s Legacy to Climate Science"`. Prove it from a second page with the versions recipe's conferences step, whose note names that talk.
- **Refused.** Run `L ams /developer dev-refuse --computer --fill "Talk id=nope" --click "button=Fix the demo to this talk" --expect "alert=That talk cannot be the demo's abstract: it must be shown, and have an abstract."`.

## Gotchas

- With nothing fixed, the demo stands in the earliest talk with an abstract.
- Doctor checks the API with the launch's own key, and **Test connection** checks it with the app's key. Both come from the same launch, so they agree.
- A send changes the programme at the conference API. After a reset, send again so the API holds the published programme too.
- **Test connection** reads nothing back but a status: it never shows the key or the API's answer.
