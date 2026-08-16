"""Trail graph extraction (#148) against a synthetic OSM XML fixture."""

import sqlite3
from pathlib import Path

from flux_pipeline.trails import build_trails

# A path (1-2-3) meeting a track (3-4-5) at node 3, plus a private service
# way and a waterway that must stay out. Node 2 is interior to one way, so
# the graph keeps nodes 1, 3, 5 and two edges.
FIXTURE = """<?xml version='1.0' encoding='UTF-8'?>
<osm version="0.6" generator="test">
  <node id="1" lat="47.0000" lon="-121.0000"/>
  <node id="2" lat="47.0050" lon="-121.0000"/>
  <node id="3" lat="47.0100" lon="-121.0000"/>
  <node id="4" lat="47.0100" lon="-121.0100"/>
  <node id="5" lat="47.0100" lon="-121.0200"/>
  <node id="6" lat="47.0200" lon="-121.0200"/>
  <way id="10">
    <nd ref="1"/><nd ref="2"/><nd ref="3"/>
    <tag k="highway" v="path"/>
  </way>
  <way id="11">
    <nd ref="3"/><nd ref="4"/><nd ref="5"/>
    <tag k="highway" v="track"/>
  </way>
  <way id="12">
    <nd ref="5"/><nd ref="6"/>
    <tag k="highway" v="service"/>
    <tag k="access" v="private"/>
  </way>
  <way id="13">
    <nd ref="1"/><nd ref="6"/>
    <tag k="waterway" v="stream"/>
  </way>
</osm>
"""


def build(tmp_path: Path) -> Path:
    osm_file = tmp_path / "fixture.osm"
    osm_file.write_text(FIXTURE)
    out_db = tmp_path / "trails.db"
    counts = build_trails(osm_file, out_db, source_url="https://example.test/wa.pbf")
    assert counts == (3, 2)
    return out_db


def test_graph_keeps_junctions_and_endpoints_only(tmp_path: Path) -> None:
    conn = sqlite3.connect(build(tmp_path))
    nodes = sorted(row[0] for row in conn.execute("SELECT id FROM node"))
    assert nodes == [1, 3, 5]
    edges = conn.execute("SELECT a, b, distance_m FROM edge ORDER BY a").fetchall()
    conn.close()
    # 1-3 spans 0.01 deg latitude (~1113 m); 3-5 spans 0.02 deg longitude
    # at 47N (~1517 m).
    assert [(a, b) for a, b, _ in edges] == [(1, 3), (3, 5)]
    assert 1_050 <= edges[0][2] <= 1_170
    assert 1_450 <= edges[1][2] <= 1_580


def test_meta_carries_the_odbl_attribution(tmp_path: Path) -> None:
    conn = sqlite3.connect(build(tmp_path))
    meta = dict(conn.execute("SELECT key, value FROM meta"))
    conn.close()
    assert meta["license"] == "ODbL-1.0"
    assert meta["source"] == "https://example.test/wa.pbf"
