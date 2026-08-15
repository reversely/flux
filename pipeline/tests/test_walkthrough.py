"""The walkthrough compiler and its one filter rule."""

import csv
import sqlite3

import pytest
from flux_pipeline.walkthrough import (
    filter_candidates,
    load_traits,
    write_walkthrough,
)

ROWS = [
    # species, hymenium, whichGills(+2), stipe, sporePrint, cap, eco, howEdible(+2)
    {
        "page_title": "Agaricus bisporus",
        "revid": "1",
        "hymeniumType": "gills",
        "whichGills": "free",
        "stipeCharacter": "ring",
        "sporePrintColor": "brown",
        "capShape": "convex",
        "ecologicalType": "saprotrophic",
        "howEdible": "choice",
    },
    {
        "page_title": "Amanita phalloides",
        "revid": "2",
        "hymeniumType": "gills",
        "whichGills": "free",
        "stipeCharacter": "ring and volva",
        "sporePrintColor": "white",
        "capShape": "convex",
        "capShape2": "flat",
        "ecologicalType": "mycorrhizal",
        "howEdible": "deadly",
    },
    {
        # Sparse record: only the underside is known. Must survive every
        # answer except a contradicting hymenium.
        "page_title": "Mystery bolete",
        "revid": "3",
        "hymeniumType": "pore",  # alias of pores
        "whichGills": "na",
        "stipeCharacter": "",
        "sporePrintColor": "",
        "capShape": "no",
        "ecologicalType": "",
        "howEdible": "choice",
        "howEdible2": "poisonous",  # worse value must win
    },
]


@pytest.fixture
def tsv(tmp_path):
    path = tmp_path / "mycomorphbox.tsv"
    fields = [
        "page_title",
        "revid",
        "hymeniumType",
        "whichGills",
        "whichGills2",
        "stipeCharacter",
        "sporePrintColor",
        "capShape",
        "capShape2",
        "ecologicalType",
        "howEdible",
        "howEdible2",
    ]
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fields, delimiter="\t")
        w.writeheader()
        w.writerows(ROWS)
    return path


def test_button_mushroom_path_keeps_agaricus_and_drops_amanita(tsv):
    traits, _ = load_traits(tsv)
    answers = {"hymeniumType": "gills", "whichGills": "free", "stipeCharacter": "ring"}
    assert filter_candidates(traits, answers) == ["Agaricus bisporus"]


def test_unknown_never_eliminates(tsv):
    traits, _ = load_traits(tsv)
    survivors = filter_candidates(
        traits, {"stipeCharacter": "ring", "sporePrintColor": "brown"}
    )
    assert "Mystery bolete" in survivors
    assert filter_candidates(traits, {"hymeniumType": "gills"}) == [
        "Agaricus bisporus",
        "Amanita phalloides",
    ]


def test_worse_edibility_wins_and_aliases_normalize(tsv):
    _, meta = load_traits(tsv)
    tier, raw = meta["Mystery bolete"][0], meta["Mystery bolete"][1]
    assert tier == "danger"
    assert raw == "choice|poisonous"
    traits, _ = load_traits(tsv)
    assert traits["Mystery bolete"]["hymeniumType"] == ["pores"]
    assert "capShape" not in traits["Mystery bolete"]


def test_written_tables_round_trip(tsv, tmp_path):
    db = tmp_path / "content.db"
    summary = write_walkthrough(tsv, db)
    assert "3 species (2 danger tier)" in summary
    with sqlite3.connect(db) as conn:
        questions = conn.execute(
            "SELECT character FROM walk_question ORDER BY ask_order"
        ).fetchall()
        assert [q[0] for q in questions][:2] == [("hymeniumType"), ("whichGills")]
        assert conn.execute(
            "SELECT edibility FROM walk_species WHERE species='Amanita phalloides'"
        ).fetchone() == ("danger",)
        assert conn.execute(
            "SELECT COUNT(*) FROM walk_trait WHERE species='Amanita phalloides'"
        ).fetchone() == (7,)
        states = conn.execute(
            "SELECT state FROM walk_state WHERE character='hymeniumType' ORDER BY state"
        ).fetchall()
        assert ("pores",) in states


def test_rebuild_replaces_tables(tsv, tmp_path):
    db = tmp_path / "content.db"
    write_walkthrough(tsv, db)
    write_walkthrough(tsv, db)
    with sqlite3.connect(db) as conn:
        assert conn.execute("SELECT COUNT(*) FROM walk_species").fetchone() == (3,)
