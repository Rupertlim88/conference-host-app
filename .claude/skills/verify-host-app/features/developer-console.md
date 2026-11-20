# Developer console

Each app has a developer console at `/developer`, reached from **Developer console** in the attendee menu. It shows how the app reaches the conference API, and lets any signed-in guest test the connection, send the programme again, and reset the programme to the published one. Every page of the attendee app and both consoles links to the conference API's credential verification page when one is set.

## Sub-features

- `dev-status` lists the conference API address (without credentials), whether a key is set, the credential verification page, the last send, and the changes from the published programme.
- `dev-test` makes one `matches:search` call and says what it found: "Connection works (200, N ms)." or why not.
- `dev-send-again` sends the programme after a confirm, like the organiser console's send.
- `dev-reset` puts back the published programme after a confirm, and says how many talks and sessions it put back.
- `verify-link` shows **Verify a credential**, opening the page in a new tab, in the attendee app and both consoles, when `CONFERENCE_API_VERIFY_URL` is set.

## How to get to it (user POV)

- Open the menu, then **Developer console**.
- **Verify a credential** sits under the attendee app's banner and in the consoles' top bar.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.
- For `verify-link`, the app's `.env.local` sets `CONFERENCE_API_VERIFY_URL`. On Rupert's Mac both apps set `http://127.0.0.1:8787/verify`, a page the conference API does not serve yet.

- **Status.** Run `L ams /developer dev-status --computer --expect "heading=Developer console"`. The `.aria.txt` lists the terms `Conference API address`, `API key`, `Credential verification page` and `Last send`, with `http://127.0.0.1:8787/` and `Set` as the first two definitions.
- **Test connection.** Run `L gsa /developer dev-test --computer --click "button=Test connection" --expect "status=Connection works"`.
- **Send again.** Run `L ams /developer dev-send --computer --click "button=Send programme again" --click "button=Send now" --expect "status=Sent"`. Prove it from a second page: `L ams /organiser/send dev-send-runs --computer --expect "heading=Recent sends"`, whose first row reads `Sent`.
- **Reset.** Make one change first, such as the withdraw step in the organiser console recipes. Run `L ams /developer dev-reset --computer --click "button=Reset to published programme" --click "button=Reset now" --expect "status=Programme reset"`. The status reads `Programme reset: 1 paper and 0 sessions put back.` Prove it from a second page: the withdrawn talk's attendee page shows its heading again.
- **Verify link.** Run `L ams / verify-link --expect "link=Verify a credential"`. In the `.aria.txt`, the link's `/url` is the value of `CONFERENCE_API_VERIFY_URL`. Repeat on `/organiser` and `/developer`.

## Gotchas

- Doctor checks the API with the launch's own key, and **Test connection** checks it with the app's key. Both come from the same launch, so they agree.
- A send changes the programme at the conference API. After a reset, send again so the API holds the published programme too.
- **Test connection** reads nothing back but a status: it never shows the key or the API's answer.
