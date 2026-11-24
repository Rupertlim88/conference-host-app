# @repo/contracts

The conference API's contract, written once in zod. Every other form of it is generated from that source:

- `schema/*.json` and `schema/internal/*.json`: JSON Schema (draft 2020-12), which the Python matching side reads.
- `openapi/conference-api.v1.json`: the published specification partners read.
- `endpoints.md`: every endpoint, for our team.

Never edit a generated file by hand. After changing anything in `src/`, run:

```bash
npm run emit --workspace=@repo/contracts
```

The tests fail if a generated file no longer matches what the source emits.

## What is where

- `src/public/`: what partners send and get back, operation by operation (`openapi.ts` holds every operation's
  path and limits, which the backend enforces).
- `src/internal/`: what the API's own parts pass to each other (backend, data layer, matching worker).
- `src/talk.ts`, `src/recommendation.ts`, `src/run.ts`, `src/api.ts`: the engine rows and the older picks and
  agenda shapes.
- `fixtures/`: valid and invalid examples. Each invalid one differs from its valid twin in one stated way, and the
  tests check that it fails for exactly that reason.
- `pytests/`: the same fixtures checked from Python against the generated specification.

## From Python

```python
import json
from jsonschema import Draft202012Validator

schema = json.load(open("schema/talk.schema.json"))
Draft202012Validator(schema).validate(row)
```

Python's `re` lets `$` match before a trailing newline, so a datetime with a trailing `\n` can pass a Python-side
pattern check even though zod's `z.iso.datetime()` refuses it.
