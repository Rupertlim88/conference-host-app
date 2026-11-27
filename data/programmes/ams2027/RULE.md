# The host app holds every talk of the AMS 2027 Annual Meeting, as AMS published it, public fields only.

## AMS 107th Annual Meeting programme (2027)

The public programme of the 107th AMS Annual Meeting, 10 to 14 January 2027 at the Colorado Convention Center in Denver and online, as published so far. AMS is still building it: the files hold 4,531 papers (162 of them breaks) and 922 programme sessions, beside the exhibit hall's, career fair's and sponsors' 148 listed organisations. The host app loads all of them as AMS's whole programme. The demo holds the talks of the latest test set a tester sends or, until one arrives, a sample: every session, and five talks with an abstract from each conference, with every break and highlighted talk.

## Source and refresh

The files come from the public API behind the Confex Meeting App, which runs on the web at `https://ams.confex.com/ams/107ANNUAL/meetingapp.cgi`:

```
https://ams.confex.com/ams/107ANNUAL/meetingapi.cgi/<Type>
```

`<Type>` is `Paper`, `Session`, `SlotData` or `Program`. The fetch also reads four of Program Highlights' indexes (`Index/SpecialTheme~1`, `Index/hasHandouts~1`, `Index/CoreKeynote~Yes`, `Index/NewFellowAward~Yes`) and the meeting's information (`ModuleMeetingInfo`), for the officers' and committees' pages. To refresh all six files, run `npm run fetch:ams --workspace=@repo/host-store` from the repository root. It makes nine requests, two seconds apart, and writes nothing until all nine have arrived. Then `npm run load --workspace=@repo/host-store -- ams` loads the new files.

## Files (fetched 2026-11-25, 23:48 UTC)

| File | Rows | Contents |
|---|---|---|
| `107ANNUAL-Paper.json` | 4,531 | Talks, posters and breaks |
| `107ANNUAL-Session.json` | 1,070 | Sessions, panels, town halls and events, with chairs in `TopDisplay`; and the 148 organisations the exhibit hall, career fair and sponsor listings name |
| `107ANNUAL-SlotData.json` | 5,472 | Schedule slots: date, start and end time, room and building |
| `107ANNUAL-Program.json` | 52 | The 49 conferences, symposia and events inside the meeting, and the exhibit hall, career fair and sponsor listings |
| `107ANNUAL-Highlights.json` | 4 lists | Program Highlights' lists: 111 PEOPLE-themed sessions, 5 talks with supplementary materials, 7 core science keynotes and 3 new fellows |
| `107ANNUAL-MeetingInfo.json` | 2 pages | The officers' 5 headings and the committees' 45, each with its lines of names |

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
- rows excluded from the web programme, and the papers in an excluded session, except the exhibit hall, career fair and sponsor listings (`EXHIBITHALL`, `CAREERFAIR`, `SPONSORS`), which AMS's menu links;
- the waste-basket programme (`TRASH`) and its sessions;
- slots whose paper or session was dropped.

Lists such as a session's `ChildList_Paper` stop naming dropped rows, and a highlight list keeps only kept rows. The officers' and committees' pages keep only their headings and the names under them; AMS's own words, such as its thanks to the committees, are dropped. Abstracts and session descriptions lose every HTML attribute, because authors' editors hide metadata there, including one author's email 453 times. Email addresses that authors put in the visible text of their own abstracts stay, because the programme publishes them.

The unfiltered downloads were never written to disk. Their SHA-256 hashes let you check that a fresh download matches the one these files came from:

| Unfiltered download | SHA-256 |
|---|---|
| `Paper` | `df58b137e6e82d86bf0d5ac7845ab710eefce160662625561e494f0d5ff4e7f6` |
| `Session` | `68f177bd22697fad86620f390576725b895665be9fe4e9c8f53cd79edc861472` |
| `SlotData` | `2b85105431888b85a2f0289782d3570fd27eab6dbd8d24147910d475c7420309` |
| `Program` | `4e35dbdee0b3fff1d8ad7ace59e5844e604cb5fe411d2fa5703906ebc7ea5acb` |
| `Index/SpecialTheme~1` | `03d211f1217f2b4a5ef19121f3c4eb87ba878fe32f79ae5aee6c4d3f99687f91` |
| `Index/hasHandouts~1` | `32be2c33decb72419aa26f0a488565fe4ff7065d4f8c5ea774e5164c2436f5e0` |
| `Index/CoreKeynote~Yes` | `0c57c56c8da819d30b72d3e6d58f3154a87112a99a5a30e8df9d16a96efda06c` |
| `Index/NewFellowAward~Yes` | `214e6faed725322582cb745838933a8e78b385ac395cde9b6fdb38d1a73ac2a4` |
| `ModuleMeetingInfo` | `e043551a0df216392c67d17e6a3c8c10401ff612480a97a49727a450fe1a0770` |

The abstracts belong to their authors and AMS. Use them only inside the private demo.
