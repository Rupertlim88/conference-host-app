# Sign-in gate

Every page except the sign-in page needs a signed-in guest. Anyone with a Google account may sign in. A signed-out visitor who opens any page lands on `/sign-in`, which names the app and offers Google sign-in.

## Sub-features

- `gate-redirect` sends a signed-out visitor from any page to `/sign-in`.
- `gate-page` shows the app's name, the heading "Sign in to the demo", and the Google sign-in state.
- `gate-signed-in` lets a signed-in guest open the page directly.

## How to get to it (user POV)

- Open any link to the app without signing in.
- Choose **Sign Out** in the top bar.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.

- **Redirect, AMS.** Run `L ams /talks/493803 gate --signed-out --expect "heading=Sign in to the demo"`. The `.aria.txt` starts with `http://localhost:3001/sign-in` and contains `Isobar Meetings 2027 (Demo)`.
- **Signed in.** Run `L ams /talks/493803 talk --expect "heading=Abstract"`. The `.aria.txt` starts with `http://localhost:3001/talks/493803`.

## Gotchas

- Locally the page says "Google sign-in is not set up on this copy of the demo." That is expected without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- A sign-in that does not finish returns to `/sign-in?error=1`, which shows "Sign-in did not finish. Please try again." Check it with `L ams "/sign-in?error=1" failed --signed-out --expect "alert=Sign-in did not finish"`.
