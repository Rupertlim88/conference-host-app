# Search

A guest types at least two characters into the search box and gets matching presentations, sessions, and people. Titles, abstracts, talk numbers, and names all match.

## Sub-features

- `search-title` finds a talk by words from its title.
- `search-number` finds a talk by its number, such as `J1.2`.
- `search-nothing` says "Nothing matches “…”." for a query with no matches.
- `search-short` asks for at least two characters.

## How to get to it (user POV)

- AMS: the search icon in the top bar, or **Search** in the menu.
- GSA: **Search Abstracts** in the menu.
- Both: the `/search?q=…` address.

## Driving it with look.mts

Preconditions:

- The baseline preconditions in the index hold.

- **Type a query.** Run `L ams /search typed --fill "Search titles, abstracts, numbers and names=Snow Squall" --press Enter --expect "link=J1.2 What is a Snow Squall"`.
- **Open by address.** Run `L gsa "/search?q=Multi-Objective" byurl --expect "link=Multi-Objective Optimization"`.
- **No match.** Run `L ams "/search?q=zzzqqq" nothing --expect "heading=Search"`. The `.aria.txt` contains `Nothing matches`.

## Gotchas

- AMS talk numbers repeat, so a number search returns several talks. Check for the title too.
- Quote a route that holds `?`, or the shell may expand it.
