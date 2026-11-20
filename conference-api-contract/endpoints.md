# Conference API endpoints

Generated from the contract by `npm run emit --workspace=@repo/contracts`. Do not edit it by hand. For our team only: partners see the published specification.

Limits are per partner, or per network address for public endpoints. A test fails if the backend serves any route that is not listed here, or misses one that is.

| Method | Path | Operation | Audience | Permission | Partner kinds | Signed | Owner | Limits | Status |
|---|---|---|---|---|---|---|---|---|---|
| POST | `/v1/conferences/{conference}/talks:write` | writeTalks | partner | talks:write | organiser, provider | no | conference API backend | 10 MB body, 60/min, 10,000/day, 2 at once, 25 s | live |
| POST | `/v1/conferences/{conference}/matches:search` | searchMatches | partner | matches:read | organiser, provider | no | conference API backend | 64 KiB body, 600/min, 200,000/day, 20 at once, 10 s | live |
| POST | `/v1/conferences/{conference}/matches:fromText` | matchesFromText | partner | matches:read | organiser, provider | no | conference API backend | 64 KiB body, 60/min, 20,000/day, 10 at once, 20 s | live |
| GET | `/v1/conferences/{conference}/matchSettings` | getMatchSettings | partner | matches:read | organiser, provider | no | conference API backend | 60/min, 10,000/day, 2 at once, 10 s | live |
| PUT | `/v1/conferences/{conference}/matchSettings` | setMatchSettings | partner | settings:write | organiser | no | conference API backend | 1 KiB body, 30/min, 1,000/day, 1 at once, 10 s | live |
| POST | `/v1/conferences/{conference}/attendance:report` | reportAttendance | partner | attendance:write | organiser, provider | yes | conference API backend | 2 MiB body, 30/min, 1,000/day, 1 at once, 25 s | live |
| POST | `/v1/conferences/{conference}/people/{person}:erase` | erasePerson | partner | people:erase | organiser | no | conference API backend | 1 KiB body, 60/min, 5,000/day, 2 at once, 10 s | live |
| POST | `/v1/conferences/{conference}/credentials:issue` | issueCredential | partner | credentials:issue | organiser, provider | no | conference API backend | 1 KiB body, 300/min, 50,000/day, 4 at once, 10 s | live |
| POST | `/v1/conferences/{conference}/credentials/{credential}:withdraw` | withdrawCredential | partner | credentials:issue | organiser, provider | no | conference API backend | 1 KiB body, 60/min, 5,000/day, 2 at once, 10 s | live |
| POST | `/v1/oauth/token` | issueToken | public | none | anyone | no | conference API backend | 16 KiB body, 30/min, 5,000/day, 4 at once, 10 s | live |
| POST | `/v1/oauth/revoke` | revokeToken | public | none | anyone | no | conference API backend | 4 KiB body, 30/min, 5,000/day, 4 at once, 10 s | live |
| GET | `/.well-known/jwks.json` | getIssuerKeys | public | none | anyone | no | conference API backend | 600/min, 100,000/day, 8 at once, 5 s | live |
| GET | `/v1/credentials/status/{conference}` | getStatusList | public | none | anyone | no | conference API backend | 600/min, 100,000/day, 8 at once, 10 s | live |
| POST | `/v1/credentials:verify` | verifyCredential | public | none | anyone | no | conference API backend | 32 KiB body, 30/min, 2,000/day, 2 at once, 10 s | live |
| GET | `/verify` | verifyPage | public | none | anyone | no | conference API backend | 120/min, 10,000/day, 4 at once, 5 s | live |
| GET | `/v1/agreements` | listAgreements | partner | agreements:read | organiser, provider | no | conference API backend | 60/min, 5,000/day, 2 at once, 10 s | live |
| POST | `/v1/agreements` | createAgreement | partner | agreements:write | organiser | no | conference API backend | 16 KiB body, 30/min, 1,000/day, 2 at once, 10 s | live |
| PUT | `/v1/agreements/{agreement}` | changeAgreement | partner | agreements:write | organiser | no | conference API backend | 16 KiB body, 30/min, 1,000/day, 2 at once, 10 s | live |
| POST | `/v1/agreements/{agreement}:withdraw` | withdrawAgreement | partner | agreements:write | organiser | no | conference API backend | 1 KiB body, 30/min, 1,000/day, 2 at once, 10 s | live |

## Connections

- **Into the API:** partners' servers call the partner endpoints above. Anyone may call the public ones.
- **Between the API's own parts:** the backend calls the control database's `api.*` functions and each conference database's `api.*` functions. The matching worker calls each conference database's `api.*` functions. The data layer's migrations define every one of them.
- **Out of the API:** the matching worker calls the AI model providers its engine is configured for. The backend calls nothing outside the API.
