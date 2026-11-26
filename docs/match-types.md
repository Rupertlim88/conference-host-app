# How the host app asks the conference API for matches

The host app asks `matches:search` for matches by **pool**. A pool is a group of talks that the API lists the best
matches within. There are five kinds:

- `conference`: the whole conference.
- `subConference`: one other conference or symposium, named by its track id.
- `day`: one day of the meeting, named by its date.
- `timeBlock`: every session that starts at one time, named by that start.
- `session`: one session, named by its id.

The API builds the pools from the programme the host app sends. Each talk carries its tracks, and its session carries
its id and its start (`session.start`). The start is the meeting's clock time with its offset, such as
`2027-01-11T08:30:00-07:00` for 8:30 AM in Denver in January. The host app sends no lists of pools.

## The two requests

| Request                                  | Body                                                                                                         | Used by                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Around the talk on screen                | `{ "likeTalks": [talkId], "pools": ["conference"], "pageSize": 1000 }`                                       | Related talks on a talk page |
| Around the fixed abstract, once per page | `{ "likeTalks": [abstractId], "pools": ["subConference", "day", "timeBlock", "session"], "pageSize": 1000 }` | The other four improvements  |

Each request reads every page, within 3 seconds in all. If one page fails, the whole search counts as unavailable.
Every request is checked against the host app's copy of the conference API's contract before it is sent.

## What each box shows

| Box                                      | Pool            | The API lists at most | Shown |
| ---------------------------------------- | --------------- | --------------------- | ----- |
| Related talks, on a talk page            | `conference`    | 10                    | 5     |
| Conferences and Symposia, per conference | `subConference` | 2                     | 1     |
| Meeting Calendar, per day                | `day`           | 5                     | 3     |
| Meeting Calendar, per time block         | `timeBlock`     | 2                     | 2     |
| A session's page                         | `session`       | 2                     | 1     |

The API leaves the asker's own conferences out of `subConference`, and lists one talk per session in a `day` or a
`timeBlock` pool. Asking for more than a box shows leaves room for matches to talks the demo's sample does not hold,
which the host app leaves out.

## What comes back

Each result names its `pool` and its `rank` within that pool. A talk can appear once in each pool it is in. Results
come grouped by kind of pool, in the order above, then by pool id. Two results from the request around the fixed
abstract `498388`, measured on the local API with placeholder matches:

```json
{ "basedOn": "498388", "talk": "498733", "kind": "core", "rank": 1, "pool": { "type": "day", "id": "2027-01-12" },
  "score": 0.5, "match": true, "shared": ["technique"], "description": "Placeholder match …", "methods": [],
  "programmeVersion": "pv_…" }
{ "basedOn": "498388", "talk": "498733", "kind": "core", "rank": 1,
  "pool": { "type": "timeBlock", "id": "2027-01-12T16:30:00-07:00" }, "score": 0.5, … }
```

The backend groups the results by pool for the improvements. It names a conference by its track id, a day by its
date, a time block by its start instant in UTC, and a session by its id. Each pool keeps the API's order, and each
match carries its talk as this programme shows it. Each improvement reads only its own pool, and never sorts matches
into pools itself.

When the API cannot answer, related talks say they are unavailable. The other improvements draw their gold outlines
empty, with at most one line saying so.

## The connection test

The developer console's **Test connection** sends `{ "likeTalks": [talkId], "topPerPerson": 1 }`, without pools.
The API still accepts it. With `pools`, the API refuses `include: "all"` and `topPerPerson`.
