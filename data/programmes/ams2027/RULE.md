# The host app holds every talk of the AMS 2027 Annual Meeting, as AMS published it, public fields only.

## AMS 107th Annual Meeting programme (2027)

The public programme of the 107th AMS Annual Meeting, 10 to 14 January 2027 at the Colorado Convention Center in Denver and online, as published so far. AMS is still building it: on the day of this download, 295 of the 922 sessions kept had no session number, and 197 of the 4,531 papers (162 of them breaks) had no number. The host app's AMS version is built from these files.

## Source and refresh

The files come from the public API behind the Confex Meeting App, which runs on the web at `https://ams.confex.com/ams/107ANNUAL/meetingapp.cgi`:

```
https://ams.confex.com/ams/107ANNUAL/meetingapi.cgi/<Type>
```

`<Type>` is `Paper`, `Session`, `SlotData` or `Program`. To refresh all four files, run `npm run fetch:ams --workspace=@repo/host-store` from the repository root. It makes one request per type, two seconds apart, and writes nothing until all four have arrived. Then `npm run load --workspace=@repo/host-store -- ams` loads the new files.

## Files (fetched 2026-11-25)

| File | Rows | Contents |
|---|---|---|
| `107ANNUAL-Paper.json` | 4,531 | Talks, posters and breaks |
| `107ANNUAL-Session.json` | 922 | Sessions, panels, town halls and events, with chairs in `TopDisplay` |
| `107ANNUAL-SlotData.json` | 5,472 | Schedule slots: date, start and end time, room and building |
| `107ANNUAL-Program.json` | 49 | The conferences and symposia inside the meeting |

Rows link by Confex id, as in the 2026 files the loader was first written for. A paper's `ParentList_ParentEntries` holds `Session/<id>` and `Program/<id>`. Its `ParentList_SlotData` holds the id of its row in `107ANNUAL-SlotData.json`, where `Room_Name` and `Property_Name` give the room.

## What was removed

The API returns more than the published programme shows. `data/store/src/fetch-ams.ts` keeps only the fields the programme shows, per type, and drops any field it does not list. The removed fields include:

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
| `Paper` | `24ad112b441c52d973d7ed8a37bfc9594a0f9bfc28e5241a38b66c4cd8b95d35` |
| `Session` | `0e998cd72e5fd2ec54aedcf69e6eb5b3482e0ef2a542088bbf04126bb441c020` |
| `SlotData` | `ad5cf0c8926cc56790aa5d697c5f8094cc003df70b95034ce82b1a8043f03a10` |
| `Program` | `e3fad3401df1c75c85f6671b04c6dcabf2019ab702a6761a0e074bb30cdced4f` |

The abstracts belong to their authors and AMS. Use them only inside the private demo.
