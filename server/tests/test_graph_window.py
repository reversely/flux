"""Graph-window endpoint (#229) over a fixture trail graph."""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.trails import TrailStore

FIXTURE_SQL = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE node (id INTEGER PRIMARY KEY, lat INTEGER, lon INTEGER);
CREATE TABLE edge (a INTEGER, b INTEGER, distance_m INTEGER);
CREATE INDEX edge_a ON edge (a);
INSERT INTO meta VALUES ('attribution', '© OpenStreetMap contributors');
INSERT INTO node VALUES (1, 47000000, -121000000);
INSERT INTO node VALUES (2, 47010000, -121000000);
INSERT INTO node VALUES (3, 47500000, -121500000);
INSERT INTO edge VALUES (1, 2, 1113);
INSERT INTO edge VALUES (2, 3, 70000);
"""


@pytest.fixture()
def store(tmp_path: Path) -> TrailStore:
    db = tmp_path / "trails.db"
    conn = sqlite3.connect(db)
    conn.executescript(FIXTURE_SQL)
    conn.close()
    return TrailStore(db)


def test_window_keeps_inside_nodes_and_fully_inside_edges(store) -> None:
    window = store.window(46.99, 47.02, -121.01, -120.99)
    assert [node[0] for node in window["nodes"]] == [1, 2]
    # Edge 2-3 leaves the box, so only 1-2 survives.
    assert window["edges"] == [[1, 2, 1113]]
    assert window["attribution"] == "© OpenStreetMap contributors"


def test_route_answers_and_503s_without_a_graph(tmp_path: Path, store) -> None:
    served = create_app(
        data_dir=tmp_path,
        retriever=None,
        content=None,
        tile_archive=None,
        terrain_archive=None,
        trails=store,
    )
    params = {
        "min_lat": 46.99,
        "max_lat": 47.02,
        "min_lon": -121.01,
        "max_lon": -120.99,
    }
    with TestClient(served) as client:
        assert client.get("/v1/graph/window", params=params).json()["edges"] == [
            [1, 2, 1113]
        ]
    bare = create_app(
        data_dir=tmp_path,
        retriever=None,
        content=None,
        tile_archive=None,
        terrain_archive=None,
        trails=None,
    )
    with TestClient(bare) as client:
        assert client.get("/v1/graph/window", params=params).status_code == 503
