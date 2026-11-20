"""Check rows against the conference API's contract schemas (conference-api-contract/schema). The zod source in
conference-api-contract/src is the truth; the JSON files are generated from it and its own tests keep them in sync."""
import json
from functools import lru_cache
from pathlib import Path

from jsonschema import Draft202012Validator

SCHEMA_DIR = Path(__file__).resolve().parents[3] / "conference-api-contract" / "schema"


class ContractError(ValueError):
    """A row does not conform to its contract."""


@lru_cache(maxsize=None)
def _validator(kind: str) -> Draft202012Validator:
    return Draft202012Validator(json.loads((SCHEMA_DIR / f"{kind}.schema.json").read_text()))


def validate(kind: str, row: dict) -> None:
    errors = sorted(_validator(kind).iter_errors(row), key=lambda e: list(e.path))
    if errors:
        where = "/".join(str(p) for p in errors[0].path) or "<root>"
        raise ContractError(f"{kind} row invalid at {where}: breaks the {errors[0].validator!r} rule")
