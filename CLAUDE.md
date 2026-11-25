# Host app — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## Rules about the CLAUDE.md files

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

2. **In this repository, Claude decides where the global rules leave a CLAUDE.md change to the user.** The global CLAUDE.md's rule never to change a CLAUDE.md unless the user directly asks does not apply to the host app's CLAUDE.md files: the rule that Claude writes and changes the rules takes its place. Where a rule copied from the global CLAUDE.md says the user decides a change to a CLAUDE.md, such as when a new or changed rule conflicts with another rule, or where each rule belongs, Claude decides from what the user has said and reports every change; it asks the user, quoting the rules involved, only where what the user has said does not settle it.

## What the host app is

3. **The host app is a demo, and uses only information that is publicly available online.** It runs on public conference programmes and made-up attendees. It may hold real people's data only where that data is already publicly available online, such as the names of authors and speakers in a published programme, and never any other personal data, apart from the account data that signing in with Google needs, such as each user's name and email address. It meets OWASP ASVS Level 1, plus three firm lines: the key it uses to call the conference API is kept secret, every connection is encrypted, and the organiser and developer consoles require sign-in.

4. **The host app looks and works like the systems AMS already uses.** It uses only publicly available information. It imitates, as closely as possible, the systems AMS uses for its 2027 Annual Meeting: on the organiser's side, the system that handles abstracts and builds the conference programme, Confex; on the attendee's side, the meeting app, the Confex Meeting App. It has its own name, and its own logo and look, so it is never an exact copy of theirs, and its name makes clear that it is a demo.

5. **The host app is built for one society: the American Meteorological Society (AMS).** It uses the latest conference materials AMS has made public, from its 2027 Annual Meeting: its programme, sessions, talks, abstracts, authors and speakers. It replicates the platforms AMS uses for that meeting, for organisers and for attendees, closely but never exactly. It has one UI version, replicating AMS's meeting app, hosted online, as faithful to the original as the rules allow, and the demo plugs the conference API into it to show AMS the results.

6. **The host app is a standalone conference system, with a web version and a mobile version.** It works on its own, as a society's own conference system would, for organisers and attendees alike. Attendees can use it in a web browser and as an app on their phones.

7. **The demo is the host app connected to the conference API.** The host app calls the conference API through the API's address and a key, set in the host app, exactly as a real conference system would. Connecting the two is the demo: the conference API's matches appear inside the host app, showing what a society's existing system gains from the conference API.

8. **The host app is always on, and costs as little as possible.** It runs in the cloud all the time, so the people it is shown to can open it at any moment; anyone with a Google account can sign in, and once signed in can use the attendee app, the organiser console and the developer console, because this is a demo; and it costs nothing beyond services the user already pays for wherever possible. People sign in with their Google accounts, as they would in a real conference app. It is built well and kept working, but not to the conference API's production security standard.

9. **The host app acts as a normal AMS meeting site would, and adds one thing: a matching API can be plugged into it.** It mimics the AMS site: attendees browse the AMS 2027 Annual Meeting, and organisers run it, as they would on AMS's own meeting site. The one thing it adds is the ability to connect a matching API, send it the meeting's talks, and show what it gives back.

## How the host app is built

10. **The host app has three parts.**
   - The **UI** is where people see and use the conference app.
   - The **backend** holds all of the host app's rules: it calls the conference API, returns its results, and does all the backend work of running a conference.
   - The **data layer** keeps the truth: it stores everything safely, so nothing is ever lost or corrupted.

11. **Each part has its own folder, side by side.** The host app's three parts (UI, backend and data layer) are organised into three folders: one for the UI, one for the backend and one for the data layer. The three folders sit side by side, at the same level, inside the host app's folder, and each holds everything that belongs to its part.

12. **UIs come in versions you pick from, like files in a folder.** The UI part can hold many versions. Each version is its own folder, and all the versions sit side by side, at the same level, inside the UI folder, like files in a Google Drive folder: you can add a version, remove one, and select whichever one you want to use. **Very important: every UI is self-contained.** All the code a UI uses must be contained within that UI's own version, so no UI may use the code of any other UI.

13. **UIs are swappable.** Choosing a different UI is configuration, not code. Adding a UI is a new UI version that talks to the host app's backend. The host app has one backend and one data layer.

14. **The host app's stack is fixed.** The chosen tools are:
   - **tRPC**, with zod, carries all communication between the UIs and the backend.
   - **Drizzle ORM**, with the `postgres` driver and drizzle-kit migrations, does all database access.
   - **Supabase**, with its PostgreSQL database, is the hosted database.
   - **Vercel** hosts the host app.
   - **Better Auth** handles all sign-in and sessions.
   - **shadcn/ui with Tailwind v4** provides all UI components and styling.
   - **next-intl** handles all user-facing text and date, time and number formatting.

## Connecting a matching API

15. **Any matching API can be plugged in, as long as it speaks the conference API's contract.** Any API can connect to the host app, not only the conference API: an API is chosen by its address and key, set in the host app. Every request the host app sends has exactly the form the conference API's contract asks for, and is checked against that contract before it is sent, so any API that takes the conference API's contract can be plugged in without changing the host app.

16. **For now, the host app sends the programme and shows each talk's related talks; any further processing of what a matching API returns comes later.** Everything else the host app needs is built now. What a matching API returns is used in one place today: the related-talks panel on each talk page, which shows the API's matches for that talk. Any other processing of what an API returns is added later.

# Rules for the whole app (from the global CLAUDE.md, except where the host app's rules about the CLAUDE.md files say otherwise)

## Rules about the CLAUDE.md files

2. **The CLAUDE.md files: which are allowed, and what each contains.** Only the CLAUDE.md files listed here, and those that a UI's or a matching engine's own CLAUDE.md lists within its own folder, may exist in this repo; never create a CLAUDE.md anywhere else. They form a tree:
   - **Global**: `CLAUDE.md` at the repo root. It contains the summary of what the CLAUDE.md files are, then the rule never to change a CLAUDE.md unless the user directly asks, first, then the rules the whole app follows.
     - **Conference API**: a CLAUDE.md at the top of the conference API folder. It starts with the summary and the rule never to change a CLAUDE.md unless the user directly asks, copied word for word from the global CLAUDE.md, then the user's specification of the conference API.
       - **Conference API backend**: a CLAUDE.md at the top of the conference API's backend folder. It starts with the summary and the rule never to change a CLAUDE.md unless the user directly asks, copied word for word, then the user's specification of the conference API's backend.
       - **Conference API data layer**: a CLAUDE.md at the top of the conference API's data folder. It starts with the summary and the rule never to change a CLAUDE.md unless the user directly asks, copied word for word, then the user's specification of the conference API's data layer.
       - **Matching engines**: a CLAUDE.md at the top of the conference API's matching folder. It starts with the summary and the rule never to change a CLAUDE.md unless the user directly asks, copied word for word, then the user's specification for all matching engines.
         - **Each matching engine**: one CLAUDE.md in each engine's own folder, inside the matching folder. It starts with the summary and the rule never to change a CLAUDE.md unless the user directly asks, copied word for word, then the user's specification for that engine.
     - **Briefing**: a CLAUDE.md at the top of the briefing folder, which sits outside both products. It starts with the summary and the rule never to change a CLAUDE.md unless the user directly asks, copied word for word from the global CLAUDE.md, then the user's specification of the briefing that teaches the conference API to its owner.

   The host app's CLAUDE.md files are kept in the host app's own repository.

   When working in a folder, follow every CLAUDE.md on its path through this tree: the global one, its product's (the conference API's or the host app's), its part's, and its UI's or engine's. Adding a new UI or matching engine includes creating its CLAUDE.md; from then on, the rule never to change a CLAUDE.md unless the user directly asks applies to it.

   **Inside a UI or a matching engine, its own CLAUDE.md governs.** Each UI and each matching engine is one version among many, in a folder of its own. This list has no say over the CLAUDE.md files inside a version's folder; that job belongs to the version's own CLAUDE.md. It lists every further CLAUDE.md the version has, and the part of the version each covers; a CLAUDE.md inside the version that it does not list may not exist.

3. **Report every CLAUDE.md change in the chat.** After changing or adding to any CLAUDE.md, list in the chat exactly what was changed or added, file by file.

4. **Keep the rules of every CLAUDE.md in categories.** The rules in a CLAUDE.md are grouped into categories, each under its own heading. Whenever you add a rule to a CLAUDE.md, first read all of its existing rules, then put the new rule in the category it fits; if none fits, make a new category for it. After adding the rule, you may also reorganise the existing categories (rename, split, merge or reorder them, or move rules between them) where that makes the file clearer. **Very important: when you reorganise, you must be 100% sure that the meaning and intent of every rule stay exactly the same.** Move and regroup rules; never change what a rule says or requires. **Show every reorganisation to the user**, just as you show any other change to a CLAUDE.md (the rule to report every CLAUDE.md change in the chat): list, file by file, every category that was created, renamed, split, merged or reordered, and every rule that moved, with where it was and where it is now.

5. **When a new or changed rule conflicts with another rule, the user decides.** Whenever you add or change a rule in any CLAUDE.md, read all the CLAUDE.md files, including the one you are changing, and check whether the new or changed rule conflicts with any other rule. If it does, never change the other rule yourself: raise the conflict with the user, quoting the rules involved. Change the other rule only after the user explicitly says they agree to changing it, and then change only what they agreed to (the rule never to change a CLAUDE.md unless the user directly asks).

6. **No file paths or file names in a CLAUDE.md.** A CLAUDE.md states intent, never wiring: it must not name specific file paths or file names. There are three exceptions: the single file that lists every dependency and its version, which is named so everyone knows where to look; the one file each rule in a lowest-level CLAUDE.md names (the rule that each file states its rule's bold sentence, and each lowest-level rule names its file); and the System Rules section of the global CLAUDE.md, which may name the files its tools and checklists use.

25. **Rules refer to each other by their idea, never by their number.** Wherever a rule in any CLAUDE.md points to another rule, it names that rule's idea, never its number.

27. **Most rules are about what specific code does, and sit as low as possible.** The higher CLAUDE.md files give general direction; most rules say what a specific part of the code does, and each of those sits in the lowest CLAUDE.md it can, the one closest to the file that carries it out. A rule that touches two folders but is really two ideas put together is split, each idea going to the CLAUDE.md of its own folder, with nothing it requires changed. Only a rule that truly cannot be split sits higher, in the lowest CLAUDE.md that covers everything it touches; this is the exception, used only where there is no other choice. Claude proposes where each rule belongs, and the user decides (the rule never to change a CLAUDE.md unless the user directly asks).

28. **At the lowest level, each rule is tied to one file, and each file to one rule.** Each rule in a lowest-level CLAUDE.md is carried out by exactly one file, and each file is tied to exactly one rule there, both ways: from the rule you can find its one file, and from the file its one rule. A higher CLAUDE.md may also refer to a file, to give general direction, but at the lowest level only one rule is tied to it. The one exception is a rule in a lowest-level CLAUDE.md that covers its whole folder and cannot be split, such as the security level a part meets: it is tied to no single file. The briefing is exempt: its rules are tied to no file, and its files are not counted. For data, a whole folder of data stands as a rule's one file. A file's own tests go with it, and are not counted as a separate file, and the empty file that lets other code use a folder's code is not counted either. Files that only set up the tools (such as the test settings), the overview at the top of a folder, and the docs are not counted.

29. **Each file states its rule's bold sentence, and each lowest-level rule names its file.** Every file opens with a heading that states the bold sentence of the one CLAUDE.md rule it carries out, word for word, never the rule's number, since numbers can change. Each rule in a lowest-level CLAUDE.md names the one file that carries it out. Data cannot carry a heading, so each folder of data holds one short file that opens with the heading for all the data in it, and the rule names that folder.

30. **A file and its rule name each other only once the tie is verified.** A file's heading names its rule, a folder of data names its rule, and a lowest-level rule names its file, only after it has been checked that the file does everything the rule asks; a tie is never written in advance.

31. **A check confirms every tie, at all times.** An automatic check runs with the tests and reads every lowest-level CLAUDE.md: it fails if a rule names a file that does not exist, if a file's heading does not state the bold sentence of the rule that names it, if a folder of data has no note naming its rule, or if a file is tied to two rules; and it lists every rule and every file not yet tied, so that nothing is missed.

## System Rules

### Developer Persona

You are an elite software engineer focused on production-ready, high-performance code.
You prioritize security and never commit API keys, secrets, or sensitive .env files.
You use a collaborative multi-agent approach, spinning up 3–5 agents for complex planning tasks.

### My stack

These are the only workflow tools installed. Use them. Don't go looking for other frameworks.

| Tool | Kind | Use it for |
|---|---|---|
| **Superpowers** | plugin, triggers itself | The process for every coding task: brainstorming, writing-plans, test-driven-development, systematic-debugging, verification-before-completion, code review |
| **pstack** | plugin, triggers itself (rules below) | Judgment and proof: its principles, each project's verification skill, review tools |
| **Context7** | MCP | Current docs for any library, before wiring or upgrading it |
| **Playwright** | MCP | Driving web apps in a real browser to prove a change works |
| **Serena** | MCP | Finding symbols and renaming safely in large codebases |
| **Pyright** | plugin | Python type errors |
| **/prd** | my command | Writing a PRD.md for a new project |

pstack triggers itself through these rules. Whenever one of these situations comes up, use the matching pstack skill without being asked. To use one, read its `SKILL.md` in the installed pstack plugin and follow it. Its Cursor names map to Claude Code per pstack's `docs/harness/claude-code.md`.

- A user-facing change in a project with no verification skill: `create-verification-skill` first.
- The verification skill no longer matches the app (a drive fails on a working feature, or a feature is missing from its map): `maintain-verification-skill`.
- Changing code you haven't traced: `how`. Code shaped in a surprising way: `why`. I ask to understand something: `teach`.
- New types, or code that crosses function or module boundaries: `architect`.
- A change to shared code, stored data, or anything that sends or pays: `blast-radius` before calling it safe.
- Finishing a feature or a non-trivial branch: `interrogate` before saying it's done.
- Any speed, load or size number: `benchmark-checklist` before reporting it.
- Designing or changing retries, queues, concurrency, locks or state machines ("never send twice"): `create-formal-verification-skill`, or `maintain-formal-verification-skill` when that code already has one.
- I correct the same mistake a second time: `correct`.
- Writing READMEs, docs, PR descriptions or commit messages: `technical-writing`, then `unslop`.
- Design, refactor and debugging decisions: apply the matching pstack principle (the `principle-*` skills) and name it with the decision it changed.

Don't use `poteto-mode` or its playbooks. They assume Cursor, team PR fleets, other AI providers, and acting without asking.

### Good code means five things

**1. It works.**
- Done means proven on the real thing: run the real command, drive the real app, read back the stored value. Passing tests and "it compiles" are not proof.
- Use the project's verification skill when it has one. A user-facing change in a project without one: offer to create it.
- Put the evidence in the reply: the command and its output, the screenshot, the row. If a check couldn't run, say "not verified" and why.
- Bugs: reproduce first, find the root cause, fix it there. If two fixes built on one idea fail, test the idea itself before a third.

**2. It's simple.**
- Make the smallest change that solves the problem. No features, options, layers or guards nobody asked for.
- Delete before adding: dead code, one-caller wrappers and unused paths go first.
- Name the data shape before writing logic. A state machine, typed model or lookup table beats scattered if/else and booleans kept in sync.
- One owner for each piece of state. One way to do each task. Derive lists instead of keeping copies in sync.

**3. It's safe.**
- Check and parse outside data where it enters (requests, files, env vars, database rows, API responses) into typed values. Trust those types inside.
- Add an extra guard only right before something dangerous and irreversible: sending, deleting, paying, overwriting.
- Anything that can be retried must be safe to run twice. A crash halfway plus a rerun ends in the same state.

**4. It stays working.**
- Test first, per Superpowers' test-driven-development: failing test, watch it fail, least code to pass, tidy.
- Tests check what a user or caller can see. A test must fail when the behavior breaks and keep passing when only the internals change. Never test a mock. Mock only what can't run locally.
- A mistake made twice becomes a check (a type, a lint or a test), not another sentence in a doc.

**5. It scales.**
- With use: think about growth before shipping (pagination, indexes, batching, background work). Measure before claiming anything is faster.
- With code: organise modules by what they know, not by step order. Keep public interfaces small and hide real work behind them. Never import another part's internals.

### How every task runs

1. Restate my goal and what "done" means as a check that can pass or fail. If the evidence says my request won't reach my goal, say so first.
2. Read every CLAUDE.md on the path, and PRD.md if the project has one. Work should trace back to them.
3. Understand before editing: trace the code (`how`), and its history when the shape is surprising (`why`).
4. New features and behavior changes: Superpowers brainstorming first. Settle questions you could answer by running something with a quick prototype, not by asking me.
5. Build in small steps that each end green. Commit each one.
6. Prove it works (the first of the five things good code means), then a production-ready pass: clean code, accurate docs, no leftover debug code or narrating comments.
7. Report in plain words: what changed for the user, the evidence, and what's still open.

### Where Superpowers and pstack disagree

- **Tests:** test-first for all code (Superpowers). Tests are required but don't prove a change works on their own (pstack).
- **Proof:** the real app or real command decides, not the test report (pstack).
- **Validation:** at boundaries, trust types inside (pstack). Superpowers' "validate at every layer" only before irreversible actions.
- **Asking me:** settle facts by experiment. Ask me about product and preference calls, and anything on the "Always ask" list.
- **Plans:** write a plan (Superpowers writing-plans) only for multi-step work, after the design is settled. Small changes skip it.
- **Branches:** follow the repo's own rule. If the repo has none, ask once.
- **Extra agents:** only for complex planning or when I ask. Never for routine edits.

### Always ask me first

- Sending anything to anyone: email, messages, posts, form submissions.
- Writing to my Google account or any outside service.
- Spending money, buying credits, starting paid runs, beyond the budget set in the chat session.
- Deleting data, force-pushing, deploying to production. Merging into main follows its own rule, "Merging into main follows the mode", instead.
- Running experiments or downloads that cost money beyond the budget set in the chat session, or take a long time.

### New repositories

- Cloud and GitHub sessions see only what's in the repo, not this file. Run `/setup` in each new repo: it copies these rules and the skills they need into the repo, then offers `create-verification-skill`.

### Writing

- Plain words, short sentences, no jargon. Say what something does, not how it feels.
- Label every claim as measured, inferred or a guess. Never invent a link, citation or result.

### Pre-Commit Checklist

1. Run all test suites to ensure 100% pass rate.
2. Verify that .gitignore is correctly configured to exclude all secrets.
3. Explicitly check for hardcoded credentials or API keys.
4. Confirm that the implementation aligns with the approved plan or spec, if there is one.

## At the start of every session

7. **First, explain how this system works.** Before anything else in your first reply, tell the user in a few plain sentences: the CLAUDE.md files hold the user's intent for the app, in the user's own words, and they are the source of truth; only the user decides what they say, and a CLAUDE.md is changed only when the user explicitly asks for that change, except reorganising the categories that rules are grouped into, which never changes what a rule says and is always shown to the user; every change to a CLAUDE.md is listed in the chat after it is made; Claude carries out that intent, and everything Claude builds (code, contracts, tests, configuration, docs) must accord with the CLAUDE.md files.

8. **Next, say the app's mode and whether the conference API is on or off.** Straight after that explanation, in the first reply of every session, tell the user whether the app is in test or production mode, as the mode switch says, and whether the conference API is switched on or off, as checked on the live system at that moment. If it cannot be checked, say so and why, rather than guess.

32. **Everyone learns how the conference API works from its guide.** At the start of every session, read the guide at the top of the conference API's folder, which explains how the matching works, in order, with a worked example. Whenever someone asks what the project is or how it works, explain it from that guide, following its order and its example.

## Language

9. **English only.** The conference app works in English only.

## How the app is built

10. **The conference app has two parts, which meet only at the conference API's contract.**
   - The **conference API** is the main offering: an API that takes requests for matching and returns matched results.
   - The **host app** is a complete conference system, with its own UI and its own backend, which mimics the conference systems that conference organisers use. It gets its matches from the conference API through API requests, exactly as an outside conference system would. There is one host app, with one backend, and a UI of its own for each prospective conference, for demos.
   - The two parts share nothing but the conference API's contract; neither uses the other's code.

11. **The contract is binding, and it serves the CLAUDE.md files.** The contract must follow the intent of the CLAUDE.md files. To change what flows between the parts, change the contract first, with both the TypeScript and Python contract tests passing, then change the code on each side to match. Never work around the contract locally. The contract is a tool, not a law: if you think it is wrong, or it no longer matches the intent of the CLAUDE.md files, say so and propose the change; once the user agrees, change it through the normal checks, keeping it aligned with the CLAUDE.md files. Do not keep a wrong contract just because it is the contract.

12. **Two kinds of partner connect to the conference API: organisers and their app providers.** A partner is either a conference organiser that built its own conference technology, or a conference app provider connecting on behalf of one or more organisers. An app provider can reach a conference's data only after that conference's organiser has agreed, and only for what the organiser agreed to. Each organiser can see that agreement and withdraw it at any time, and withdrawing it cuts the provider off at once. A provider serving several organisers has each organiser's data kept completely separate, as if they were different partners, and every action it takes records which organiser it acted for.

13. **Each product has its own contract, which fixes every part's input and output.** There are two contracts: one for the conference API and one for the host app. The host app's contract is kept in the host app's repository; the two products meet only at the conference API's contract. Each product is made of parts (the conference API's backend, matching engines and data layer; the host app's UIs, backend and data layer), and its contract fixes exactly what goes into and comes out of each of those parts. A part can then be rebuilt or swapped, such as a new matching engine or a new UI, without changing any other part, as long as it keeps to the contract. Each contract is binding: to change what a part takes in or gives out, change the contract first, then the code on each side; never work around it.

## How work is done

14. **Test first, always.** Invoke the superpowers:test-driven-development skill before writing any code. Write a failing test, watch it fail, write the least code that passes, then tidy up. Code written before its test gets deleted and rebuilt with the tests. Running tests is always allowed.

15. **Long jobs show progress and save as they go.** Every experiment or long-running command shows live progress the user can check at any time (progress lines or a status file). It saves its work incrementally, so if it stops, nothing finished is lost and a rerun resumes rather than restarts. While testing, experiments, downloads and paid model calls may run within the budget Rupert sets in the chat session, such as $5; Claude keeps track of how much of it is left, and when it reaches $0, asks him to add to it. Once the app is live, there is no budget: the live service makes the calls its code makes.

16. **Every dependency and its version is listed in one file.** `DEPENDENCIES.md` at the repo root lists every runtime, tool and library the app depends on, with the version each manifest declares and the exact version installed. It is generated from the manifests and lockfiles and never edited by hand. To add, remove or change a dependency or a version, change its manifest and lockfile, then regenerate the file (`npm run deps`); CI fails when the file is out of date. The app may not depend on anything that file does not list.

17. **The stack is fixed.** This is a Turborepo monorepo with npm workspaces. **Turborepo** runs every task, from the repo root (`npm run build|dev|lint`, or `turbo run <task> --filter=<app>`). Do not substitute a different tool for any of these, or for any tool a product's rules choose, without Rupert's explicit approval. Install missing packages into the workspace that needs them, never globally; the Turborepo CLI is the one global tool. When wiring a tool for the first time, follow its current official docs (check via Context7).

18. **Mode switch.** The app's mode is: **test**.

    Only the user changes this line, to **production** when the app goes live for a real conference. While the mode is test, anything a rule allows only in test environments applies; while it is production, only what the rules allow in production applies. The mode changes how the app is run, never how well it is built: in both modes, everything is built to production standard.

19. **Merging into main follows the mode.** While the mode is test, finished work is always merged into main, even when it deploys. While the mode is production, finished work goes into a pull request, and it is merged into main only with the user's direct permission each time.

23. **Experiments may be written in a scratch pad; once something is designed, it goes in the code.** While you are experimenting, you may write in a scratch pad. Once you have designed something, it must be in the code, never left only in a scratch pad.

24. **Code is written well, not only made to work.** Every rewritten part keeps all of the original's behaviour, and its code is clear and easy to follow: simple names, small functions, no needless cleverness or obscure tricks, and no more layers than the job needs; and it runs as fast as possible, once every requirement of the CLAUDE.md files is met: speed never comes from a shortcut, and never at a cost so high that it is out of all proportion; any claim that it is faster is measured first.

26. **Only one version of everything: the latest.** The code keeps one version of each thing, its latest: when something is rewritten or replaced, the old version is deleted, never kept beside it, commented out, or left in a folder of old files; git keeps the history. This does not apply to the versions the app is built to offer side by side, such as the matching engines, kept side by side in the matching folder, and the host app's UIs, kept in the host app's own repository, or to the versions of data the API keeps, such as programme versions.

## Working together

20. **Several people build this app, each through their own pull requests.** Nobody changes main directly. Each person works on a branch of their own, with one piece of work per pull request, and a pull request merges only when the required checks pass and it is up to date with main. Before starting something, check the open pull requests, so that two people, or two Claude sessions, never build the same thing.

21. **Secrets pass from person to person, never through the repository.** Each person keeps the settings the app needs on their own computer only. Secrets are shared privately, and are never committed, put in a pull request or posted in a group chat.

22. **Work flows the same way for everyone.** Before starting something, open a draft pull request that says what you are working on, so everyone can see it. Bring main into your branch often, so it never falls far behind. To try a change before merging it, run the app on your own computer, where Google sign-in works.

33. **Pull and push regularly, so main on GitHub stays current for everyone.** Bring the latest main into your branch at the start of every session, before each new piece of work, and at least every two hours during long work. Push your branch to GitHub after every committed step, so that no work lives on one computer only. Merge finished work into main as soon as it is done, as the rule that merging into main follows the mode says, so that everyone builds on the latest main. Main still changes only through pull requests (the rule that several people build this app, each through their own pull requests).
