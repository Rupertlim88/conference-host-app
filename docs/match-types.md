# Match types the host app needs from the conference API

## Why

Today `matches:search` returns each talk's matches among its 10 nearest abstracts in the whole meeting. The host app (the AMS demo) also needs **the best matches within a pool**, such as all talks starting at 8:30 on Tuesday, so that every list in the app can show its own best picks.

The host app wants a **fixed set of match types** that the API knows in advance. The API can then work them out ahead of time, after each programme write, and the host app reads stored results instantly. No match is worked out while a page loads.

## What every type shares

- **Asker:** whose interests to match. The host app uses two kinds of asker, and always says which one an edit uses:
  - **The talk on the screen**, for `overall`: "talks related to this talk".
  - **The attendee's own abstract**, for the other four: "picked for your abstract". In the demo this is the fixed abstract, talk 498388.
  - Possibly several talks together (like `likeTalks`), and later every talk.
- **Pools:**
  - The API builds them itself from the programme the partner already sent: each talk's session, start time and conferences.
  - The partner sends no lists.
  - A "day" is a date in the meeting's time zone (AMS 2027: America/Denver).
- **Per pool:** up to N matches, with a default for each type.
  - Optionally from **different sessions**, so two picks never sit in the same room.
- **Quality:**
  - The same AI judge as today, and the second-model check.
  - Closeness alone never makes a match, so a pool may come back empty.
- **Results:**
  - Each result is today's match: talk, kind, shared, score, rank, description, methods.
  - Each result also carries its **pool key**.
  - Results are stored per type, asker, filters and programme version.
  - When the programme changes, only the pools it affects are worked out again.

## The five types

1. **`overall`**
   - **Pools:** one, the whole meeting. This is what the API does today.
   - **Default:** 10.
   - **Host app uses it for:**
     - the related-talks panel on a talk page;
     - search's "same idea, other words";
     - My Schedule's "because you starred", which combines several starred talks.

2. **`per-conference`**
   - **Pools:** one per conference, 49 in AMS 2027. A talk in a joint session counts in each of its conferences.
   - **Default:** 1.
   - **Always leaves out the asker's own conferences** (the conferences of the asker's session). This is part of the type, not a filter, because its purpose is to point the attendee to other conferences.
   - **Host app uses it for:** ranking the Conferences and Symposia list, each other conference with its best match and reason.

3. **`per-day`**
   - **Pools:** one per day, 7 in AMS 2027 (January 5 and 9 to 14). Each pool is every talk that day, across all conferences.
   - **Default:** 3, from different sessions.
   - **Host app uses it for:** the attendee's best talks on each day of the meeting.

4. **`per-time-block`**
   - **Pools:** one per start time, by day and start time, 95. Each pool is every talk in a session that starts then, across all conferences.
   - **Default:** 2, from different sessions.
   - **Host app uses it for:** the Meeting Calendar, with up to 2 recommended sessions at the top of each time block.

5. **`per-session`**
   - **Pools:** one per session, 921. Each pool is that session's talks; 150 of these sessions are poster sessions.
   - **Default:** 1.
   - **Host app uses it for:** a session page's highlighted talk, "come for 9:15". With the posters filter, the board to visit first in each poster session.

## Filters (each combines with any type)

- **`outsideOwnConferences`:** leave out every talk in a conference the asker belongs to, keeping only other fields.
  - `overall` with it gives "related sessions elsewhere".
  - `per-time-block` with it gives "the cross-field pick of each time block".
- **`format`:** `poster` or `talk` only.
- **`kind`:** `core` (same field) or `unexpected` (different field), as today.
- **`minScore`:** as today.

## The combinations the host app will ask for first

| Order | Type | Filters | Host app |
|---|---|---|---|
| 1 | `per-time-block` | none | Meeting Calendar |
| 2 | `per-conference` | none (own conferences always left out) | Conferences list |
| 3 | `per-day` | none | Each day's best talks |
| 4 | `overall` | `outsideOwnConferences` | A session page: related sessions elsewhere |
| 5 | `per-session` | `format: poster` | Poster sessions: the board to visit first |
| 6 (optional) | `per-time-block` | `outsideOwnConferences` | The cross-field pick of each time block |

## Rough size, for one asker

- **Pool counts:** measured from the AMS 2027 programme.
- **Cost:** one AI judgement per pool (an estimate).

| Type | Judgements |
|---|---|
| `overall` | already done today |
| `per-conference` | 49 |
| `per-day` | 7 |
| `per-time-block` | 95 |
| `per-session` | up to 921. Suggest judging only sessions where some talk is close enough at all, and leaving the rest empty. |

Precomputing for **every** talk as asker would multiply these by about 4,500. That is a decision for later: either the fixed abstract only, or judging on first request and then storing.

## How the engine could do it (ideas to brainstorm, not a spec)

1. **Candidates inside each pool:** use the method comparisons the engine already stores, on the intent side and the technique side, and take the closest 4–6 talks in the pool.
2. **Judging:**
   - The same AI judge, told: choose up to N good matches from these candidates, or none.
   - The second model double-checks.
   - Any verdict already made for that pair is reused.
3. **Store and update:**
   - Store each pool's result.
   - After a programme change, work out only the pools whose talks changed.
4. **Run in the background:** declared types are worked out after each programme write, like today's matching jobs. Reading returns the stored results and whether they are complete.

### A possible request

This is only a sketch. The API's own rules and contract tests decide the real shape, and the host app will then update its copy of the contract.

```
POST /v1/conferences/{conference}/matches:search
{
  "likeTalks": ["498388"],
  "type": "per-time-block",               // overall | per-conference | per-day | per-time-block | per-session
  "outsideOwnConferences": false,
  "format": "poster",                     // optional: poster | talk
  "kind": "unexpected",                   // optional, as today
  "minScore": 0.6,                        // optional, as today
  "topPerPool": 2,                        // optional; each type has a default
  "distinctSessions": true                // optional
}
→ 200 {
  "programmeVersion": "…",
  "complete": true,
  "pools": [
    { "key": "2027-01-12T15:30:00Z", "matches": [ { "talk": "…", "kind": "…", "shared": ["technique"], "score": 0.8, "rank": 1, "description": "…", "methods": [ … ] } ] }
  ]
}
```

Suggested pool keys:
- `per-time-block`: the start time.
- `per-conference`: the conference id.
- `per-day`: the date.
- `per-session`: the session id.

## Questions for the API side

1. Which askers are worked out ahead of time: the fixed abstract only, a named list, or every talk?
2. Should this be a field on `matches:search`, or a new endpoint? And how are the types declared, so the API knows to compute them?
3. What are the limits: pools per request, and size of each pool?
4. Should a pool whose closest talks were judged "no match" say so, so the host app can show "nothing good here" rather than an empty pool?
