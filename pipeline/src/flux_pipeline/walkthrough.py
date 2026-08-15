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

SCHEMA = """
DROP TABLE IF EXISTS walk_trait;
DROP TABLE IF EXISTS walk_state;
DROP TABLE IF EXISTS walk_species;
DROP TABLE IF EXISTS walk_question;
CREATE TABLE walk_question (
    character TEXT PRIMARY KEY,
    ask_order INTEGER NOT NULL UNIQUE,
    question  TEXT NOT NULL,
    citation  TEXT NOT NULL
);
CREATE TABLE walk_state (
    character TEXT NOT NULL REFERENCES walk_question(character),
    state     TEXT NOT NULL,
    PRIMARY KEY (character, state)
);
CREATE TABLE walk_species (
    species       TEXT PRIMARY KEY,
    edibility     TEXT NOT NULL CHECK (edibility IN
                      ('edible', 'inedible', 'caution', 'danger', 'unknown')),
    edibility_raw TEXT NOT NULL,
    source_title  TEXT NOT NULL,
    source_revid  TEXT NOT NULL
);
CREATE TABLE walk_trait (
    species   TEXT NOT NULL REFERENCES walk_species(species),
    character TEXT NOT NULL REFERENCES walk_question(character),
    state     TEXT NOT NULL,
    PRIMARY KEY (species, character, state)
);
"""


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
        conn.executescript(SCHEMA)
        for order, (character, question) in enumerate(QUESTIONS, start=1):
            conn.execute(
                "INSERT INTO walk_question VALUES (?, ?, ?, ?)",
                (character, order, question, QUESTION_CITATION.format(character)),
            )
            for state in sorted(states_seen[character]):
                conn.execute("INSERT INTO walk_state VALUES (?, ?)", (character, state))
        for species, (tier, raw, title, revid) in meta.items():
            conn.execute(
                "INSERT INTO walk_species VALUES (?, ?, ?, ?, ?)",
                (species, tier, raw, title, revid),
            )
        for species, chars in traits.items():
            for character, states in chars.items():
                for state in states:
                    conn.execute(
                        "INSERT INTO walk_trait VALUES (?, ?, ?)",
                        (species, character, state),
                    )
    n_danger = sum(1 for tier, *_ in meta.values() if tier == "danger")
    return (
        f"walkthrough: {len(meta)} species ({n_danger} danger tier), "
        f"{sum(len(c) for c in traits.values())} trait rows, "
        f"{len(QUESTIONS)} questions -> {db_path}"
    )
