# The AMS UI's features — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of each feature of the AMS UI

### The frame

2. **The app is installable, English only, and shows times in Denver unless the guest chooses their own zone.** It
   calls the backend through one batched connection, retries a failed call once, and does not refetch when the window
   regains focus. A send may run for up to five minutes, so the backend's address allows that long.
   *How:* code alone: Next.js, next-intl, React Query and tRPC; the manifest and the backend's route count with this
   file.
   *File:* needed

3. **The look is the demo's own, never AMS's: its own name, logo, colours and type.** The name is "Isobar Meetings
   2027 (Demo)".
   *How:* Tailwind v4 theme tokens, with a colour for each kind of session.
   *File:* needed

4. **Guests sign in with Google, and signing out cannot be undone with Back.** A signed-in guest sent to sign-in goes
   home. A failed sign-in says so. Where Google is not set up, the page says so instead of showing the button. Every
   page sends anyone not signed in to sign-in.
   *How:* code alone: Better Auth's client; every page reads through one server helper that redirects.
   *File:* needed

5. **Every attendee page sits in one frame, like the Confex meeting app's, and Home opens it.** A skip link; a top bar
   with sign-out, the time-zone switch, search and, on phones, a menu sheet that closes when a link is picked; a banner
   with the logo and the meeting's name and city; on computers, a side menu of eight links (Home, Conferences and
   Symposia, Meeting Calendar, People, My Schedule, Search, Organiser console, Developer console). Home shows a welcome,
   the location and five tiles.
   *How:* code alone.
   *File:* needed

6. **A page that is missing says so, and a page that fails offers to try again.** "We could not find that page", with
   a link home, in exactly one main region; "Something went wrong" with "Try again". A request for an item that does not
   exist, or a bad id, becomes "not found"; any other failure is an error.
   *How:* code alone: Next.js's error and not-found files hand over to this file.
   *File:* needed

7. **Times show in meeting time or the guest's own zone, and a place shows its room and building.** The guest's choice
   is remembered on their device, and lasts for the page if the device refuses to store it. The page shows the same
   time on the server and in the browser. A time shows as a day, a date, a time or a range; an item with no time or no
   room hides those lines.
   *How:* code alone: `Intl` formatting; the choice in local storage.
   *File:* needed

8. **Sessions and talks show as cards, coloured by kind.** A session card shows its kind and number, title and place,
   with an edge coloured by kind (event, poster, joint, panel, break or oral), and links to the session. A talk card
   shows its time, number, title, authors and place; a break is shown but is not a link.
   *How:* code alone.
   *File:* needed

### Finding talks

9. **The Meeting Calendar shows one day at a time, its sessions grouped by time.** It opens on the first day of the
   meeting. A strip of days marks the current one. Sessions with the same start and end are grouped, earliest first;
   untimed sessions are left out; a day with none says so; a bad date is "not found".
   *How:* code alone.
   *File:* needed

10. **Conferences and Symposia lists every track, and each track lists its sessions by day.** A track shows how many
   sessions it has, then its sessions under each day in meeting time, untimed ones last.
   *How:* code alone.
   *File:* needed

11. **People are listed A to Z by surname, and each person shows their talks.** Letters ignore accents; names that do
    not start with A–Z go under "#", last. With no letter chosen, the first group shows.
    *How:* code alone.
    *File:* needed

12. **Search finds talks, sessions and people from two to a hundred characters.** A shorter or longer query is not run
    and says why; no hits says nothing matches. Results show people, then sessions, then presentations.
    *How:* code alone: a plain form that puts the query in the address.
    *File:* needed

### A session and a talk

13. **A session's page shows its time, place, chairs and talks.** Its tracks above the title; "Session N - title";
    a star; time and place; its description; its organisers; its presentations, or that none are listed; links to its
    tracks.
    *How:* code alone.
    *File:* needed

14. **A talk's page shows everything the programme publishes about it.** Number and title, a star, time and place,
    poster board, authors, the abstract in paragraphs (or that none was published), its session and its citation; then
    its related talks.
    *How:* code alone.
    *File:* needed

15. **On every talk page, a related-talks panel shows the matching API's matches for that talk, and never breaks the page.** While loading it shows placeholders. When the API cannot answer, it says the related talks are unavailable
    right now; with none, it says so. Each match shows whether it is close or unexpected, its time, number, title and
    reason, and links to the talk.
    *How:* code alone: loads in the browser after the page, so a slow API never holds up the talk.
    *File:* needed

16. **A guest stars talks and sessions, and My Schedule lists what they starred.** The star shows whether it is on, and
    cannot be pressed while stars load or a change saves. My Schedule lists sessions, then presentations; with nothing
    starred, it says how to add some.
    *How:* code alone.
    *File:* needed

### The organiser console

17. **The consoles have their own frame, with tables, pages of fifty and Mountain time.** A dark header with the
    console's name ("Program Builder" or "Developer Console"), its sections, a link to the attendee app and sign-out.
    Tables are dense; a pager shows "Page x of y" and hides when one page holds everything. Times are always Mountain
    time. Chips show a paper's status (scheduled, withdrawn, moved, rescheduled) and a session's (published, changed);
    a summary counts the changes. Searches are cut to 100 characters, an unknown filter means all, and a bad page means
    the first.
    *How:* code alone.
    *File:* needed

18. **Organisers find any paper, withdraw or restore it, and move it to another session.** Papers are searched and
    filtered by status, 50 a page. A paper's page shows its status, presenter, session, time and room. Withdraw and
    Restore cannot be pressed twice and say when a change did not save. A paper is moved by searching for a session;
    its own session is marked. A withdrawn paper has no link to the attendee app.
    *How:* code alone.
    *File:* needed

19. **Organisers change a session's date, times and room, and are told by name why a change is refused.** Sessions are
    searched, 50 a page. A session's page shows its status and every paper in it, withdrawn ones too. Times are in
    Mountain time; leaving them empty clears them. A refusal names its reason: a time half given, an end not after the
    start, or a day outside the meeting.
    *How:* code alone.
    *File:* needed

20. **Organisers send the programme to the matching API, after confirming, and see the last ten sends.** The page says
    withdrawn papers are left out and shows the changes. Send asks to confirm, then shows it is sending. It reports what
    was sent, added, changed and withdrawn, or the failure, or that a send is already running.
    *How:* code alone.
    *File:* needed

### The developer console

21. **The developer console shows the matching API's settings, tests the connection, and can put the published programme back.** It shows the API's address (or that none is set), whether a key is set, and the last send. The
    test reports one of: ok (with its HTTP status and time), not set, key refused, no programme or no talks, unreachable,
    or an unexpected answer. It can send the programme again, and put the published programme back after confirming,
    saying how many papers and sessions changed.
    *How:* code alone.
    *File:* needed

### Building blocks

22. **The UI's building blocks are shadcn/ui components, kept as shadcn makes them.** Badge, button, input, sheet and
    skeleton.
    *How:* added with the shadcn command; changed only where the look needs it.
    *File:* needed

23. **Every word the UI shows is in one English text file.**
    *How:* next-intl reads it; every key is used.
    *File:* needed
