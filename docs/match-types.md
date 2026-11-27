# How the host app asks the conference API for matches

The host app asks `matches:search` for matches by **restriction**. A restriction is a group of talks that the API
lists the best matches within. There are six kinds:

- `conference`: the whole conference.
- `subConference`: one conference or symposium, named by its track id.
- `day`: one day of the meeting, named by its date.
- `timeBlock`: every session that starts at one time, named by that start.
- `session`: one session, named by its id.
- `talks`: the talks a search names. Like any restriction, it lists only those that match. A talk it judged not to
  match is not listed, and neither is a talk it never reached.

The first five are the standard kinds. The API builds them from the programme the host app sends. Each talk carries
its tracks, and its session carries its id and its start (`session.start`). The start is the meeting's clock time with
its offset, such as `2027-01-11T08:30:00-07:00` for 8:30 AM in Denver in January.

## The requests

Every search names the talk it asks about in `likeTalks`. The API refuses a search that names neither `likeTalks` nor
`people`. The pages name each standard kind as `{ "type": … }`, with no `ids` and no `k`, which asks for every
restriction of the kind. `top` says how many matches to list in each restriction, best first.

| Request                                  | Body                                                                                                                                                                          | Used by                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Around the talk on screen                | `{ "likeTalks": [talkId], "restrictions": [{ "type": "conference" }], "top": 6, "pageSize": 1000 }`                                                                           | Related talks on a talk page |
| Around the fixed abstract, once per page | `{ "likeTalks": [abstractId], "restrictions": [{ "type": "subConference" }, { "type": "day" }, { "type": "timeBlock" }, { "type": "session" }], "top": 4, "pageSize": 1000 }` | The other four improvements  |
| The verdicts, for the tester's report    | `{ "likeTalks": [abstractId], "restrictions": [{ "type": "talks", "ids": [...] }], "top": <number of ids>, "pageSize": 1000 }`                                                | One for each place reported  |

The pages ask for one more match than a box shows, so that a match to a talk the box cannot show still leaves it
full. The tester's report asks for as many matches as it names talks, so every match among them is listed. It also
makes the same two searches the pages make, with the same `top`, so what it says a place shows is what the page shows.

Each request reads every page. A standard search has 3 seconds in all; a talks search has 10 seconds for each thousand
talks, and names at most a thousand talks, so a larger place takes several searches. On the local API with 40 talks,
a first ask took 12 to 25 ms (measured). The host app never sends `k`. If one page fails, the whole search counts as
unavailable. Every request is checked against the host app's copy of the conference API's contract before it is sent.

## What each box shows

| Box                                      | Restriction     | Asked for | Shown |
| ---------------------------------------- | --------------- | --------- | ----- |
| Related talks, on a talk page            | `conference`    | 6         | 5     |
| Conferences and Symposia, per conference | `subConference` | 4         | 1     |
| Meeting Calendar, per day                | `day`           | 4         | 3     |
| Meeting Calendar, per time block         | `timeBlock`     | 4         | 2     |
| A session's page                         | `session`       | 4         | 1     |

The "Shown" column is `SHOWN_PER_PLACE` in the host contract, and the "Asked for" numbers are worked out from it. A
restriction lists only matches, best first, at most `top` of them, and at most one talk per session in a `day` or a
`timeBlock`. The backend keeps the first ones from each list, as many as the box shows. It leaves out a match to a talk
the demo does not show, a pool for the attendee's own conferences or for a conference the list does not show, a talk in
a time block its session no longer starts with, and a talk in a session it is no longer in. Each box shows what its pool
holds, and the tester's report reads the same pools, so the two always agree.

## What comes back

The answer has one entry for each main talk, the talk the search names, with its connections. An entry may go on to
the next page, so the host app joins a talk's connections across pages, in the API's order. Each connection names
both talks, the main talk first, and every pair in it follows that order: `titles`, `descriptions` and each pair of
`methods`. Only real matches are listed, so a connection has no `match` field.

This answer for the fixed abstract `498388` came from the local API with placeholder matches, asked with `"top": 2`
and no restrictions, which means the whole conference:

```json
{ "abstracts": [{
    "talk": "498388",
    "title": "Emerging Satellite Constraints on Fire Combustion and Smoke Injection for Advancing Atmospheric Chemistry Modeling (Invited Presentation) (Core Science Keynote)",
    "connections": [
      { "talks": ["498388", "485648"],
        "titles": ["Emerging Satellite Constraints on Fire Combustion …", "Evaluation of Satellite Estimates of Precipitation in Equatorial Africa"],
        "restriction": { "type": "conference" }, "rank": 1, "score": 0.5, "kind": "core", "shared": ["technique"],
        "descriptions": ["Placeholder match …", "Placeholder match …"], "methods": [], "programmeVersion": "pv_…" },
      { "talks": ["498388", "486106"], "restriction": { "type": "conference" }, "rank": 2, … }
    ] }] }
```

For the pages, the backend turns each connection into a match: the other talk is `talks[1]`, and the reason shown is
`descriptions[0]`, which the main talk's side wrote about the other talk. It then groups the matches by restriction
into pools for the improvements. It names a conference by its track id, a day by its date, a time block by its start
instant in UTC, and a session by its id. Each pool keeps the API's order, and each match carries its talk as this
programme shows it. Each improvement reads only its own pool, and never sorts matches into pools or chooses among them
itself.

When the API cannot answer, related talks say they are unavailable. The other improvements draw their gold outlines
empty, with at most one line saying so.

## Restrictions still being judged

The API judges nothing in advance, not even the whole conference. The first ask about a talk lists no matches for a
restriction it has not judged yet, and its `judging` list names it as `{ basedOn, restriction }`. The matches come on
a later ask, once the API's worker has judged them, and are kept until the programme changes. On the local API, the
first related-talks search for `498388` came back as
`{ "abstracts": [], "judging": [{ "basedOn": "498388", "restriction": { "type": "conference" } }] }`.

- **Related talks** say, in one line inside the panel's gold outline, "Related talks are still being matched. Look
  again in a moment." Reloading the page asks again.
- **The other four improvements** show an empty box for a restriction still being judged. The next visit fills it.
- **The tester's report** is never partial. It makes every search, so that each restriction starts being judged, and
  while anything for the abstract is still being judged it answers `202` with a plain message, such as
  `The matching API is still judging 31 restrictions for this abstract; ask again shortly.` Once nothing is being
  judged, it answers `200` in its usual form. Each place's `verdicts` are then exactly the connections its talks
  restriction lists, passed on unchanged. Its `notJudged` lists each of the place's talks that no connection names: a
  talk the API judged not to match, or one it never reached.

## The connection test

The developer console's **Test connection** sends `{ "likeTalks": [talkId], "top": 1 }`, without restrictions, which
asks about the whole conference. An answer that the talk is still being judged counts as working. The API refuses the
old fields with a 400: `topPerPerson` and `include` are "not a field the API accepts", and a search that names neither
`likeTalks` nor `people` is told to "name the people or the liked talks to match".
