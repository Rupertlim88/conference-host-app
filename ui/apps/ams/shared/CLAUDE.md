# The AMS UI's shared code — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the code every screen of the AMS UI shares

### Starting the app

2. **The app is installable, English only, and shows times in Denver by default.** Every
   page sits in one root, in English, with the connection to the backend around it. The app's title, description and
   names come from the English text. A phone can install it, with its own name, colours and icon. When an address names
   a value twice, the first counts, and a NUL character in it is dropped.
   *How:* code alone: Next.js's metadata and manifest, and next-intl's request settings, which give every page the
   English text and Denver's time zone; the root layout and the manifest count with this file.
   *File:* `app.tsx`

3. **The browser reaches the backend through one batched connection, which tries a failed read once more.** A change,
   such as a send, is never tried again by itself. Nothing is read again just because the window regains focus. The
   backend's address lets a request run up to five minutes, because a send may take that long.
   *How:* code alone: tRPC over React Query; the backend's route counts with this file.
   *File:* `connection.tsx`

4. **Every page reads the backend on the server as the signed-in guest, and an item that is not there shows "not found".** A visitor who is not signed in is sent to sign in before a page reads anything; only the sign-in page itself, which needs no guest, asks the backend directly whether someone is signed in. An item the backend does not know, or an input that is not well formed, shows the not-found page; any other failure is an error.
   *How:* code alone: every other page reads through this server-only file, which asks the backend who is signed in,
   and the backend asks Better Auth.
   *File:* `server.ts`

### The look

5. **The look is the demo's own, never AMS's: its own colours and type, with a colour for each kind of session.**
   The theme sets the demo's colours: one of their own for events, posters, joint sessions and panels, a main colour,
   which oral sessions take, and a muted one, which breaks take. Its type is the device's own sans-serif.
   *How:* code alone: Tailwind v4 theme tokens, which the cards read to colour each kind of session.
   *File:* `theme.css`

6. **Every screen shows the demo's own mark, page titles and places in one way.** The mark is the demo's own logo
   and name, isobars over Denver's mountains, so the demo is never taken for the society's app. Every page has one top
   heading, with an optional line above it naming what the page belongs to. A place reads as the programme prints it,
   the room with its building in brackets, and no room means no place.
   *How:* code alone: the attendee app, the consoles and the sign-in page all use these.
   *File:* `marks.tsx`

### Signing in and errors

7. **Guests sign in with Google, and signing out cannot be undone with Back.** A signed-in guest sent to sign-in goes
   home. A failed sign-in says so. Where Google is not set up, the page says so instead of showing the button.
   *How:* code alone: Better Auth's client; the sign-in page and the sign-in route count with this file.
   *File:* `sign-in.tsx`

8. **A page that is missing says so, and a page that fails offers to try again.** "We could not find that page", with
   a link home, in exactly one main region; "Something went wrong" with "Try again", which asks the server for the page
   afresh. A failure inside the attendee app or a console shows in its frame; any other, such as in a layout or on the
   sign-in page, shows on a page of its own.
   *How:* code alone: Next.js's error and not-found files hand over to this file.
   *File:* `errors.tsx`

### Times, building blocks and words

9. **Times show in meeting time or the guest's own zone, and the guest's choice is remembered.** The choice is
   remembered on their device, and lasts for the page if the device refuses to store it. The page shows the same time
   on the server and in the browser. A time shows as a day, a date, a time or a range.
   *How:* code alone: `Intl` formatting; the choice in local storage.
   *File:* `meeting-time.tsx`

10. **The UI's building blocks are shadcn/ui components, kept as shadcn makes them.** Badge, button, input, sheet and
    skeleton, and the one helper through which they and the rest of the app merge class names with shadcn's own `cn`.
    *How:* Claude adds them with the shadcn command, and changes them only where the look needs it, or where a word they
    show must come from the English text.
    *File:* `ui/`

11. **Every word the UI shows is in one English text file.** The words the UI writes come from it; what the meeting's
    own data says, such as a session's kind, and the reasons the backend records, such as why a send failed, are shown
    as they come.
    *How:* Claude writes the words; next-intl reads them, and the app's title and install manifest read their words
    from it; Claude removes a key with the last words that use it.
    *File:* `text/`
