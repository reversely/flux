"""Compile an identification trait table into the pack's walkthrough tables.

The walkthrough (#85) asks one observable-feature question per step and
narrows a candidate set by filtering, so the pack stores the questions, the
answer states observed in the data, and one trait row per species-character
state. The server walks these tables with `filter_candidates` semantics: a
species survives an answer when it either matches the answered state or
records nothing for that character. Recording nothing keeps a species in
every branch, so missing data can never eliminate a dangerous species; only
a positively contradicting confirmed answer can.

The compiler is spec-driven: a WalkSpec names the guide, its questions, and
the trait-TSV columns. With no spec it compiles the fungi walk from the
mycomorphbox TSV exactly as before, so pre-spec callers reproduce the same
pack rows.
"""

from __future__ import annotations

import csv
import json
import sqlite3
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

# Ask order runs from the coarsest character to the finest, the order the
# guides themselves examine a specimen: underside first, stem, print, shape.
# (character, question, answer_source, capture_condition). Visual characters
# accept a camera suggestion (#130); spore print and ecology stay user-only,
# because neither shows in a handheld clip.
QUESTIONS = [
    (
        "hymeniumType",
        "Under the cap: gills, pores, ridges, teeth, or smooth?",
        "both",
        "the cap underside faces the camera",
    ),
    (
        "whichGills",
        "Gills at the stem: free, attached (adnate), or running down (decurrent)?",
        "both",
        "the gill-to-stem junction is visible up close",
    ),
    (
        "stipeCharacter",
        "On the stem: a ring, a sack at the base (volva), both, cobwebby veil (cortina), or bare?",
        "both",
        "the full stem from cap to base is in frame",
    ),
    ("sporePrintColor", "Spore print color?", "user", None),
    (
        "capShape",
        "Cap shape?",
        "both",
        "the cap is seen from the side",
    ),
    (
        "ecologicalType",
        "Growing on wood or dung (saprotrophic), from soil near trees (mycorrhizal), or on a living host (parasitic)?",
        "user",
        None,
    ),
]
QUESTION_CITATION = "Wikipedia Template:Mycomorphbox parameter '{}' (CC BY-SA)"

# Raw template values that mean "no value recorded".
UNKNOWN_VALUES = {"", "na", "n/a", "no", "unknown", "67"}
STATE_ALIASES = {"pore": "pores", "notched": "sinuate", "subdecurrent": "decurrent"}

EDIBILITY_TIERS = {
    "deadly": "danger",
    "poisonous": "danger",
    "allergenic": "danger",
    "caution": "caution",
    "psychoactive": "caution",
    "edible": "edible",
    "choice": "edible",
    "inedible": "inedible",
    "unpalatable": "inedible",
    "not recommended": "inedible",
    "too hard to eat": "inedible",
    "unknown": "unknown",
}

# The mushroom walk's stable guide id; existing consumers that never name a
# guide keep reading exactly these rows (#65 non-breaking rule).
FUNGI_GUIDE_ID = "fungi-edibility"


@dataclass(frozen=True)
class WalkQuestionSpec:
    character: str
    question: str
    answer_source: str
    capture_condition: str | None
    citation: str
    # The question's full state vocabulary. Observed states union in, so a
    # sparse trait table cannot compile a one-option question; a declared
    # state no species records eliminates nobody under the filter rule.
    states: tuple[str, ...] = ()


@dataclass(frozen=True)
class WalkSpec:
    """Everything guide-specific about compiling one identification walk."""

    guide_id: str
    title: str
    tile_id: int | None
    source: str
    questions: list[WalkQuestionSpec]
    tiers: dict[str, str]
    key_column: str = "page_title"
    revid_column: str = "revid"
    verdict_column: str = "howEdible"
    # The per-species source citation; None means the key column doubles as
    # the source title, the way a mycomorphbox page title does.
    source_title_column: str | None = None
    common_name_column: str | None = None
    state_aliases: dict[str, str] = field(default_factory=lambda: dict(STATE_ALIASES))
    unknown_values: frozenset[str] = frozenset(UNKNOWN_VALUES)


def fungi_spec() -> WalkSpec:
    return WalkSpec(
        guide_id=FUNGI_GUIDE_ID,
        title="Fungi edibility",
        tile_id=6,
        source="Wikipedia Template:Mycomorphbox (CC BY-SA)",
        questions=[
            WalkQuestionSpec(c, q, s, cond, QUESTION_CITATION.format(c))
            for c, q, s, cond in QUESTIONS
        ],
        tiers=EDIBILITY_TIERS,
    )


def load_spec(path: Path) -> WalkSpec:
    raw = json.loads(path.read_text())
    return WalkSpec(
        guide_id=raw["guide_id"],
        title=raw["title"],
        tile_id=raw.get("tile_id"),
        source=raw["source"],
        questions=[
            WalkQuestionSpec(
                q["character"],
                q["question"],
                q.get("answer_source", "user"),
                q.get("capture_condition"),
                q["citation"],
                tuple(q.get("states", ())),
            )
            for q in raw["questions"]
        ],
        tiers=raw["tiers"],
        key_column=raw.get("key_column", "page_title"),
        revid_column=raw.get("revid_column", "revid"),
        verdict_column=raw.get("verdict_column", "howEdible"),
        source_title_column=raw.get("source_title_column"),
        common_name_column=raw.get("common_name_column"),
        state_aliases=raw.get("state_aliases", {}),
        unknown_values=frozenset(raw.get("unknown_values", sorted(UNKNOWN_VALUES))),
    )


SCHEMA = """
CREATE TABLE IF NOT EXISTS guide (
    id      TEXT PRIMARY KEY,
    kind    TEXT NOT NULL CHECK (kind IN ('identification', 'process')),
    title   TEXT NOT NULL,
    tile_id INTEGER,
    source  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS walk_question (
    guide_id          TEXT NOT NULL DEFAULT 'fungi-edibility' REFERENCES guide(id),
    character         TEXT NOT NULL,
    ask_order         INTEGER NOT NULL,
    question          TEXT NOT NULL,
    citation          TEXT NOT NULL,
    screen            TEXT,
    voice             TEXT,
    block_id          TEXT,
    figure_id         TEXT,
    anchor            TEXT,
    answer_source     TEXT NOT NULL DEFAULT 'user'
                      CHECK (answer_source IN ('user', 'camera', 'both')),
    capture_condition TEXT,
    evidence_kind     TEXT CHECK (evidence_kind IN ('frame', 'clip')),
    reference_image   TEXT,
    PRIMARY KEY (guide_id, character),
    UNIQUE (guide_id, ask_order)
);
CREATE TABLE IF NOT EXISTS walk_state (
    guide_id    TEXT NOT NULL DEFAULT 'fungi-edibility',
    character   TEXT NOT NULL,
    state       TEXT NOT NULL,
    implication TEXT,
    PRIMARY KEY (guide_id, character, state)
);
CREATE TABLE IF NOT EXISTS walk_species (
    guide_id      TEXT NOT NULL DEFAULT 'fungi-edibility',
    species       TEXT NOT NULL,
    edibility     TEXT NOT NULL CHECK (edibility IN
                      ('edible', 'inedible', 'caution', 'danger', 'unknown')),
    edibility_raw TEXT NOT NULL,
    source_title  TEXT NOT NULL,
    source_revid  TEXT NOT NULL,
    implication   TEXT,
    common_name   TEXT,
    PRIMARY KEY (guide_id, species)
);
CREATE TABLE IF NOT EXISTS walk_trait (
    guide_id  TEXT NOT NULL DEFAULT 'fungi-edibility',
    species   TEXT NOT NULL,
    character TEXT NOT NULL,
    state     TEXT NOT NULL,
    PRIMARY KEY (guide_id, species, character, state)
);
"""

# A pre-#65 pack has walk_ tables without guide_id; a rebuild into one starts
# clean so the new schema applies. Only the walk tables reset, never content.
LEGACY_RESET = """
DROP TABLE IF EXISTS walk_trait;
DROP TABLE IF EXISTS walk_species;
DROP TABLE IF EXISTS walk_state;
DROP TABLE IF EXISTS walk_question;
"""


def _ensure_schema(conn: sqlite3.Connection) -> None:
    columns = {
        row[1] for row in conn.execute("PRAGMA table_info(walk_question)").fetchall()
    }
    if columns and "guide_id" not in columns:
        conn.executescript(LEGACY_RESET)
    conn.executescript(SCHEMA)
    species_cols = {
        row[1] for row in conn.execute("PRAGMA table_info(walk_species)").fetchall()
    }
    if "common_name" not in species_cols:
        conn.execute("ALTER TABLE walk_species ADD COLUMN common_name TEXT")


def _replace_guide(
    conn: sqlite3.Connection,
    guide_id: str,
    kind: str,
    title: str,
    tile_id: int | None,
    source: str,
) -> None:
    """Idempotent per-guide rebuild: this guide's rows go, others stay."""
    for table in ("walk_trait", "walk_species", "walk_state", "walk_question"):
        conn.execute(f"DELETE FROM {table} WHERE guide_id = ?", (guide_id,))
    conn.execute("DELETE FROM guide WHERE id = ?", (guide_id,))
    conn.execute(
        "INSERT INTO guide (id, kind, title, tile_id, source) VALUES (?, ?, ?, ?, ?)",
        (guide_id, kind, title, tile_id, source),
    )


def canonical_states(
    row: dict, character: str, spec: WalkSpec | None = None
) -> list[str]:
    spec = spec or fungi_spec()
    states = []
    for key in (character, character + "2"):
        value = (row.get(key) or "").strip().lower()
        value = spec.state_aliases.get(value, value)
        if value not in spec.unknown_values and value not in states:
            states.append(value)
    return states


def edibility_tier(row: dict, spec: WalkSpec | None = None) -> tuple[str, str]:
    """The worse of the two edibility values wins, so a 'choice, but deadly
    lookalike-prone' pairing can never read as plain edible."""
    spec = spec or fungi_spec()
    severity = ["danger", "caution", "inedible", "edible", "unknown"]
    raws = canonical_states(row, spec.verdict_column, spec)
    tiers = [spec.tiers.get(r, "unknown") for r in raws]
    tier = min(tiers, key=severity.index) if tiers else "unknown"
    return tier, "|".join(raws)


def load_traits(
    tsv: Path, spec: WalkSpec | None = None
) -> tuple[dict[str, dict[str, list[str]]], dict[str, tuple]]:
    """Returns (traits[species][character] -> states, meta[species])."""
    spec = spec or fungi_spec()
    traits: dict[str, dict[str, list[str]]] = {}
    meta: dict[str, tuple] = {}
    with tsv.open(newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            species = row[spec.key_column]
            traits[species] = {
                q.character: states
                for q in spec.questions
                if (states := canonical_states(row, q.character, spec))
            }
            tier, raw = edibility_tier(row, spec)
            common = (
                row.get(spec.common_name_column) if spec.common_name_column else None
            )
            # A row whose trailing cells are empty may arrive short (an
            # editor or hook can strip trailing tabs), so absent reads as "".
            title = (
                row.get(spec.source_title_column)
                if spec.source_title_column
                else row.get(spec.key_column)
            )
            meta[species] = (
                tier,
                raw,
                title or "",
                row.get(spec.revid_column) or "",
                (common or "").strip() or None,
            )
    return traits, meta


def filter_candidates(
    traits: dict[str, dict[str, list[str]]], answers: dict[str, str]
) -> list[str]:
    """The walk's one rule: an answer eliminates a species only when the
    species records that character and none of its states match."""
    return [
        species
        for species, chars in traits.items()
        if all(
            character not in chars or state in chars[character]
            for character, state in answers.items()
        )
    ]


def write_walkthrough(tsv: Path, db_path: Path, spec: WalkSpec | None = None) -> str:
    spec = spec or fungi_spec()
    traits, meta = load_traits(tsv, spec)
    states_seen = defaultdict(set)
    for chars in traits.values():
        for character, states in chars.items():
            states_seen[character].update(states)

    with sqlite3.connect(db_path) as conn:
        _ensure_schema(conn)
        _replace_guide(
            conn,
            spec.guide_id,
            "identification",
            spec.title,
            spec.tile_id,
            spec.source,
        )
        for order, q in enumerate(spec.questions, start=1):
            conn.execute(
                "INSERT INTO walk_question"
                " (guide_id, character, ask_order, question, citation,"
                "  answer_source, capture_condition, evidence_kind)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    spec.guide_id,
                    q.character,
                    order,
                    q.question,
                    q.citation,
                    q.answer_source,
                    q.capture_condition,
                    "clip" if q.answer_source != "user" else None,
                ),
            )
            for state in sorted(states_seen[q.character] | set(q.states)):
                conn.execute(
                    "INSERT INTO walk_state (guide_id, character, state)"
                    " VALUES (?, ?, ?)",
                    (spec.guide_id, q.character, state),
                )
        for species, (tier, raw, title, revid, common) in meta.items():
            conn.execute(
                "INSERT INTO walk_species"
                " (guide_id, species, edibility, edibility_raw,"
                "  source_title, source_revid, common_name)"
                " VALUES (?, ?, ?, ?, ?, ?, ?)",
                (spec.guide_id, species, tier, raw, title, revid, common),
            )
        for species, chars in traits.items():
            for character, states in chars.items():
                for state in states:
                    conn.execute(
                        "INSERT INTO walk_trait (guide_id, species, character, state)"
                        " VALUES (?, ?, ?, ?)",
                        (spec.guide_id, species, character, state),
                    )
    n_danger = sum(1 for tier, *_ in meta.values() if tier == "danger")
    return (
        f"walkthrough[{spec.guide_id}]: {len(meta)} species ({n_danger} danger tier), "
        f"{sum(len(c) for c in traits.values())} trait rows, "
        f"{len(spec.questions)} questions -> {db_path}"
    )
