# Our versions — rules

## What the CLAUDE.md files are
The CLAUDE.md files are the user's specification of the host app: the user's intent, written in plain natural language, by the user or by Claude from what the user has said. They are the highest level of rules: the most fundamental requirements, which must be followed no matter what. The global CLAUDE.md at the repo root holds the rules the whole app follows. Each component (backend, data layer, UIs, matching engines) has its own CLAUDE.md with the user's specification for that component, and so does each UI and each matching engine. Every CLAUDE.md that covers a folder applies to it, together with the global one.

These specifications give general direction, not technical detail: how the app should be structured, what it is for, and the goals each part must meet. They are not a technical specification. Turning them into concrete technical choices is Claude's job, at the lower level.

Everything else is a lower level, written by Claude to carry out these specifications: code, schemas and contracts, tests, configuration, plans and technical docs. When anything at a lower level conflicts with a CLAUDE.md, the CLAUDE.md wins: change the lower level to match it, never the other way round.

## The rule on who writes the rules (from the host app's CLAUDE.md)

1. **Claude writes and changes the rules, always from the user's intent.** Claude may add, change or remove a rule in any of the host app's CLAUDE.md files to carry out what the user wants, without being asked to change that rule. A rule Claude writes says only what the user wants, as faithfully as Claude can tell, and keeps the user's own words wherever the user has given them. What the user says always wins: the user can change or overrule any rule at any time. Every change is reported in the chat (the rule to report every CLAUDE.md change in the chat). The CLAUDE.md files hold only rules: never status, progress, notes or the names of current implementations, apart from the one file and the how that each rule in a lowest-level CLAUDE.md names.

## The user's specification of switching between the base and our versions

### The versions

2. **The demo's versions are the base AMS meeting app and Our improvements, and each version names the places it changes.**
   The base changes nothing. Each other version lists its changes by change point; a change replaces what the base shows
   there, or adds to it. A version is added, changed or removed here alone, without touching the base or another version.
   *How:* code alone: one list of versions, each a map from change point to its change.
   *File:* needed

### Showing and switching

3. **A change point shows the base, or the chosen version's change outlined in gold.** The chosen version is read on
   the server from the guest's choice, so a page never shows the base first. A change is outlined in gold, with a short
   label saying what was changed; where the version changes nothing, the base shows as it is.
   *How:* code alone: a server component reading the guest's cookie.
   *File:* needed

4. **A button on the screen, and pressing Control on its own, switch between the base and our versions.** The bar
   names the version shown; the button goes to the next one. Pressing and releasing Control with no other key does the
   same. The choice is kept on the guest's device for a year, and the page reloads its data. The same bar, which is the
   demo's own and not AMS's, links the organiser console and the developer console.
   *How:* code alone: a client component that writes the choice to a cookie and refreshes the page.
   *File:* needed
