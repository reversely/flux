"""Walkthrough routes: deterministic traversal, the filter rule, the pilot.

The fixture rebuilds the contract's walk_ schema on purpose instead of
importing pipeline code, like test_content.py does for the content tables.
"""

import sqlite3

import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.walkthrough import WalkthroughStore

QUESTIONS = [
    ("hymeniumType", 1, "Under the cap: gills, pores, ridges, teeth, or smooth?"),
    ("whichGills", 2, "Gills at the stem?"),
    ("stipeCharacter", 3, "On the stem?"),
    ("sporePrintColor", 4, "Spore print color?"),
]
SPECIES = {
    # species: (edibility, traits)
    "Agaricus bisporus": (
        "edible",
        {
            "hymeniumType": ["gills"],
            "whichGills": ["free"],
            "stipeCharacter": ["ring"],
            "sporePrintColor": ["brown"],
        },
    ),
    "Agaricus xanthodermus": (
        "danger",
        {
            "hymeniumType": ["gills"],
            "whichGills": ["free"],
            "stipeCharacter": ["ring"],
            "sporePrintColor": ["brown"],
        },
    ),
    "Amanita phalloides": (
        "danger",
        {
            "hymeniumType": ["gills"],
            "whichGills": ["free"],
            "stipeCharacter": ["ring and volva"],
            "sporePrintColor": ["white"],
        },
    ),
    "Cantharellus formosus": (
        "edible",
        {
            "hymeniumType": ["ridges"],
            "whichGills": ["decurrent"],
            "sporePrintColor": ["yellow", "white"],
        },
    ),
    "Sparse deadly": ("danger", {"hymeniumType": ["gills"]}),
}


@pytest.fixture
def client(tmp_path):
    db = tmp_path / "content.db"
    with sqlite3.connect(db) as conn:
        conn.executescript(
            """
            CREATE TABLE walk_question (
                character TEXT PRIMARY KEY, ask_order INTEGER NOT NULL UNIQUE,
                question TEXT NOT NULL, citation TEXT NOT NULL);
            CREATE TABLE walk_state (
                character TEXT NOT NULL, state TEXT NOT NULL,
                PRIMARY KEY (character, state));
            CREATE TABLE walk_species (
                species TEXT PRIMARY KEY, edibility TEXT NOT NULL,
                edibility_raw TEXT NOT NULL, source_title TEXT NOT NULL,
                source_revid TEXT NOT NULL);
            CREATE TABLE walk_trait (
                species TEXT NOT NULL, character TEXT NOT NULL,
                state TEXT NOT NULL, PRIMARY KEY (species, character, state));
            """
        )
        states = set()
        for character, order, question in QUESTIONS:
            conn.execute(
                "INSERT INTO walk_question VALUES (?, ?, ?, ?)",
                (character, order, question, "test citation"),
            )
        for species, (edibility, traits) in SPECIES.items():
            conn.execute(
                "INSERT INTO walk_species VALUES (?, ?, ?, ?, ?)",
                (species, edibility, edibility, species, "1"),
            )
            for character, values in traits.items():
                for value in values:
                    conn.execute(
                        "INSERT INTO walk_trait VALUES (?, ?, ?)",
                        (species, character, value),
                    )
                    states.add((character, value))
        conn.executemany("INSERT INTO walk_state VALUES (?, ?)", sorted(states))
    store = WalkthroughStore(db, tmp_path / "walkthroughs")
    app = create_app(
        data_dir=tmp_path / "sessions",
        content=None,
        tile_archive=None,
        walkthrough=store,
    )
    return TestClient(app)


BUTTON_ANSWERS = [
    ("hymeniumType", "gills"),
    ("whichGills", "free"),
    ("stipeCharacter", "ring"),
    ("sporePrintColor", "brown"),
]


def run_transcript(client, answers):
    session = client.post("/v1/walkthrough/sessions").json()
    states = [session]
    for character, state in answers:
        response = client.post(
            f"/v1/walkthrough/sessions/{session['session_id']}/answer",
            json={"character": character, "state": state},
        )
        assert response.status_code == 200, response.text
        states.append(response.json())
    return states


def test_button_mushroom_pilot(client):
    states = run_transcript(client, BUTTON_ANSWERS)
    first = states[0]
    assert first["question"]["character"] == "hymeniumType"
    assert first["candidate_count"] == 5
    final = states[-1]
    assert final["complete"] is True
    survivors = {card["species"] for card in final["candidates"]}
    # The yellow-stainer and the sparse record survive alongside the button
    # mushroom: the lookalike matches every answer, the sparse record is
    # never eliminated by data it lacks.
    assert survivors == {
        "Agaricus bisporus",
        "Agaricus xanthodermus",
        "Sparse deadly",
    }
    assert {card["species"] for card in final["danger_species"]} == {
        "Agaricus xanthodermus",
        "Sparse deadly",
    }


def test_danger_branch_fires_on_amanita_answers(client):
    states = run_transcript(
        client,
        [
            ("hymeniumType", "gills"),
            ("stipeCharacter", "ring and volva"),
            ("sporePrintColor", "white"),
        ],
    )
    danger = {card["species"] for card in states[-1]["danger_species"]}
    assert "Amanita phalloides" in danger
    assert "Agaricus xanthodermus" not in danger


def test_replay_reproduces_the_session(client):
    first = run_transcript(client, BUTTON_ANSWERS)
    second = run_transcript(client, BUTTON_ANSWERS)
    strip = lambda s: {k: v for k, v in s.items() if k != "session_id"}
    assert [strip(s) for s in first] == [strip(s) for s in second]


def test_skip_filters_nothing_and_undo_restores(client):
    session = client.post("/v1/walkthrough/sessions").json()
    sid = session["session_id"]
    skipped = client.post(
        f"/v1/walkthrough/sessions/{sid}/answer",
        json={"character": "hymeniumType", "state": None},
    ).json()
    assert skipped["candidate_count"] == session["candidate_count"]
    assert skipped["question"]["character"] == "whichGills"
    undone = client.post(f"/v1/walkthrough/sessions/{sid}/undo").json()
    assert undone["question"]["character"] == "hymeniumType"


def test_validation_and_missing_pack(client, tmp_path):
    session = client.post("/v1/walkthrough/sessions").json()
    sid = session["session_id"]
    assert (
        client.post(
            f"/v1/walkthrough/sessions/{sid}/answer",
            json={"character": "hymeniumType", "state": "feathers"},
        ).status_code
        == 422
    )
    client.post(
        f"/v1/walkthrough/sessions/{sid}/answer",
        json={"character": "hymeniumType", "state": "gills"},
    )
    assert (
        client.post(
            f"/v1/walkthrough/sessions/{sid}/answer",
            json={"character": "hymeniumType", "state": "gills"},
        ).status_code
        == 409
    )
    assert client.get("/v1/walkthrough/sessions/nope").status_code == 404
    bare = TestClient(
        create_app(
            data_dir=tmp_path / "bare",
            content=None,
            tile_archive=None,
            walkthrough=None,
        )
    )
    assert bare.post("/v1/walkthrough/sessions").status_code == 503
