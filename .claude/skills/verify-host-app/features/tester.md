# The tester's requests

A separate program, the tester, measures the matching API's picks. It reads a map of AMS's whole published programme at `/api/programme-map`, posts a test set to `/api/test-set` (the talks for the demo to hold, and the abstracts to test, the first being the demo's abstract), and reads a report per abstract tested at `/api/recommendations?abstract=<id>`. Each request carries `Authorization: Bearer <TESTER_TOKEN>`. The attendee sees the result in the pages: only the test set's talks, every session kept, and the gold boxes in Our improvements built around the first abstract.

## Sub-features

- `token`: without the right token every request gets 401 with `www-authenticate: Bearer`; with no `TESTER_TOKEN` set, every request gets 503.
- `map`: every time block, session and conference of the whole programme, with their talks. Breaks are left out. 4,369 talks: Paper.json's 4,531 entries less its 162 breaks.
- `test-set`: 202 with the programme version the send returned, after holding the talks and fixing the demo to the first asker. 400 with a plain message for another conference, an empty list, an id that is not a published talk (a break, or unknown), an asker not among the talks, or an asker with no abstract. 409 while another send runs.
- `report`: one place per layout and key (`related`, `conference_outside`, `conference_inside`, `day`, `time_block`, `session`), each with `pool`, `shown`, `verdicts` and `notJudged`. 404 for an abstract the stored test set does not test.

## How to get to it (user POV)

- The tester calls the three requests over HTTP. No page links to them.
- The attendee pages show the result: a session page lists only held talks, a talk not held is not found, and the developer console names the first asker as the demo's abstract.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.
- `ui/apps/ams/.env.local` sets `TESTER_TOKEN` to the output of `openssl rand -hex 24`, before the launch. Never print it. Read it in a helper, such as `T() { curl -s -H "authorization: Bearer $(grep '^TESTER_TOKEN=' ui/apps/ams/.env.local | cut -d= -f2-)" "$@"; }`.
- The local conference API counts at most 5,000 new or changed talks a day for `ams-2027`. A test set changes about as many talks as it holds plus those it drops; the launch's own send of the sample is about 230. Check the count before you start: `psql "${HOST_DATABASE_URL%/*}/conf_ams_2027" -c 'select * from talk_changes_by_day order by day desc limit 1'`.

Steps:

- **Token.** For each of the three paths, `curl -s -o /dev/null -w '%{http_code}'` with no `authorization`, with `Bearer wrong`, and with `bearer <token>`: each prints `401`.
- **Map.** `T -o map.json http://localhost:3001/api/programme-map` gives 200. Its sessions and conferences together hold 4,369 distinct talk ids, every non-break id of `data/programmes/ams2027/107ANNUAL-Paper.json`, and no break. Joint session `75435` is in conferences `1956` and `1973`, and its talk `488210`, whose own conference is `1956`, is listed under both.
- **Test set.** Take about 40 talks from the map across two time blocks, such as every talk of sessions `76730` (498388's), `76814`, `76809`, `75709` and `76920` at `2027-01-13T10:45`, and `75520`, `75676` and `76799` at `2027-01-12T08:30`, with askers `["498388", "494841"]`. `T -X POST -H 'content-type: application/json' --data @test-set.json http://localhost:3001/api/test-set` gives `202 {"sentProgrammeVersion":"pv_..."}`. The newest row of `ams2027.sync_runs` is `sent` with that version and `sent` equal to the held talks with an abstract, and `.verify/run/conference-api.log` has a `talks:write` that completed with 200. Then seed matches as launch does: `npm run -s cli --workspace=@repo/conference-data -- seed-matches ams-2027 placeholder` in the conference API's repository, with `CONFERENCE_ADMIN_URL`, `CONFERENCE_DATABASE_URL` and `CONTROL_DATABASE_URL` set as `verify.sh` sets them.
- **Held.** `L ams /sessions/76814 tester-held --computer --expect "heading=Presentations"` lists the session's five talks. `L ams /sessions/75604 tester-not-held --computer --expect "heading=Presentations"` reads `No presentations listed.`. `L ams /talks/484769 tester-dropped --computer` reads `We could not find that page.`. Post the same talks with the askers swapped, then `L ams /developer tester-dev --computer --expect "heading=Developer console"` names `5A.1 - WeatherGenerator…` (494841) as the demo's abstract.
- **Report.** `T "http://localhost:3001/api/recommendations?abstract=498388"` gives 200 with every layout, the asker in none of its pools, and in every place `pool` equal to the talks of `verdicts` plus `notJudged`. The placeholder engine judges only a few talks, so most of each pool is in `notJudged`.
- **Shown matches the pages.** With 498388 as the demo's abstract, run the versions recipe's improved looks on `/calendar/2027-01-13`, `/calendar/2027-01-12`, `/sessions/76814`, `/sessions/75709` and `/programs`, and `L ams /talks/498388 tester-related --computer --click "button=Switch to Our improvements" --expect "link=J10B.2 Evaluation of Satellite Estimates of Precipitation"`. Each gold box holds what the report's `shown` says for that place: the day box its talks, a time block box the sessions of its talks, a session's outline its talk, each ranked conference its talk, and the related panel its talks, in order.
- **Refusals.** Post a test set with an unknown id, with an asker not among its talks, with `"conference": "ams-2026"`, with a break, and with `498948` (TEST SSO, no abstract) as the asker: each gives 400 and a plain message naming the problem, and the stored test set is unchanged. `T "http://localhost:3001/api/recommendations?abstract=485648"` gives 404.
- **Restore.** `psql "$HOST_DATABASE_URL" -c 'delete from ams2027.test_set'`, then `verify.sh stop ams` and `verify.sh launch ams`, which loads the sample again and sends it. Fix the demo back to `498388` with the developer console recipe.

## Gotchas

- Loading keeps the latest test set: a launch after a test set holds the test set's talks, not the sample, until the `ams2027.test_set` row is deleted.
- Wait for a related link, not for the heading `Related talks`. The panel streams in, and while it loads its ARIA snapshot looks the same as an empty panel's.
- Each POST sends the programme. When the local API's daily count passes 5,000 it answers 429, the send fails, and the test set answers 502; the related panels then show the API's last programme until midnight UTC.
- The ARIA snapshot is flat. A gold box ends at its last line, such as `Why, for your abstract: …` on a session page or the next time range heading on the calendar, not at an indent.
