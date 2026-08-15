"""Tests for the content API over a pack database built to the contract."""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.content import ContentStore
from flux_server.main import create_app

# Schema and rows follow contracts/pack-format.md; the fixture stays
# independent of the pipeline source on purpose.
SCHEMA = """
CREATE TABLE chapter (
    id TEXT PRIMARY KEY,
    tile_id INTEGER,
    fm_number INTEGER UNIQUE,
    title TEXT,
    priority_order INTEGER
);
CREATE TABLE section (
    id TEXT PRIMARY KEY,
    chapter_id TEXT REFERENCES chapter(id),
    fm_heading TEXT,
    title TEXT,
    "order" INTEGER
);
CREATE TABLE block (
    id TEXT PRIMARY KEY,
    section_id TEXT REFERENCES section(id),
    "order" INTEGER,
    type TEXT,
    text TEXT,
    figure_ref TEXT,
    source TEXT,
    review_status TEXT
);
CREATE TABLE figure (
    id TEXT PRIMARY KEY,
    block_id TEXT REFERENCES block(id),
    fm_figure_ref TEXT,
    image_path TEXT,
    source_manual TEXT,
    license TEXT
);
"""

ROWS = """
INSERT INTO chapter VALUES ('fm21-76-ch04', 2, 4, 'BASIC MEDICINE', 4);
INSERT INTO chapter VALUES ('fm21-76-ch06', 3, 6, 'WATER PROCUREMENT', 6);
INSERT INTO section VALUES
    ('fm21-76-ch04-intro', 'fm21-76-ch04', NULL, 'Introduction', 0),
    ('fm21-76-ch04-lifesaving-steps', 'fm21-76-ch04', 'LIFESAVING STEPS',
     'Lifesaving Steps', 1),
    ('fm21-76-ch06-water-sources', 'fm21-76-ch06', 'WATER SOURCES',
     'Water Sources', 1);
INSERT INTO block VALUES
    ('fm21-76-ch04-lifesaving-steps-b001', 'fm21-76-ch04-lifesaving-steps',
     1, 'principle', 'Check for breathing before anything else.', NULL,
     'FM 21-76', 'auto'),
    ('fm21-76-ch04-lifesaving-steps-b002', 'fm21-76-ch04-lifesaving-steps',
     2, 'warning', 'Do not move a casualty with a suspected spine injury.',
     '4-2', 'FM 21-76', 'auto'),
    ('fm21-76-ch06-water-sources-b001', 'fm21-76-ch06-water-sources',
     1, 'principle', 'Purify all water from standing sources before drinking.',
     NULL, 'FM 21-76', 'auto');
INSERT INTO figure VALUES
    ('fm21-76-fig-4-2', 'fm21-76-ch04-lifesaving-steps-b002', '4-2', NULL,
     'FM 21-76', 'public-domain');
"""


@pytest.fixture()
def pack_db(tmp_path: Path) -> Path:
    db_path = tmp_path / "content.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA + ROWS)
    conn.close()
    return db_path


@pytest.fixture()
def client(pack_db: Path, tmp_path: Path) -> TestClient:
    return TestClient(
        create_app(data_dir=tmp_path / "sessions", content=ContentStore(pack_db))
    )


def test_chapters_list_in_priority_order(client: TestClient) -> None:
    chapters = client.get("/v1/content/chapters").json()
    assert [chapter["id"] for chapter in chapters] == [
        "fm21-76-ch04",
        "fm21-76-ch06",
    ]
    assert chapters[0]["tile_id"] == 2


def test_chapter_detail_orders_sections(client: TestClient) -> None:
    chapter = client.get("/v1/content/chapters/fm21-76-ch04").json()
    assert chapter["title"] == "BASIC MEDICINE"
    assert [section["order"] for section in chapter["sections"]] == [0, 1]
    assert chapter["sections"][0]["title"] == "Introduction"


def test_section_detail_orders_blocks(client: TestClient) -> None:
    section = client.get("/v1/content/sections/fm21-76-ch04-lifesaving-steps").json()
    assert section["fm_heading"] == "LIFESAVING STEPS"
    assert [block["order"] for block in section["blocks"]] == [1, 2]
    assert section["blocks"][1]["type"] == "warning"
    assert section["blocks"][1]["figure_ref"] == "4-2"


def test_block_resolves_a_citation_anchor(client: TestClient) -> None:
    block = client.get("/v1/content/blocks/fm21-76-ch04-lifesaving-steps-b002").json()
    assert block["section_id"] == "fm21-76-ch04-lifesaving-steps"
    assert block["review_status"] == "auto"


def test_figure_row_carries_license(client: TestClient) -> None:
    figure = client.get("/v1/content/figures/fm21-76-fig-4-2").json()
    assert figure["image_path"] is None
    assert figure["license"] == "public-domain"


def test_unknown_anchors_return_404(client: TestClient) -> None:
    for path in (
        "/v1/content/chapters/fm21-76-ch99",
        "/v1/content/sections/fm21-76-ch99-nope",
        "/v1/content/blocks/fm21-76-ch99-nope-b001",
        "/v1/content/figures/fm21-76-fig-99-9",
    ):
        assert client.get(path).status_code == 404


def test_search_ranks_and_snippets(client: TestClient) -> None:
    results = client.get("/v1/content/search", params={"q": "water"}).json()
    assert results["query"] == "water"
    assert [hit["block_id"] for hit in results["hits"]] == [
        "fm21-76-ch06-water-sources-b001"
    ]
    hit = results["hits"][0]
    assert hit["chapter_id"] == "fm21-76-ch06"
    assert "[water]" in hit["snippet"]


def test_search_survives_fts_operator_input(client: TestClient) -> None:
    for query in ('breathing AND "', "NEAR(", "spine-injury*"):
        response = client.get("/v1/content/search", params={"q": query})
        assert response.status_code == 200


def test_search_multi_term_narrows(client: TestClient) -> None:
    hits = client.get("/v1/content/search", params={"q": "standing water"}).json()[
        "hits"
    ]
    assert [hit["block_id"] for hit in hits] == ["fm21-76-ch06-water-sources-b001"]


def test_without_a_pack_content_routes_answer_503(tmp_path: Path) -> None:
    client = TestClient(create_app(data_dir=tmp_path, content=None))
    response = client.get("/v1/content/chapters")
    assert response.status_code == 503
    assert response.json()["detail"] == "no content pack installed"
