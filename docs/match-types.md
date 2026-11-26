# How the host app asks the conference API for matches

The host app asks `matches:search` for matches by **restriction**. A restriction is a group of talks that the API
lists the best matches within, or a set of talks it judges one by one. There are six kinds:

- `conference`: the whole conference.
- `subConference`: one conference or symposium, named by its track id.
- `day`: one day of the meeting, named by its date.
- `timeBlock`: every session that starts at one time, named by that start.
- `session`: one session, named by its id.
- `talks`: the talks a search names. The API judges every one of them and lists every verdict, match or not.

The first five are the standard kinds. The API builds them from the programme the host app sends. Each talk carries
its tracks, and its session carries its id and its start (`session.start`). The start is the meeting's clock time with
its offset, such as `2027-01-11T08:30:00-07:00` for 8:30 AM in Denver in January.

## The requests

The pages name each standard kind as `{ "type": … }`, with no `ids` and no `k`. That asks for every restriction of the
kind, with as many matches as each lists.

| Request                                  | Body                                                                                                                                                                | Used by                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Around the talk on screen                | `{ "likeTalks": [talkId], "restrictions": [{ "type": "conference" }], "pageSize": 1000 }`                                                                           | Related talks on a talk page |
| Around the fixed abstract, once per page | `{ "likeTalks": [abstractId], "restrictions": [{ "type": "subConference" }, { "type": "day" }, { "type": "timeBlock" }, { "type": "session" }], "pageSize": 1000 }` | The other four improvements  |
| Every verdict, for the tester's report   | `{ "likeTalks": [abstractId], "restrictions": [{ "type": "talks", "ids": [...] }], "pageSize": 1000 }`                                                              | One for each place reported  |

Each request reads every page. A standard search has 3 seconds in all; a search for every verdict has 10 seconds for
each thousand talks, and names at most a thousand talks, so a larger place takes several searches. If one page fails,
the whole search counts as unavailable. Every request is checked against the host app's copy of the conference API's
contract before it is sent.

## What each box shows

| Box                                      | Restriction     | Shown |
| ---------------------------------------- | --------------- | ----- |
| Related talks, on a talk page            | `conference`    | 5     |
| Conferences and Symposia, per conference | `subConference` | 1     |
| Meeting Calendar, per day                | `day`           | 3     |
| Meeting Calendar, per time block         | `timeBlock`     | 2     |
| A session's page                         | `session`       | 1     |

A standard restriction lists only matches, best first, with no fixed maximum, and at most one talk per session in a
`day` or a `timeBlock`. The host app shows the first ones from each list, as many as the box shows. It leaves out a
match to a talk the demo does not hold.

## What comes back

Each result names its `restriction` and its `rank` within it. A talk can appear once under each restriction it is in.
Results under the talks restriction carry `{ "type": "talks" }` with no id. These results around the fixed abstract
`498388` were measured on the local API with placeholder matches, after the restrictions were judged:

```json
{ "basedOn": "498388", "talk": "488573", "kind": "core", "rank": 1,
  "restriction": { "type": "day", "id": "2027-01-12" }, "score": 0.5, "match": true, "shared": ["technique"],
  "description": "Placeholder match …", "methods": [], "programmeVersion": "pv_…" }
{ "basedOn": "498388", "talk": "488573", "kind": "core", "rank": 1,
  "restriction": { "type": "timeBlock", "id": "2027-01-12T08:30:00-07:00" }, "score": 0.5, … }
{ "basedOn": "498388", "talk": "485648", "kind": "core", "rank": 1, "restriction": { "type": "talks" }, "score": 0.5, … }
```

Asked before they were judged, the same search came back with no matches and a `judging` list naming 14
restrictions, such as `{ "basedOn": "498388", "restriction": { "type": "subConference", "id": "1955" } }`.

The backend groups the results by restriction into pools for the improvements. It names a conference by its track id,
a day by its date, a time block by its start instant in UTC, and a session by its id. Each pool keeps the API's order,
and each match carries its talk as this programme shows it. Each improvement reads only its own pool, and never sorts
matches into pools itself.

When the API cannot answer, related talks say they are unavailable. The other improvements draw their gold outlines
empty, with at most one line saying so.

## Restrictions still being judged

An answer may carry `judging`: a list of `{ basedOn, restriction }`. The API is judging those restrictions for the
first time, and their matches appear when it is asked again a little later. The whole conference is always ready. The
others are judged the first time they are asked for, and kept until the programme changes.

- **On the pages,** a restriction still being judged has no matches yet, so its box shows empty this time. The next
  visit fills it.
- **In the tester's report,** nothing is partial. The report makes every search, so that each restriction starts being
  judged, and while anything for the abstract is still being judged it answers `202` with a plain message, such as
  `The matching API is still judging 14 restrictions for this abstract; ask again shortly.` Once nothing is being
  judged, it answers `200` in its usual form. Each place's `verdicts` are then every verdict from its talks
  restriction, and `notJudged` lists the place's talks with none.

## The connection test

The developer console's **Test connection** sends `{ "likeTalks": [talkId], "topPerPerson": 1 }`, without
restrictions. The API still accepts it. With `restrictions`, the API refuses `include: "all"` and `topPerPerson`, and
it refuses the old `pools` field with a 400.
