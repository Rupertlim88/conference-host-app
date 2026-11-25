# Browse the programme

A guest opens the home page, picks a day on the calendar, opens a session, and opens a talk in it. The talk page shows the talk's number and title, date, time, room, authors, abstract, and session.

## Sub-features

- `home` shows the meeting's welcome and its main links.
- `calendar-day` lists one day's sessions, with tabs or a strip for the other days.
- `session` lists the session's talks in time order.
- `talk` shows one talk with its time in the meeting's time zone.

## How to get to it (user POV)

- AMS: **Meeting Calendar** on the home page or in the menu, then a session, then a talk.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.

- **AMS home.** Run `L ams / home --expect "heading=Welcome to the 107th AMS Annual Meeting"`.
- **AMS calendar.** Run `L ams / calendar --click "link=Meeting Calendar" --expect "heading=January"`. The URL in the `.aria.txt` matches `/calendar/2027-01-1x`, and the page's level-1 heading is that day, such as `Sunday, January 10, 2027`.
- **AMS session to talk.** Run `L ams /sessions/77102 talk --click "link=J1.2 What is a Snow Squall" --expect "heading=Abstract"`. The `.aria.txt` contains `Monday, January 11, 2027`, `8:45 AM - 9:00 AM`, and `403 (Colorado Convention Center)`.

## Gotchas

- `/calendar` redirects to a dated page such as `/calendar/2027-01-10`. Check the URL with a pattern, not one fixed date.
- AMS shows **Meeting Calendar** twice on the home page. `--click` takes the first.
- Accessible names of talk links start with the time, such as `8:45 AM J1.2 What is a Snow Squall…`, on some pages. `--click` matches part of the name.
