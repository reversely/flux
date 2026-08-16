"""Compile the mycomorphbox trait table into the pack's walkthrough tables.

The walkthrough (#85) asks one observable-feature question per step and
narrows a candidate set by filtering, so the pack stores the questions, the
answer states observed in the data, and one trait row per species-character
state. The server walks these tables with `filter_candidates` semantics: a
species survives an answer when it either matches the answered state or
records nothing for that character. Recording nothing keeps a species in
every branch, so missing data can never eliminate a dangerous species; only
a positively contradicting confirmed answer can.
"""

from __future__ import annotations

import csv
import sqlite3
from collections import defaultdict
from pathlib import Path

# Ask order runs from the coarsest character to the finest, the order the
# guides themselves examine a specimen: underside first, stem, print, shape.
QUESTIONS = [
    ("hymeniumType", "Under the cap: gills, pores, ridges, teeth, or smooth?"),
    (
        "whichGills",
        "Gills at the stem: free, attached (adnate), or running down (decurrent)?",
    ),
    (
        "stipeCharacter",
        "On the stem: a ring, a sack at the base (volva), both, cobwebby veil (cortina), or bare?",
    ),
    ("sporePrintColor", "Spore print color?"),
    ("capShape", "Cap shape?"),
    (
        "ecologicalType",
        "Growing on wood or dung (saprotrophic), from soil near trees (mycorrhizal), or on a living host (parasitic)?",
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


def canonical_states(row: dict, character: str) -> list[str]:
    states = []
    for key in (character, character + "2"):
        value = (row.get(key) or "").strip().lower()
        value = STATE_ALIASES.get(value, value)
        if value not in UNKNOWN_VALUES and value not in states:
            states.append(value)
    return states


def edibility_tier(row: dict) -> tuple[str, str]:
    """The worse of the two edibility values wins, so a 'choice, but deadly
    lookalike-prone' pairing can never read as plain edible."""
    severity = ["danger", "caution", "inedible", "edible", "unknown"]
    raws = canonical_states(row, "howEdible")
    tiers = [EDIBILITY_TIERS.get(r, "unknown") for r in raws]
    tier = min(tiers, key=severity.index) if tiers else "unknown"
    return tier, "|".join(raws)


def load_traits(tsv: Path) -> tuple[dict[str, dict[str, list[str]]], dict[str, tuple]]:
    """Returns (traits[species][character] -> states, meta[species])."""
    traits: dict[str, dict[str, list[str]]] = {}
    meta: dict[str, tuple] = {}
    with tsv.open(newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            species = row["page_title"]
            traits[species] = {
                character: states
                for character, _ in QUESTIONS
                if (states := canonical_states(row, character))
            }
            tier, raw = edibility_tier(row)
            meta[species] = (tier, raw, row["page_title"], row["revid"])
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


def write_walkthrough(tsv: Path, db_path: Path) -> str:
    traits, meta = load_traits(tsv)
    states_seen = defaultdict(set)
    for chars in traits.values():
        for character, states in chars.items():
            states_seen[character].update(states)

    with sqlite3.connect(db_path) as conn:
        _ensure_schema(conn)
        _replace_guide(
            conn,
            FUNGI_GUIDE_ID,
            "identification",
            "Fungi edibility",
            6,
            "Wikipedia Template:Mycomorphbox (CC BY-SA)",
        )
        for order, (character, question) in enumerate(QUESTIONS, start=1):
            conn.execute(
                "INSERT INTO walk_question"
                " (guide_id, character, ask_order, question, citation)"
                " VALUES (?, ?, ?, ?, ?)",
                (
                    FUNGI_GUIDE_ID,
                    character,
                    order,
                    question,
                    QUESTION_CITATION.format(character),
                ),
            )
            for state in sorted(states_seen[character]):
                conn.execute(
                    "INSERT INTO walk_state (guide_id, character, state)"
                    " VALUES (?, ?, ?)",
                    (FUNGI_GUIDE_ID, character, state),
                )
        for species, (tier, raw, title, revid) in meta.items():
            conn.execute(
                "INSERT INTO walk_species"
                " (guide_id, species, edibility, edibility_raw,"
                "  source_title, source_revid)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (FUNGI_GUIDE_ID, species, tier, raw, title, revid),
            )
        for species, chars in traits.items():
            for character, states in chars.items():
                for state in states:
                    conn.execute(
                        "INSERT INTO walk_trait (guide_id, species, character, state)"
                        " VALUES (?, ?, ?, ?)",
                        (FUNGI_GUIDE_ID, species, character, state),
                    )
    n_danger = sum(1 for tier, *_ in meta.values() if tier == "danger")
    return (
        f"walkthrough: {len(meta)} species ({n_danger} danger tier), "
        f"{sum(len(c) for c in traits.values())} trait rows, "
        f"{len(QUESTIONS)} questions -> {db_path}"
    )
