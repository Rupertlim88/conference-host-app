"""The Python side of the public contract: the same fixtures, checked against the
generated OpenAPI specification. Rules that link fields (presenters among authors,
end after start, ORCID check digits, ...) are checked only by the zod source; every
rule JSON Schema can express must hold here too."""
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
SPEC = json.loads((ROOT / "openapi" / "conference-api.v1.json").read_text())
SCHEMAS = SPEC["components"]["schemas"]
FIXTURES = ROOT / "fixtures" / "public"

SCHEMA_OF = {
    "talks_write_request": "TalksWriteRequest",
    "talks_write_response": "TalksWriteResponse",
    "problem": "Problem",
    "matches_search_request": "MatchesSearchRequest",
    "matches_search_response": "MatchesSearchResponse",
    "matches_from_text_request": "MatchesFromTextRequest",
    "matches_from_text_response": "MatchesFromTextResponse",
}

# Invalid fixtures whose rule JSON Schema can express; the rest are zod-only rules.
EXPRESSIBLE = {
    "talks_write_request-abstract-too-long.json",
    "talks_write_request-blank-title.json",
    "talks_write_request-unknown-key.json",
    "talks_write_request-no-talks.json",
    "talks_write_request-complete-without-sync.json",
    "talks_write_response-negative-count.json",
    "problem-status-out-of-range.json",
    "matches_search_request-page-size-zero.json",
    "matches_search_response-score-above-one.json",
    "matches_search_response-description-too-long.json",
    "matches_search_request-include-unknown.json",
    "matches_from_text_request-blank-text.json",
    "matches_search_request-pool-twice.json",
}

def validator(kind: str) -> Draft202012Validator:
    root = {**SPEC, "$ref": f"#/components/schemas/{SCHEMA_OF[kind]}"}
    return Draft202012Validator(root)


def kind_of(path: Path) -> str:
    return path.stem.split("-")[0]


@pytest.mark.parametrize("path", sorted((FIXTURES / "valid").glob("*.json")), ids=lambda p: p.name)
def test_valid_fixtures_pass(path: Path):
    errors = list(validator(kind_of(path)).iter_errors(json.loads(path.read_text())))
    assert errors == []


@pytest.mark.parametrize("name", sorted(EXPRESSIBLE))
def test_invalid_fixtures_fail(name: str):
    path = FIXTURES / "invalid" / name
    assert list(validator(kind_of(path)).iter_errors(json.loads(path.read_text()))) != []


def test_every_expressible_invalid_fixture_exists():
    assert EXPRESSIBLE <= {p.name for p in (FIXTURES / "invalid").glob("*.json")}


def test_plain_text_is_read_the_same_way_as_on_the_typescript_side():
    """Python reads the pattern with its own idea of white space; both sides must refuse and accept the same text."""
    check = validator("talks_write_request")
    request = lambda title: {"talks": [{"id": "T1", "title": title, "abstract": "Fine."}]}
    for refused in ["A\x1fB", "Next\x85line", "﻿Marked", "Bell\x07", "   ", "\xa0"]:
        assert not check.is_valid(request(refused)), repr(refused)
    for kept in ["Line one\nline two\twith a tab", "Café — a title"]:
        assert check.is_valid(request(kept)), repr(kept)
