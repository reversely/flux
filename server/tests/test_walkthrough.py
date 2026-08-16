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


def test_danger_list_ships_before_any_answer(client):
    # #136: the danger subset is never gated on its size; a fresh session
    # already names every dangerous species still in play.
    session = client.post("/v1/walkthrough/sessions").json()
    assert session["danger_count"] == len(session["danger_species"])
    assert session["danger_count"] > 0


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


def test_multiselect_filters_any_of_within_a_character(client):
    session = client.post("/v1/walkthrough/sessions").json()
    state = client.post(
        f"/v1/walkthrough/sessions/{session['session_id']}/answer",
        json={"character": "hymeniumType", "states": ["gills", "ridges"]},
    ).json()
    assert state["candidate_count"] == 5
    state = client.post(
        f"/v1/walkthrough/sessions/{session['session_id']}/answer",
        json={"character": "sporePrintColor", "states": ["yellow", "white"]},
    ).json()
    survivors = {card["species"] for card in state["candidates"]}
    # Cantharellus matches on either print color; the brown-print Agaricus
    # pair drops; the sparse record has no print recorded and stays.
    assert survivors == {
        "Amanita phalloides",
        "Cantharellus formosus",
        "Sparse deadly",
    }


def test_species_catalog(client):
    rows = client.get("/v1/walkthrough/species").json()
    assert len(rows) == 5
    amanita = next(r for r in rows if r["species"] == "Amanita phalloides")
    assert amanita["edibility"] == "danger"
    assert amanita["traits"]["stipeCharacter"] == ["ring and volva"]


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
    replaced = client.post(
        f"/v1/walkthrough/sessions/{sid}/answer",
        json={"character": "hymeniumType", "states": ["ridges"]},
    )
    assert replaced.status_code == 200
    assert [a["states"] for a in replaced.json()["answers"]] == [["ridges"]]
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


class StubObserver:
    def __init__(self, observation):
        self.observation = observation
        self.calls = []

    def observe(self, question, states, frames, subject):
        self.calls.append((question, tuple(states), len(frames), subject))
        return self.observation


def make_clip_bytes():
    import shutil
    import subprocess

    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg not installed")
    return subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=1:size=64x64:rate=2",
            "-f",
            "mp4",
            "-movflags",
            "frag_keyframe+empty_moov",
            "-",
        ],
        capture_output=True,
        check=True,
    ).stdout


@pytest.fixture
def observe_client(tmp_path):
    """A #65-vintage pack: node columns present, gill node camera-capable."""
    db = tmp_path / "content65.db"
    with sqlite3.connect(db) as conn:
        conn.executescript(
            """
            CREATE TABLE walk_question (
                guide_id TEXT NOT NULL DEFAULT 'fungi-edibility',
                character TEXT NOT NULL, ask_order INTEGER NOT NULL,
                question TEXT NOT NULL, citation TEXT NOT NULL,
                answer_source TEXT NOT NULL DEFAULT 'user',
                capture_condition TEXT, evidence_kind TEXT,
                PRIMARY KEY (guide_id, character));
            CREATE TABLE walk_state (
                guide_id TEXT NOT NULL DEFAULT 'fungi-edibility',
                character TEXT NOT NULL, state TEXT NOT NULL,
                PRIMARY KEY (guide_id, character, state));
            CREATE TABLE walk_species (
                guide_id TEXT NOT NULL DEFAULT 'fungi-edibility',
                species TEXT NOT NULL, edibility TEXT NOT NULL,
                edibility_raw TEXT NOT NULL, source_title TEXT NOT NULL,
                source_revid TEXT NOT NULL,
                PRIMARY KEY (guide_id, species));
            CREATE TABLE walk_trait (
                guide_id TEXT NOT NULL DEFAULT 'fungi-edibility',
                species TEXT NOT NULL, character TEXT NOT NULL,
                state TEXT NOT NULL,
                PRIMARY KEY (guide_id, species, character, state));
            INSERT INTO walk_question
                (character, ask_order, question, citation, answer_source,
                 capture_condition, evidence_kind)
             VALUES
                ('whichGills', 1,
                 'Gills at the stem: free, attached (adnate), or running down (decurrent)?',
                 'test citation', 'both', 'gill junction visible', 'clip'),
                ('sporePrintColor', 2, 'Spore print color?', 'test citation',
                 'user', NULL, NULL);
            INSERT INTO walk_state (character, state) VALUES
                ('whichGills', 'free'), ('whichGills', 'adnate'),
                ('sporePrintColor', 'white');
            INSERT INTO walk_species
                (species, edibility, edibility_raw, source_title, source_revid)
             VALUES ('Agaricus bisporus', 'edible', 'edible', 'Agaricus bisporus', '1');
            INSERT INTO walk_trait (species, character, state)
             VALUES ('Agaricus bisporus', 'whichGills', 'free');
            """
        )
    store = WalkthroughStore(db, tmp_path / "walkthroughs")

    def build(observer):
        app = create_app(
            data_dir=tmp_path / "sessions",
            content=None,
            tile_archive=None,
            walkthrough=store,
            walk_observer=observer,
        )
        return TestClient(app)

    return build


def test_observe_suggests_without_writing_transcript(observe_client):
    from flux_server.observe import Observation

    observer = StubObserver(
        Observation(state="free", confidence=0.8, observation="Gills clear of stem.")
    )
    client = observe_client(observer)
    session_id = client.post("/v1/walkthrough/sessions").json()["session_id"]
    response = client.post(
        f"/v1/walkthrough/sessions/{session_id}/observe",
        data={"character": "whichGills"},
        files={"video": ("clip.mp4", make_clip_bytes(), "video/mp4")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["state"] == "free"
    assert body["cause"].startswith("checking gills at the stem")
    assert observer.calls[0][1] == ("adnate", "free")
    state = client.get(f"/v1/walkthrough/sessions/{session_id}").json()
    assert state["answers"] == []
    camera_nodes = [
        q for q in state["questions"] if q.get("answer_source") in ("camera", "both")
    ]
    assert [q["character"] for q in camera_nodes] == ["whichGills"]


def test_observe_refuses_user_answered_node(observe_client):
    from flux_server.observe import Observation

    observer = StubObserver(Observation(state=None, confidence=0, observation=""))
    client = observe_client(observer)
    session_id = client.post("/v1/walkthrough/sessions").json()["session_id"]
    response = client.post(
        f"/v1/walkthrough/sessions/{session_id}/observe",
        data={"character": "sporePrintColor"},
        files={"video": ("clip.mp4", b"x", "video/mp4")},
    )
    assert response.status_code == 422
    assert observer.calls == []


def test_observe_reports_off_subject(observe_client):
    from flux_server.observe import Observation

    observer = StubObserver(
        Observation(
            state=None,
            confidence=0.9,
            observation="A coffee mug on a table, not a fungus.",
            off_subject=True,
        )
    )
    client = observe_client(observer)
    session_id = client.post("/v1/walkthrough/sessions").json()["session_id"]
    response = client.post(
        f"/v1/walkthrough/sessions/{session_id}/observe",
        data={"character": "whichGills"},
        files={"video": ("clip.mp4", make_clip_bytes(), "video/mp4")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["off_subject"] is True
    assert body.get("state") is None
    # The guide's title travels to the model as the expected subject.
    assert observer.calls[0][3] == "fungi edibility"


def test_clean_artist_shortens_commons_paragraphs():
    from flux_server.walkthrough import clean_artist

    observer = (
        "This image was created by user Martin Livezey (MLivezey) at Mushroom "
        "Observer, a source for mycological images.You can contact this user here."
    )
    assert clean_artist(observer) == "Martin Livezey"
    assert clean_artist("Alan Rockefeller") == "Alan Rockefeller"
    long = "A very long descriptive credit that keeps going. Second sentence."
    assert clean_artist(long) == "A very long descriptive credit that keeps going"
