"""Water-feature extraction (#222) against a synthetic OSM XML fixture."""

import sqlite3
from pathlib import Path

import pytest
from flux_pipeline.features import build_features

# A lake as a closed way, a named stream, a spring node, and a footpath
# that must not extract. Node 5 sits ~1.1 km from node 1, so the lake keeps
# more than one sampled vertex.
FIXTURE = """<?xml version='1.0' encoding='UTF-8'?>
<osm version="0.6" generator="test">
  <node id="1" lat="47.0000" lon="-121.0000"/>
  <node id="2" lat="47.0000" lon="-121.0150"/>
  <node id="3" lat="47.0100" lon="-121.0150"/>
  <node id="4" lat="47.0100" lon="-121.0000"/>
  <node id="5" lat="47.1000" lon="-121.1000"/>
  <node id="6" lat="47.1010" lon="-121.1010"/>
  <node id="7" lat="47.2000" lon="-121.2000">
    <tag k="natural" v="spring"/>
    <tag k="name" v="Cold Spring"/>
  </node>
  <way id="10">
    <nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/>
    <tag k="natural" v="water"/>
    <tag k="name" v="Mirror Lake"/>
  </way>
  <way id="11">
    <nd ref="5"/><nd ref="6"/>
    <tag k="waterway" v="stream"/>
    <tag k="name" v="Quick Creek"/>
  </way>
  <way id="12">
    <nd ref="1"/><nd ref="5"/>
    <tag k="highway" v="path"/>
  </way>
  <way id="13">
    <nd ref="5"/><nd ref="6"/>
    <tag k="waterway" v="stream"/>
    <tag k="intermittent" v="yes"/>
  </way>
</osm>
"""


@pytest.fixture()
def rows(tmp_path: Path) -> list[tuple]:
    osm_file = tmp_path / "fixture.osm"
    osm_file.write_text(FIXTURE)
    out_db = tmp_path / "features.db"
    count = build_features(osm_file, out_db, source_url="https://example.test/wa.pbf")
    assert count == 3
    conn = sqlite3.connect(out_db)
    try:
        return conn.execute(
            "SELECT feature.osm_id, feature.class, feature.name,"
            " COUNT(feature_point.feature_id)"
            " FROM feature JOIN feature_point"
            " ON feature_point.feature_id = feature.id"
            " GROUP BY feature.id ORDER BY feature.osm_id"
        ).fetchall()
    finally:
        conn.close()


def test_extracts_lake_stream_and_spring_but_not_path_or_seasonal(rows) -> None:
    assert [(r[0], r[1], r[2]) for r in rows] == [
        ("node/7", "spring", "Cold Spring"),
        ("way/10", "water", "Mirror Lake"),
        ("way/11", "stream", "Quick Creek"),
    ]


def test_lake_ring_samples_more_than_one_vertex(rows) -> None:
    by_id = {r[0]: r[3] for r in rows}
    assert by_id["way/10"] > 1
    assert by_id["node/7"] == 1


def test_meta_carries_the_odbl_attribution(tmp_path: Path) -> None:
    osm_file = tmp_path / "fixture.osm"
    osm_file.write_text(FIXTURE)
    out_db = tmp_path / "features.db"
    build_features(osm_file, out_db, source_url="https://example.test/wa.pbf")
    conn = sqlite3.connect(out_db)
    meta = dict(conn.execute("SELECT key, value FROM meta"))
    conn.close()
    assert meta["license"] == "ODbL-1.0"
    assert meta["attribution"] == "© OpenStreetMap contributors"
    assert meta["source"] == "https://example.test/wa.pbf"


def test_spring_point_stores_integer_microdegrees(tmp_path: Path) -> None:
    osm_file = tmp_path / "fixture.osm"
    osm_file.write_text(FIXTURE)
    out_db = tmp_path / "features.db"
    build_features(osm_file, out_db)
    conn = sqlite3.connect(out_db)
    lat, lon = conn.execute(
        "SELECT feature_point.lat, feature_point.lon FROM feature_point"
        " JOIN feature ON feature.id = feature_point.feature_id"
        " WHERE feature.class = 'spring'"
    ).fetchone()
    conn.close()
    assert (lat, lon) == (47_200_000, -121_200_000)
