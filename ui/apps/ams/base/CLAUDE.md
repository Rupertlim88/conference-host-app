# The base AMS meeting app — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of the base: the AMS meeting app as AMS has it

### The frame and its buttons

2. **Every attendee page sits in one frame, like the Confex meeting app's, and Home opens it.** A skip link; a top bar
   with sign-out, the time-zone switch, My Schedule, search and, on phones, a menu sheet that closes when a link is
   picked; a banner with the logo and the meeting's name and city; on computers, a side menu; and the demo's bar that
   switches between the base and our versions. What the menu and Home offer is the rule on Home and the menu.
   *How:* code alone; the attendee layout counts with this file.
   *File:* `frame.tsx`

3. **Home and the menu offer every button on the AMS meeting app's main screen, with an icon for each, in AMS's order, and nothing else.**
   The menu: Home, Search, Conferences and Symposia, Events, Meeting Calendar, Participating Program Committees,
   Officers of the 107th Annual Meeting, Main Exhibit Hall, Career Resource and Graduate School Fair, Program Highlights,
   General Information and Attendee Resources, each with AMS's sub-items, Sponsor Index and Technical Support. Program
   Highlights holds People Themed, Supplementary Materials, Core Science Keynotes, New Fellows, Posters, Presidential
   Conference and Town Hall Meetings; General Information holds FAQs, Information for Presenters, Policies, Inclusion and
   Accessibility, Green Meetings, Social Media, Slack, Press and How to Clear Cache; Attendee Resources holds
   Registration, Health Resources, Wellness Rooms, Safety Tips, Transportation, and Local Restaurants and Attractions.
   On computers a group opens in the side menu; its tile opens a page listing its sub-items. Home shows a short welcome
   in the demo's own words and AMS's ten tiles, from Conferences and Symposia to Attendee Resources; it shows none of
   AMS's own content.
   *How:* code alone: one list of buttons, with lucide icons that stand for AMS's own; the home page and the groups'
   pages count with this file.
   *File:* `menu.tsx`

4. **Sessions and talks show as cards, and a page shows when and where in one box.** A session card shows its label
    (its kind and number; a plain session shows only its number, and a break only its title), its title and place,
    with an edge coloured by kind (event, poster, joint, panel, break or oral), and links to the session. A talk card
    shows its time, number, title, authors and place; a break is shown, greyed, but is not a link. A place reads
    "room (building)", or the room alone; with no room there is no place. The box under a page's title shows the day,
    the time range and the place, each named for screen readers, hides the lines it has nothing for, and with nothing
    at all is not shown.
    *How:* code alone.
    *File:* `cards.tsx`

### Finding talks

5. **The Meeting Calendar shows one day at a time, its sessions grouped by time.** It opens on the first day with
    sessions from the meeting's start, or else the earliest day with sessions; with no sessions at all it goes home. A
    strip of days marks the current one. Sessions with the same start and end are grouped, earliest first; untimed
    sessions are left out; a day with none says so; an address that is not a date is "not found". The day's list is
    a change point, where our versions can change it. Above the day's list is a change point too.
    *How:* code alone; the calendar's pages count with this file.
    *File:* `calendar.tsx`

6. **Conferences and Symposia lists every track, and each track lists its sessions by day.** The list leaves out the
    listings of organisations, and its list is a change point, where our versions can change it. A track shows how many
    sessions it has, then its sessions under each day in meeting time, untimed ones last. The programmes AMS's menu opens
    by name (Events, Main Exhibit Hall, Career Resource and Graduate School Fair, Sponsor Index, Presidential Conference
    and Town Hall Meetings) open as track pages.
    *How:* code alone; its pages count with this file.
    *File:* `programmes.tsx`

7. **People are listed A to Z by surname, and each person shows their talks.** Letters ignore accents; names that do
    not start with A–Z go under "#", last. With no letter chosen, the first group shows.
    *How:* code alone; the people pages count with this file.
    *File:* `people.tsx`

8. **Search finds talks, sessions and people from two to a hundred characters.** A shorter or longer query is not run
    and says which limit it broke; no hits says nothing matches. Results show people, then sessions, then presentations.
    *How:* code alone: a plain form that puts the query in the address; the search page counts with this file.
    *File:* `search.tsx`

### A session and a talk

9. **A session's page shows its time, place, chairs and talks.** Its tracks above the title; its label, then the
    title ("Session 5 - Wind Energy Forecasting", "Joint Session J1 - Decision Support I");
    a star; time and place; its description; its organisers; its presentations, or that none are listed; links to its
    tracks. Its list of talks is a change point, where our versions can change it.
    *How:* code alone; the session page counts with this file.
    *File:* `session.tsx`

10. **A talk's page shows everything the programme publishes about it.** Number and title, a star, time and place,
    poster board, authors, the abstract in paragraphs (or that none was published), then its session and its citation.
    After the abstract is a change point, where our versions can add to the page.
    *How:* code alone; the talk page counts with this file.
    *File:* `talk.tsx`

11. **A guest stars talks and sessions, and My Schedule lists what they starred.** The star shows whether it is on, and
    cannot be pressed while stars load or a change saves. My Schedule lists sessions, then presentations; with nothing
    starred, it says how to add some.
    *How:* code alone; the schedule page counts with this file.
    *File:* `my-schedule.tsx`

### AMS's other pages

12. **Program Highlights' lists show the sessions or talks AMS marks for each.** People Themed lists the meeting's
   PEOPLE-themed sessions and Posters its poster sessions, by day; Supplementary Materials, Core Science Keynotes and New
   Fellows list their talks. A list with nothing in it says so.
   *How:* code alone; the highlight lists' page counts with this file.
   *File:* `highlights.tsx`

13. **Participating Program Committees and Officers show AMS's lists of names under their headings.** Each heading
   with its lines of names, in AMS's order, and none of AMS's own words around them.
   *How:* code alone; the two pages count with this file.
   *File:* `names.tsx`

14. **The pages that are AMS's own text are short pages in the demo's own words.** Each of General Information's
   nine pages, Attendee Resources' six and Technical Support says in a sentence or two what the page is for at a
   meeting, and that the demo leaves its content to the society.
   *How:* code alone, with the words in the English text; the pages count with this file.
   *File:* `our-words.tsx`
