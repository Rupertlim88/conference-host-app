# Conference API endpoints

Generated from the contract by `npm run emit --workspace=@repo/contracts`. Do not edit it by hand. For our team only: partners see the published specification.

Every endpoint needs the API key for the conference in its path. Limits are per key, and the daily quota per partner and organiser. A test fails if the backend serves any route that is not listed here, or misses one that is.

| Method | Path | Operation | Owner | Limits | Status |
|---|---|---|---|---|---|
| POST | `/v1/conferences/{conference}/talks:write` | writeTalks | conference API backend | 10 MB body, 60/min, 200/day, 2 at once, 25 s | live |
| POST | `/v1/conferences/{conference}/matches:search` | searchMatches | conference API backend | 64 KiB body, 600/min, 100,000/day, 20 at once, 10 s | live |
| POST | `/v1/conferences/{conference}/matches:fromText` | matchesFromText | conference API backend | 64 KiB body, 60/min, 500/day, 10 at once, 20 s | live |

## Connections

- **Into the API:** partners' servers call the endpoints above, each request with the API key for its conference.
- **Between the API's own parts:** the backend calls the control database's `api.*` functions and each conference database's `api.*` functions. The matching worker calls each conference database's `api.*` functions. The data layer's migrations define every one of them.
- **Out of the API:** the matching worker calls the AI model providers its engine is configured for. The backend calls nothing outside the API.
