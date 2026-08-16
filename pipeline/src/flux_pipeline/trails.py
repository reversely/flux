"""Trail-network graph artifact for the pack (#148).

Extracts the walkable way network from a region's OSM extract into a
compact SQLite graph the in-app router (#149) runs A* over: nodes at
junctions and endpoints, edges with walked distance in meters summed
along the way between them. Ways tagged access=no or access=private stay
out; a route the user cannot legally walk is a wrong answer.

Same provenance rules as the water layer (#222): ODbL source recorded in
the meta table.
"""

from __future__ import annotations

import sqlite3
from collections import Counter
from pathlib import Path

import osmium

from flux_pipeline.features import _meters_between, _microdegrees

# Measured on Washington: service, residential, and living_street ways are
# driveways, parking aisles, and street grid, half the graph's node refs
# and none of them trail navigation; unclassified stays as the rural
# connector class.
WALKABLE_HIGHWAYS = {
    "path",
    "footway",
    "track",
    "bridleway",
    "steps",
    "cycleway",
    "unclassified",
}

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE node (
    id INTEGER PRIMARY KEY,
    lat INTEGER NOT NULL,
    lon INTEGER NOT NULL
);
CREATE TABLE edge (
    a INTEGER NOT NULL REFERENCES node(id),
    b INTEGER NOT NULL REFERENCES node(id),
    distance_m INTEGER NOT NULL
);
CREATE INDEX edge_a ON edge (a);
CREATE INDEX edge_b ON edge (b);
"""


class _WayCollector(osmium.SimpleHandler):
    """First pass: kept ways with their node ids and coordinates."""

    def __init__(self) -> None:
        super().__init__()
        self.ways: list[list[tuple[int, float, float]]] = []
        self.refs = Counter()

    def way(self, way: osmium.osm.Way) -> None:
        if way.tags.get("highway") not in WALKABLE_HIGHWAYS:
            return
        if way.tags.get("access") in ("no", "private"):
            return
        nodes = [(n.ref, n.lat, n.lon) for n in way.nodes if n.location.valid()]
        if len(nodes) < 2:
            return
        self.ways.append(nodes)
        self.refs.update(ref for ref, _, _ in nodes)


def build_trails(
    osm_path: Path, out_db: Path, source_url: str | None = None
) -> tuple[int, int]:
    """Extract the walkable graph; returns (node count, edge count)."""
    collector = _WayCollector()
    collector.apply_file(str(osm_path), locations=True)

    out_db.unlink(missing_ok=True)
    conn = sqlite3.connect(out_db)
    conn.executescript(SCHEMA)
    conn.executemany(
        "INSERT INTO meta (key, value) VALUES (?, ?)",
        [
            ("license", "ODbL-1.0"),
            ("attribution", "© OpenStreetMap contributors"),
            ("source", source_url or str(osm_path.name)),
        ],
    )

    graph_nodes: dict[int, tuple[float, float]] = {}
    edges = 0
    for nodes in collector.ways:
        # A way splits into edges at junctions (nodes two kept ways share)
        # and keeps its endpoints; interior nodes contribute distance only.
        start_index = 0
        distance = 0.0
        for index in range(1, len(nodes)):
            prev, cur = nodes[index - 1], nodes[index]
            distance += _meters_between(prev[1], prev[2], cur[1], cur[2])
            is_cut = index == len(nodes) - 1 or collector.refs[cur[0]] > 1
            if not is_cut:
                continue
            a, b = nodes[start_index], cur
            if a[0] != b[0] and distance > 0:
                for ref, lat, lon in (a, b):
                    graph_nodes[ref] = (lat, lon)
                conn.execute(
                    "INSERT INTO edge (a, b, distance_m) VALUES (?, ?, ?)",
                    (a[0], b[0], round(distance)),
                )
                edges += 1
            start_index = index
            distance = 0.0

    conn.executemany(
        "INSERT INTO node (id, lat, lon) VALUES (?, ?, ?)",
        [
            (ref, _microdegrees(lat), _microdegrees(lon))
            for ref, (lat, lon) in graph_nodes.items()
        ],
    )
    conn.commit()
    conn.execute("VACUUM")
    conn.close()
    return len(graph_nodes), edges
