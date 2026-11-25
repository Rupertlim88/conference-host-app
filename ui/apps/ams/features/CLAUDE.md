# The AMS UI's features — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of each feature of the AMS UI

### The frame

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
   *How:* code alone: every other page reads through this server-only file, which asks Better Auth for the guest.
   *File:* `server.ts`

5. **The look is the demo's own, never AMS's: its own colours and type, with a colour for each kind of session.**
   The theme sets the demo's colours: one of their own for events, posters, joint sessions and panels, a main colour,
   which oral sessions take, and a muted one, which breaks take. Its type is the device's own sans-serif.
   *How:* Tailwind v4 theme tokens.
   *File:* `theme.css`

6. **Guests sign in with Google, and signing out cannot be undone with Back.** A signed-in guest sent to sign-in goes
   home. A failed sign-in says so. Where Google is not set up, the page says so instead of showing the button.
   *How:* code alone: Better Auth's client; the sign-in page and the sign-in route count with this file.
   *File:* `sign-in.tsx`

7. **Every attendee page sits in one frame, like the Confex meeting app's, and Home opens it.** A skip link; a top bar
   with sign-out, the time-zone switch, search and, on phones, a menu sheet that closes when a link is picked; a banner
   with the logo and the meeting's name and city; on computers, a side menu of eight links (Home, Conferences and
   Symposia, Meeting Calendar, People, My Schedule, Search, Organiser console, Developer console). Home shows a welcome,
   the location and five tiles.
   *How:* code alone; the attendee layout and the home page count with this file.
   *File:* `frame.tsx`

8. **A page that is missing says so, and a page that fails offers to try again.** "We could not find that page", with
   a link home, in exactly one main region; "Something went wrong" with "Try again", which asks the server for the page
   afresh. A failure inside the attendee app or a console shows in its frame; any other, such as in a layout or on the
   sign-in page, shows on a page of its own.
   *How:* code alone: Next.js's error and not-found files hand over to this file.
   *File:* `errors.tsx`

9. **Times show in meeting time or the guest's own zone, and the guest's choice is remembered.** The choice is
   remembered on their device, and lasts for the page if the device refuses to store it. The page shows the same time
   on the server and in the browser. A time shows as a day, a date, a time or a range.
   *How:* code alone: `Intl` formatting; the choice in local storage.
   *File:* `meeting-time.tsx`

10. **Sessions and talks show as cards, and a page shows when and where in one box.** A session card shows its label
    (its kind and number; a plain session shows only its number, and a break only its title), its title and place,
    with an edge coloured by kind (event, poster, joint, panel, break or oral), and links to the session. A talk card
    shows its time, number, title, authors and place; a break is shown, greyed, but is not a link. A place reads
    "room (building)", or the room alone; with no room there is no place. The box under a page's title shows the day,
    the time range and the place, each named for screen readers, hides the lines it has nothing for, and with nothing
    at all is not shown.
    *How:* code alone.
    *File:* `cards.tsx`

### Finding talks

11. **The Meeting Calendar shows one day at a time, its sessions grouped by time.** It opens on the first day with
    sessions from the meeting's start, or else the earliest day with sessions; with no sessions at all it goes home. A
    strip of days marks the current one. Sessions with the same start and end are grouped, earliest first; untimed
    sessions are left out; a day with none says so; an address that is not a date is "not found".
    *How:* code alone; the calendar's pages count with this file.
    *File:* `calendar.tsx`

12. **Conferences and Symposia lists every track, and each track lists its sessions by day.** A track shows how many
    sessions it has, then its sessions under each day in meeting time, untimed ones last.
    *How:* code alone; its pages count with this file.
    *File:* `programmes.tsx`

13. **People are listed A to Z by surname, and each person shows their talks.** Letters ignore accents; names that do
    not start with A–Z go under "#", last. With no letter chosen, the first group shows.
    *How:* code alone; the people pages count with this file.
    *File:* `people.tsx`

14. **Search finds talks, sessions and people from two to a hundred characters.** A shorter or longer query is not run
    and says which limit it broke; no hits says nothing matches. Results show people, then sessions, then presentations.
    *How:* code alone: a plain form that puts the query in the address; the search page counts with this file.
    *File:* `search.tsx`

### A session and a talk

15. **A session's page shows its time, place, chairs and talks.** Its tracks above the title; its label, then the
    title ("Session 5 - Wind Energy Forecasting", "Joint Session J1 - Decision Support I");
    a star; time and place; its description; its organisers; its presentations, or that none are listed; links to its
    tracks.
    *How:* code alone; the session page counts with this file.
    *File:* `session.tsx`

16. **A talk's page shows everything the programme publishes about it.** Number and title, a star, time and place,
    poster board, authors, the abstract in paragraphs (or that none was published), its related talks, then its
    session and its citation.
    *How:* code alone; the talk page counts with this file.
    *File:* `talk.tsx`

17. **On every talk page, a related-talks panel shows the matching API's matches for that talk, and never breaks the page.** While loading it shows placeholders. When the API cannot answer, it says the related talks are unavailable
    right now; with none, it says so. Each match shows whether it is close or unexpected, its time, number, title and
    reason, and links to the talk.
    *How:* code alone: loads in the browser after the page, so a slow API never holds up the talk.
    *File:* `related-talks.tsx`

18. **A guest stars talks and sessions, and My Schedule lists what they starred.** The star shows whether it is on, and
    cannot be pressed while stars load or a change saves. My Schedule lists sessions, then presentations; with nothing
    starred, it says how to add some.
    *How:* code alone; the schedule page counts with this file.
    *File:* `my-schedule.tsx`

### The organiser console

19. **The consoles have their own frame, with tables, pages of fifty and Mountain time.** A dark header with the
    console's name ("Program Builder" or "Developer Console"), its sections, a link to the attendee app and sign-out.
    Tables are dense; a pager shows "Page x of y" and hides when one page holds everything. Times are always Mountain
    time, and a stored time fills a console's time fields as the meeting's own clock shows it. Chips show a paper's status (scheduled,
    withdrawn, moved, rescheduled) and a session's (published, changed); a summary counts the changes. Searches are cut
    to 100 characters and an unknown filter means all; a page past the end shows the last page, and any other page
    that is not a page number shows the first.
    *How:* code alone; the two console layouts count with this file.
    *File:* `console-frame.tsx`

20. **Organisers find any paper, withdraw or restore it, and move it to another session.** Papers are searched and
    filtered by status, 50 a page. A paper's page shows its status, presenter, session, time and room. Withdraw and
    Restore cannot be pressed twice and say when a change did not save. A paper is moved by searching for a session;
    its own session is marked. A withdrawn paper has no link to the attendee app.
    *How:* code alone; the papers pages count with this file.
    *File:* `organiser-papers.tsx`

21. **Organisers change a session's date, times and room, and are told by name why a change is refused.** Sessions are
    searched, 50 a page. A session's page shows its status and every paper in it, withdrawn ones too. Times are in
    Mountain time; leaving them empty clears them. A refusal names its reason: a time half given, an end not after the
    start, or a day more than a day outside the meeting.
    *How:* code alone; the sessions pages count with this file.
    *File:* `organiser-sessions.tsx`

22. **Organisers send the programme to the matching API, after confirming, and see the last ten sends.** The page says
    withdrawn papers are left out and shows the changes. Send asks to confirm, then shows it is sending. It reports what
    was sent, added, changed and withdrawn, or the failure, or that a send is already running.
    *How:* code alone; the send page counts with this file.
    *File:* `send.tsx`

### The developer console

23. **The developer console shows the matching API's settings, tests the connection, and can put the published programme back.** It shows the API's address (or that none is set), whether a key is set, and the last send. The
    test reports one of: ok (with its HTTP status and time), not set, key refused, no programme or no talks, unreachable,
    or an unexpected answer. It can send the programme again, and put the published programme back after confirming,
    saying how many papers and sessions changed.
    *How:* code alone; the developer page counts with this file.
    *File:* `developer.tsx`

### Building blocks

24. **The UI's building blocks are shadcn/ui components, kept as shadcn makes them.** Badge, button, input, sheet and
    skeleton, and the one helper through which they and the rest of the app merge class names with shadcn's own `cn`.
    *How:* added with the shadcn command; changed only where the look needs it, or where a word they show must come
    from the English text.
    *File:* `ui/`

25. **Every word the UI shows is in one English text file.** The words the UI writes come from it; what the meeting's
    own data says, such as a session's kind, and the reasons the backend records, such as why a send failed, are shown
    as they come.
    *How:* next-intl reads it, and the app's title and install manifest read their words from it; every key is used.
    *File:* `text/`
