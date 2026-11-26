# AMS's buttons and pages

AMS's meeting app, the base, offers exactly AMS's buttons, each with an icon: the side menu (Home, Search, Conferences and Symposia, Events, Meeting Calendar, Participating Program Committees, Officers of the 107th Annual Meeting, Main Exhibit Hall, Career Resource and Graduate School Fair, Program Highlights, General Information, Attendee Resources, Sponsor Index, Technical Support) and the home page's ten tiles. Every button opens its page: programmes, lists of organisations, highlight lists, lists of names, or short pages in the demo's own words.

## Sub-features

- `menu` lists AMS's buttons in AMS's order; Program Highlights, General Information and Attendee Resources open to their sub-items.
- `home` shows a short welcome and AMS's ten tiles, and no location section.
- `programmes-by-name` opens Events, Main Exhibit Hall, Career Resource and Graduate School Fair, Sponsor Index, Presidential Conference and Town Hall Meetings as programme pages.
- `highlights` lists People Themed and Posters sessions, and Core Science Keynotes, New Fellows and Supplementary Materials talks.
- `names` shows the committees and officers under their headings.
- `our-words` gives each General Information and Attendee Resources page, and Technical Support, a sentence or two in the demo's own words.

## How to get to it (user POV)

- From the home page's tiles or the side menu (on phones, the menu button).

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.

- **Menu and tiles.** Run `L ams / home-buttons --computer --expect "link=Officers of the 107th Annual Meeting"`. The `.aria.txt` lists the menu's links and buttons in the order above, then the ten tiles, and no `Location` heading.
- **A group.** Run `L ams / group --computer --click "button=Program Highlights" --expect "link=Core Science Keynotes"`. Seven sub-item links follow the button.
- **Pages.** For each of `/events` (Events), `/committees`, `/officers`, `/exhibit-hall`, `/career-fair`, `/sponsors` (Sponsors), `/highlights/people-themed` (People Themed), `/highlights/keynotes` (Core Science Keynotes), `/highlights/posters` (Posters), `/highlights/presidential`, `/information/faqs` (FAQs) and `/support` (Technical Support), run `L ams <route> <name> --expect "heading=<its title>"`. Each `.aria.txt` holds its list, or the short page's text.

## Gotchas

- The programme pages' titles are AMS's own programme titles: `/sponsors` reads `Sponsors`, and `/highlights/town-halls` reads `Town Hall Meetings & Agency Updates`.
- The exhibit hall, career fair and sponsor pages list organisations as sessions with no time, so the page has no day headings.
