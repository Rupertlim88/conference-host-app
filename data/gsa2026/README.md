# GSA Connects 2026 programme

The public programme of GSA Connects 2026, held 11 to 14 October 2026 at the Colorado Convention Center in Denver. The host app's GSA version is built from these files.

## Source

GSA ran its 2026 programme on OpenWater, at `https://gsameetings.secure-platform.com/connects26/`. Attendees used the "GSA Meetings Guide" phone app, built on Guidebook (Android package `com.guidebook.apps.gsameetings.android`). Through 2024, GSA used Confex and M-Events instead.

OpenWater has no bulk export. A crawler read every public page on 2026-11-15, in three levels:

1. The session gallery, 11 pages of 60, which lists all 646 sessions.
2. Each session page, which gives the session number, chairs, date, time, room and its table of talks.
3. Each talk's abstract page, at `.../sessiongallery/schedule/items/<session id>/application/<application id>`.

The crawl read 3,272 abstract pages with no errors. Every talk that links to an abstract has a row in `connects26-abstracts.json`.

## Files

| File | Rows | Contents |
|---|---|---|
| `connects26-sessions.json` | 646 | Every session, sorted by `id`. Fields: `number`, `title`, `chairs`, `description`, `date_time`, `room`, `session_type`, `format` and `presentations`. Each item in `presentations` has `paper_no`, `booth` (posters only), `title`, `presenting_author`, `start`, `end` (orals only) and `application_id`. |
| `connects26-abstracts.json` | 3,272 | Every abstract, sorted by `application_id`: 1,912 oral and 1,360 poster. Fields: `paper_no`, `title`, `session_id`, `session_title`, `presenting_author`, `authors`, `affiliations`, `abstract`, `citation`, `doi`, `category`, `format`, `date`, `start_time` and `room`. |
| `connects-2026-program.pdf` | 208 pages | GSA's printed programme, from `https://tools.geosociety.org/api/pdf/PDF%20Program%20-%202026%20Connects`. |
| `openwater-abstract-page.png` | | An OpenWater abstract page at phone width, showing the look the host app imitates. |

In `authors`, the number in brackets after each name points to the matching entry in `affiliations`. Session types include non-technical events, field trips, short courses and receptions, which have no abstracts.

Three abstracts are empty on the site itself: 111-11, 168-5 and 228-12. Talk 97-6 lists a presenting author but no author list.

## Use

The pages hold only what GSA publishes: titles, abstracts, and the names and affiliations of authors and chairs. Each abstract page says "© Copyright 2026 The Geological Society of America (GSA), all rights reserved." Use the files only inside the private demo.
