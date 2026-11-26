# Store code — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of how the host app reads and writes its database

### The database

2. **The meeting has its own schema in the database, and sign-in has a schema of its own.** The meeting's schema
   holds its meeting, tracks, sessions, talks, people, who gives which talk, the pages of names, the demo's settings,
   stars, notes, send runs, every talk AMS publishes with its people, and the latest test set. A track says whether the conferences list shows it, and sessions and talks carry Program
   Highlights' marks. Sessions
   and talks keep the published programme beside the live one, so that every organiser's change can be shown and undone.
   Sign-in's tables (users, sessions, accounts, verifications) sit in their own schema, and an account is unique by
   issuer and account id.
   *How:* code alone: Drizzle table definitions.
   *File:* `tables.ts`

3. **The database's form changes only by adding a migration, never by editing one.** The migrations are applied in
   order, and each runs once.
   *How:* drizzle-kit writes each migration from the tables, and Claude may add to it by hand, such as filling a new
   column, and reads it before it is committed; the migrator applies each once (the rule on applying migrations).
   *File:* `migrations/`

4. **Every connection to a database off this machine is encrypted.** A connection with no setting is made to require
   encryption, and a setting that turns it off is refused. Each process keeps a pool of at most four connections.
   *How:* code alone: the connection address's `sslmode` is checked before connecting.
   *File:* `connect.ts`

5. **Migrations are applied by a command of their own, which loads nothing, so organisers' edits stay.** They are kept
   in their own tracking table. They are a separate entry point, so that the web app never bundles them.
   *How:* code alone: Drizzle's migrator; the `migrate` command counts with this file.
   *File:* `migrate.ts`

### Gathering the programmes

6. **AMS's public programme is fetched in nine requests, two seconds apart, and only what the programme shows is kept.** The four types of the programme, Program Highlights' four lists and the meeting's information are fetched;
   nothing is written until all nine have arrived. Only the fields the public programme shows are kept, for each type.
   Withdrawn papers, rows left out of the web programme (but not the exhibit hall, career fair and sponsor listings,
   which AMS's menu links), the waste-basket programme, papers in dropped sessions and slots of dropped rows are
   removed, and lists of child rows stop naming them. A highlight list keeps only what is kept. The officers and
   committees pages keep only their headings and the names under them, never AMS's own words. Abstracts
   and descriptions lose every HTML attribute. Each unfiltered download is hashed, so a later download can be compared,
   and is never written to disk.
   *How:* code alone: `fetch` from the Confex meeting API, one allow-list of fields for each type.
   *File:* `fetch-ams.ts`

7. **AMS's files become the host app's programme: its sessions, talks, people and tracks.** Session numbers, kinds and
   chairs are read from AMS's own display text; the presenter is the name AMS shows in bold, and becomes one of the
   meeting's people, known by an id made from the name; times come from AMS's timestamps; titles, abstracts and
   descriptions become plain text; talks are put in order within each session. A listing of organisations is a track
   the conferences list leaves out; Program Highlights' lists mark their sessions and talks; the officers and committees
   pages become headings with their lines. The meeting's own name, dates, time zone, venue and city are set here, as AMS
   announces them.
   *How:* code alone: the files are checked with zod before anything is mapped.
   *File:* `ams-rows.ts`

8. **A time in the meeting's own zone and an exact instant are turned into each other, through daylight saving.** A
   date and a 24-hour clock time on the meeting's wall clock give the one instant they name there, in summer and in
   winter; and an instant is written as the date and time the meeting's clock shows then, to the second, with that
   moment's offset from UTC, such as 2027-01-11T08:30:00-07:00.
   *How:* code alone, with the platform's time-zone data.
   *File:* `time.ts`

9. **Loading puts back the published programme in one step, and keeps stars, notes and sign-ins.** The
   meeting, tracks and sessions are written as both the live and the published programme, every talk AMS publishes is
   written with its people as the whole programme, the pages of names are written afresh, and anything no longer in the
   files is removed. The demo then holds the latest test set's talks, or the sample's until a test set arrives, as both
   live and published. It all happens in one transaction, so a failed load changes nothing. It undoes
   organisers' edits.
   *How:* code alone: one transaction of writes in chunks of 500, holding the talks as a test set does; the `load`
   command migrates first.
   *File:* `load.ts`

10. **The demo carries a sample: every track and session, with five talks with an abstract from each track.** The
    five are spread evenly through the track's talks in time order, so that every day of the meeting holds some, and a
    talk counts for every track it is in. Breaks and the talks on Program
    Highlights' lists are always kept, and count against no track. People stay only with a talk that stays.
    *How:* code alone; the `load` command works it out from AMS's files, and loading holds its talks until a test set
    arrives.
    *File:* `sample.ts`

11. **The store keeps AMS's whole published programme beside the talks the demo holds.** Every talk AMS publishes is
    kept with its session, start and conferences, so that a test set can choose any of them and the programme map can
    list them all; the attendee app never reads it, and it holds only what the public programme shows.
    *How:* code alone; the `load` command writes it from AMS's files, in the same step as the programme.
    *File:* `whole-programme.ts`

12. **The latest test set says which talks the demo holds.** Storing a test set replaces the one before it, and in the
    same step makes the demo hold exactly its talks, taken from the whole published programme, with every session and
    conference kept, and fixes the demo to its first abstract. Holding restarts the demo's programme: organisers'
    edits go away, and stars and notes stay. Until a test set arrives, the demo holds the sample; loading again keeps
    the latest test set and holds its talks.
    *How:* code alone: one transaction.
    *File:* `test-set.ts`

### Reading and writing

13. **The attendee app sees only the talks that are not withdrawn.** It reads the meeting, its days in the meeting's
    zone, tracks, sessions, talks and people; the conferences list leaves out the listings of organisations. It finds a
    programme AMS's menu opens by its code, reads Program Highlights' lists and the pages of names, and gives the
    conferences each of a set of talks is in. A person is listed only while one of their talks is shown.
    A person who has no shown talk has no page either. Search covers talks, sessions and people, at most 50, 20 and 20.
    The talks a send carries are the same shown talks, with their session's title, format and start, the start as the
    meeting's clock shows it, with its offset. The keep-alive's one
    trivial read is here, and so are the short forms of a session and a talk that every list shows.
    *How:* code alone: SQL through Drizzle; every read filters out withdrawn talks.
    *File:* `programme.ts`

14. **Each guest's stars and notes are their own, and are kept when a talk is withdrawn, but not shown.** A guest
    stars and unstars talks and sessions, and sees their schedule. A note saved blank is deleted.
    *How:* code alone: every read and write is filtered by the guest's id.
    *File:* `guest-data.ts`

15. **Organisers see every talk with how it differs from the published programme, and their edits never cross.**
    - **Reading:** papers in pages of 50, filtered by status (all, scheduled, withdrawn, changed) and search, where a
      page past the end gives the last page; sessions with their count of shown talks and whether they changed,
      leaving out the listings' organisations; the
      published days; the counts of every change.
    - **Editing:** moving a paper, withdrawing or restoring it, changing a session's time and room (its talks move with
      it, and untimed talks take its times), and putting everything back as published. Moving a paper and changing a
      session lock the session they change first, and putting back does sessions before talks, so two edits never
      cross; withdrawing or restoring a paper changes that one paper in one step.
    *How:* code alone: SQL through Drizzle, with `SELECT … FOR UPDATE` on the session a move or a change edits.
    *File:* `organiser.ts`

16. **Only one send runs at a time, and a run that never finished is taken over after ten minutes.** A run starts only
    when no other is running; it ends as sent or failed, or as interrupted when it is taken over, and only a running
    one can end. Its error is kept to 500
    characters. The last ten runs are listed.
    *How:* code alone: a partial unique index allows one running row; the model check in verify-send-runs covers it.
    *File:* `sync-log.ts`

### The demo's settings

17. **The demo is fixed to one abstract, which the developer console sets.** A shown talk with an abstract, not a
    break, can be fixed; any other is refused, and the setting stays. With none set, or when the fixed talk is later
    withdrawn, the demo's default abstract stands in: a highly cited AMS 2027 talk, kept in every sample, whose topic
    reaches many fields. If that talk is not shown, the earliest such talk stands in. The setting is kept through
    reloads.
    *How:* code alone: one row of settings, read and written through Drizzle.
    *File:* `demo-settings.ts`
