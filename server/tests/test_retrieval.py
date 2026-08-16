"""Retrieval comprehensiveness: questions the pack covers must hit it.

The screenshot bug behind #200: "With berries are safe to eat?" pulled
passages from the nuclear and sea chapters, so chat answered "the guide
does not cover" over a pack holding eight berry blocks. Two causes: the
FTS index matched neither "berries" against the manual's compound names
(Blackberries, Chinaberry, pokeberries) nor filtered function words, so
"with" ranked prose noise. The fixture tests pin each mechanism; the
battery runs whole questions against the real demo pack and requires the
right chapter on top.
"""

import sqlite3
from pathlib import Path

import pytest
from flux_server.content import ContentStore

DEMO_PACK = Path(__file__).parents[2] / "data" / "demo" / "content.db"

FIXTURE_SCHEMA = """
CREATE TABLE chapter (
    id TEXT PRIMARY KEY, tile_id INTEGER, fm_number INTEGER UNIQUE,
    title TEXT, priority_order INTEGER
);
CREATE TABLE section (
    id TEXT PRIMARY KEY, chapter_id TEXT REFERENCES chapter(id),
    fm_heading TEXT, title TEXT, "order" INTEGER
);
CREATE TABLE block (
    id TEXT PRIMARY KEY, section_id TEXT REFERENCES section(id),
    "order" INTEGER, type TEXT, text TEXT, figure_ref TEXT,
    source TEXT, review_status TEXT
);
INSERT INTO chapter VALUES ('ch09', 5, 9, 'Survival Use of Plants', 9);
INSERT INTO chapter VALUES ('ch23', 12, 23, 'Nuclear Environments', 23);
INSERT INTO section VALUES ('ch09-food-plants', 'ch09', NULL, 'Food Plants', 1);
INSERT INTO section VALUES ('ch23-food', 'ch23', NULL, 'Food Procurement', 1);
INSERT INTO block VALUES
    ('ch09-food-plants-b001', 'ch09-food-plants', 1, 'principle',
     'Blackberries, blueberries, and strawberries with an aggregate berry structure are edible raw.',
     NULL, 'FM 21-76', 'auto'),
    ('ch09-food-plants-b002', 'ch09-food-plants', 2, 'principle',
     'Boil the roots before eating them.', NULL, 'FM 21-76', 'auto'),
    ('ch23-food-b001', 'ch23-food', 1, 'principle',
     'If you eat, find an area in which you can eat with safety from fallout.',
     NULL, 'FM 21-76', 'auto');
"""


@pytest.fixture()
def store(tmp_path: Path) -> ContentStore:
    db_path = tmp_path / "content.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(FIXTURE_SCHEMA)
    conn.commit()
    conn.close()
    return ContentStore(db_path)


def test_chat_retrieval_reaches_inside_compound_words(store: ContentStore) -> None:
    hits = store.search_any("With berries are safe to eat?", 3)
    assert hits, "a covered question must hit the pack"
    assert hits[0]["block_id"] == "ch09-food-plants-b001"


def test_chat_retrieval_drops_function_words(store: ContentStore) -> None:
    # Every word is a stopword or too short: no terms may survive, since a
    # match on "with" alone is what ranked unrelated chapters.
    assert store.search_any("with are to the", 3) == []


def test_exact_search_stems_plurals(store: ContentStore) -> None:
    hits = store.search("berry", 3)
    assert [hit["block_id"] for hit in hits] == ["ch09-food-plants-b001"]


def test_exact_search_matches_short_terms(store: ContentStore) -> None:
    # The porter index keeps sub-trigram terms searchable in the reader.
    assert store.search("if", 3)


# One question per surface a user actually asks; the expected chapter must
# rank first, so junk passages can never crowd out the covering chapter.
BATTERY = [
    ("With berries are safe to eat?", "ch09"),
    ("which berries are poisonous", "ch09"),
    ("how do I purify water", "ch06"),
    ("how to treat a snake bite", "ch04"),
    ("start a fire without matches", "ch07"),
    ("how do I signal an aircraft", "ch19"),
    ("build a shelter in deep snow", "ch15"),
]


@pytest.mark.skipif(not DEMO_PACK.exists(), reason="demo pack not installed")
@pytest.mark.parametrize(("question", "chapter"), BATTERY)
def test_demo_pack_battery(question: str, chapter: str) -> None:
    hits = ContentStore(DEMO_PACK).search_any(question, 4)
    assert hits, question
    assert hits[0]["chapter_id"].endswith(chapter), [
        (hit["chapter_id"], hit["snippet"]) for hit in hits
    ]
