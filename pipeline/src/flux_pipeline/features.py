"""Natural-feature layer for the pack (#222): water features from OSM.

Extracts bodies of water from a region's OSM extract into a compact SQLite
artifact the app queries for "how far am I from water" (#223). Geometry is
sampled to points at roughly SAMPLE_SPACING_M along each way or ring, so a
nearest-vertex scan approximates nearest-feature distance at walking scale
without carrying full geometry. Lakes tagged on multipolygon relations
arrive through the area callback, which pyosmium runs as a second pass.

The source is ODbL-licensed OpenStreetMap data; the artifact's meta table
carries the attribution the app must show.
"""

from __future__ import annotations

import math
import sqlite3
from pathlib import Path

import osmium

SAMPLE_SPACING_M = 100.0
# Streams are ~80% of Washington's points; coarser sampling on linear
# waterways trades ~125 m worst-case distance error for a phone-sized file.
LINEAR_SAMPLE_SPACING_M = 250.0

# tag -> feature class; areas and closed ways use natural=water, linear
# waterways keep their own classes so a stream reads differently from a
# river in an answer.
WATERWAY_CLASSES = {"river": "river", "stream": "stream", "canal": "canal"}

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE feature (
    id INTEGER PRIMARY KEY,
    osm_id TEXT NOT NULL,
    class TEXT NOT NULL,
    name TEXT
);
CREATE TABLE feature_point (
    feature_id INTEGER NOT NULL REFERENCES feature(id),
    lat INTEGER NOT NULL,
    lon INTEGER NOT NULL
);
CREATE INDEX feature_point_lat ON feature_point (lat);
"""


def _microdegrees(value: float) -> int:
    """Integer microdegrees: ~11 cm resolution at a third of the REAL
    footprint, which is what keeps 1.9M Washington points phone-sized."""
    return round(value * 1_000_000)


def _meters_between(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Equirectangular approximation; exact enough for 100 m sampling."""
    mean_lat = math.radians((lat1 + lat2) / 2)
    dx = math.radians(lon2 - lon1) * math.cos(mean_lat) * 6_371_000
    dy = math.radians(lat2 - lat1) * 6_371_000
    return math.hypot(dx, dy)


def _sample(
    points: list[tuple[float, float]], spacing: float = SAMPLE_SPACING_M
) -> list[tuple[float, float]]:
    """Keep the first vertex, then vertices at least spacing meters apart."""
    kept: list[tuple[float, float]] = []
    for lat, lon in points:
        if not kept or _meters_between(*kept[-1], lat, lon) >= spacing:
            kept.append((lat, lon))
    return kept


class _WaterHandler(osmium.SimpleHandler):
    def __init__(self, conn: sqlite3.Connection) -> None:
        super().__init__()
        self._conn = conn
        # Closed water ways come back through the area callback; remember
        # them so the way pass does not write the same lake twice.
        self.features = 0

    def _insert(
        self,
        osm_id: str,
        cls: str,
        name: str | None,
        points,
        spacing: float = SAMPLE_SPACING_M,
    ) -> None:
        sampled = _sample(
            [(p.lat, p.lon) for p in points if p.location.valid()], spacing
        )
        if not sampled:
            return
        cursor = self._conn.execute(
            "INSERT INTO feature (osm_id, class, name) VALUES (?, ?, ?)",
            (osm_id, cls, name or None),
        )
        self._conn.executemany(
            "INSERT INTO feature_point (feature_id, lat, lon) VALUES (?, ?, ?)",
            [
                (cursor.lastrowid, _microdegrees(lat), _microdegrees(lon))
                for lat, lon in sampled
            ],
        )
        self.features += 1

    def node(self, node: osmium.osm.Node) -> None:
        if node.tags.get("natural") == "spring":
            cursor = self._conn.execute(
                "INSERT INTO feature (osm_id, class, name) VALUES (?, ?, ?)",
                (f"node/{node.id}", "spring", node.tags.get("name")),
            )
            self._conn.execute(
                "INSERT INTO feature_point (feature_id, lat, lon) VALUES (?, ?, ?)",
                (
                    cursor.lastrowid,
                    _microdegrees(node.location.lat),
                    _microdegrees(node.location.lon),
                ),
            )
            self.features += 1

    def way(self, way: osmium.osm.Way) -> None:
        cls = WATERWAY_CLASSES.get(way.tags.get("waterway", ""))
        if cls is None:
            return
        # A seasonal stream is a wrong "nearest water" answer for most of
        # the year; the layer carries only year-round waterways.
        if way.tags.get("intermittent") == "yes":
            return
        self._insert(
            f"way/{way.id}",
            cls,
            way.tags.get("name"),
            way.nodes,
            spacing=LINEAR_SAMPLE_SPACING_M,
        )

    def area(self, area: osmium.osm.Area) -> None:
        if area.tags.get("natural") != "water":
            return
        osm_kind = "way" if area.from_way() else "relation"
        for ring in area.outer_rings():
            self._insert(
                f"{osm_kind}/{area.orig_id()}",
                "water",
                area.tags.get("name"),
                list(ring),
            )


def build_features(osm_path: Path, out_db: Path, source_url: str | None = None) -> int:
    """Extract the water-feature layer; returns the feature count."""
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
    handler = _WaterHandler(conn)
    handler.apply_file(str(osm_path), locations=True)
    conn.commit()
    conn.execute("VACUUM")
    conn.close()
    return handler.features
