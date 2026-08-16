"""Nearest-feature endpoint (#226) over a fixture water-layer artifact."""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.features import FeatureStore
from flux_server.main import create_app

# Microdegree schema matching contracts/pack-format.md. Lake Union's stand-in
# sits ~1.1 km north of the fix; the stream ~5.5 km east; the spring far off.
FIXTURE_SQL = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE feature (id INTEGER PRIMARY KEY, osm_id TEXT, class TEXT, name TEXT);
CREATE TABLE feature_point (feature_id INTEGER, lat INTEGER, lon INTEGER);
CREATE INDEX feature_point_lat ON feature_point (lat);
INSERT INTO meta VALUES ('attribution', '© OpenStreetMap contributors');
INSERT INTO feature VALUES (1, 'way/1', 'water', 'Near Lake');
INSERT INTO feature VALUES (2, 'way/2', 'stream', NULL);
INSERT INTO feature VALUES (3, 'node/3', 'spring', 'Far Spring');
INSERT INTO feature_point VALUES (1, 47010000, -121000000);
INSERT INTO feature_point VALUES (1, 47012000, -121000000);
INSERT INTO feature_point VALUES (2, 47000000, -120927000);
INSERT INTO feature_point VALUES (3, 48500000, -119000000);
"""

FIX = {"lat": 47.0, "lon": -121.0}


@pytest.fixture()
def store(tmp_path: Path) -> FeatureStore:
    db = tmp_path / "features.db"
    conn = sqlite3.connect(db)
    conn.executescript(FIXTURE_SQL)
    conn.close()
    return FeatureStore(db)


def test_first_window_answers_with_the_confirmed_nearest(store) -> None:
    hits = store.nearest(FIX["lat"], FIX["lon"])
    # The stream (5.5 km) sits outside the 2 km window the lake settles in.
    assert [h["feature_class"] for h in hits] == ["water"]
    lake = hits[0]
    assert lake["name"] == "Near Lake"
    # The lake's nearer sampled point (1.1 km due north) wins over its
    # farther one, and the bearing points north.
    assert 1_050 <= lake["distance_m"] <= 1_170
    assert lake["bearing_deg"] in (359, 0, 1)


def test_class_filter_reaches_through_wider_windows(store) -> None:
    stream = store.nearest(FIX["lat"], FIX["lon"], classes=("stream",))
    assert [h["feature_class"] for h in stream] == ["stream"]
    assert 5_300 <= stream[0]["distance_m"] <= 5_800
    spring = store.nearest(FIX["lat"], FIX["lon"], classes=("spring",))
    assert [h["feature_class"] for h in spring] == ["spring"]


def test_route_answers_and_carries_attribution(tmp_path: Path, store) -> None:
    app = create_app(
        data_dir=tmp_path,
        retriever=None,
        content=None,
        tile_archive=None,
        terrain_archive=None,
        features=store,
    )
    with TestClient(app) as client:
        body = client.get("/v1/features/nearest", params=FIX).json()
    assert body["attribution"] == "© OpenStreetMap contributors"
    assert body["hits"][0]["name"] == "Near Lake"
    assert "osm_id" not in body["hits"][0]


def test_route_without_a_layer_is_an_honest_503(tmp_path: Path) -> None:
    app = create_app(
        data_dir=tmp_path,
        retriever=None,
        content=None,
        tile_archive=None,
        terrain_archive=None,
        features=None,
    )
    with TestClient(app) as client:
        response = client.get("/v1/features/nearest", params=FIX)
    assert response.status_code == 503
