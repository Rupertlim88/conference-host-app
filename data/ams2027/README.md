# AMS 107th Annual Meeting programme (2027)

The public programme of the 107th AMS Annual Meeting, 10 to 14 January 2027 at the Colorado Convention Center in Denver and online, as published so far. AMS is still building it: on the day of this download, 263 of the 886 sessions kept had no number yet. The host app's AMS version is built from these files.

## Source and refresh

The files come from the public API behind the Confex Meeting App, which runs on the web at `https://ams.confex.com/ams/107ANNUAL/meetingapp.cgi`:

```
https://ams.confex.com/ams/107ANNUAL/meetingapi.cgi/<Type>
```

`<Type>` is `Paper`, `Session`, `SlotData` or `Program`. To refresh all four files, run `npm run fetch:ams --workspace=@repo/host-store` from the repository root. It makes one request per type, two seconds apart, and writes nothing until all four have arrived. Then `npm run load --workspace=@repo/host-store -- ams` loads the new files.

## Files (fetched 2026-11-16T23:06Z)

| File | Rows | Contents |
|---|---|---|
| `107ANNUAL-Paper.json` | 4,521 | Talks, posters and breaks |
| `107ANNUAL-Session.json` | 886 | Sessions, panels, town halls and events, with chairs in `TopDisplay` |
| `107ANNUAL-SlotData.json` | 5,420 | Schedule slots: date, start and end time, room and building |
| `107ANNUAL-Program.json` | 49 | The conferences and symposia inside the meeting |

Rows link by Confex id, as in the 2026 files the loader was first written for. A paper's `ParentList_ParentEntries` holds `Session/<id>` and `Program/<id>`. Its `ParentList_SlotData` holds the id of its row in `107ANNUAL-SlotData.json`, where `Room_Name` and `Property_Name` give the room.

## What was removed

The API returns more than the published programme shows. `data/store/src/ams-public.ts` keeps only the fields the programme shows, per type, and drops any field it does not list. The removed fields include:

- reviewer ratings and comments;
- submitters' notes to organisers;
- payment, billing and account details;
- withdrawal reasons;
- session subtitles, which carry organisers' email addresses.

The filter also drops these rows:

- withdrawn papers, which AMS marks `w` (two live sessions are marked `i`, and AMS's own app shows them, so they stay);
- rows excluded from the web programme, and the papers in an excluded session;
- the exhibit hall, sponsor and waste-basket programmes (`EXHIBITHALL`, `SPONSORS`, `TRASH`) and their sessions;
- slots whose paper or session was dropped.

Lists such as a session's `ChildList_Paper` stop naming dropped rows. Abstracts and session descriptions lose every HTML attribute, because authors' editors hide metadata there, including one author's email 453 times. Email addresses that authors put in the visible text of their own abstracts stay, because the programme publishes them.

The unfiltered downloads were never written to disk. Their SHA-256 hashes let you check that a fresh download matches the one these files came from:

| Unfiltered download | SHA-256 |
|---|---|
| `Paper` | `97cbc09c245bee77a434fecdc324909fc954edbc582964c57e4dd05c594e25a9` |
| `Session` | `b7dcf9d5b0e455960630baedea6d245af646a7a5b17b926c60dd44d37dcea7db` |
| `SlotData` | `d70d5c2ba99c2f75c0f4dfd15e2ef61c4612fb6e009cd82cde79ced3707e5fa7` |
| `Program` | `ba70782efc0b68ba8309a54bd98bdb3adf9a0e61ac74d0cfc3c07f2141077def` |

The abstracts belong to their authors and AMS. Use them only inside the private demo.
