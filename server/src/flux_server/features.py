"""Nearest-feature lookup over the water layer artifact (#226).

FeatureStore opens the #222 features.db read-only (FLUX_FEATURES_DB) and
answers "what is the nearest water" for the map ask (#223). The scan runs
expanding square windows over the lat index in microdegrees; a window's
best hit is accepted only when it is closer than the window half-size, so
a feature just outside a sparse window cannot be shadowed by a farther
one inside it.
"""

import math
import os
import sqlite3
import threading
from pathlib import Path

EARTH_RADIUS_M = 6_371_000

# Window half-sizes in degrees: ~2 km, ~22 km, ~220 km.
WINDOWS_DEG = (0.02, 0.2, 2.0)

DEFAULT_CLASSES = ("water", "river", "stream", "canal", "spring")


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


class FeatureStore:
    """Read-only view over one features.db artifact."""

    def __init__(self, db_path: Path) -> None:
        self._conn = sqlite3.connect(
            f"file:{db_path}?mode=ro", uri=True, check_same_thread=False
        )
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self.meta: dict[str, str] = dict(
            self._conn.execute("SELECT key, value FROM meta")
        )

    def _window_rows(
        self, lat: float, lon: float, half_deg: float, classes: tuple[str, ...]
    ) -> list[sqlite3.Row]:
        lat_c, lon_c = round(lat * 1e6), round(lon * 1e6)
        half = round(half_deg * 1e6)
        marks = ",".join("?" for _ in classes)
        with self._lock:
            return self._conn.execute(
                "SELECT feature.id, feature.class, feature.name,"
                " feature_point.lat, feature_point.lon"
                " FROM feature_point JOIN feature"
                " ON feature.id = feature_point.feature_id"
                f" WHERE feature.class IN ({marks})"
                " AND feature_point.lat BETWEEN ? AND ?"
                " AND feature_point.lon BETWEEN ? AND ?",
                (*classes, lat_c - half, lat_c + half, lon_c - half, lon_c + half),
            ).fetchall()

    def nearest(
        self,
        lat: float,
        lon: float,
        classes: tuple[str, ...] = DEFAULT_CLASSES,
        limit: int = 3,
    ) -> list[dict]:
        """The nearest features of the asked classes, one hit per feature."""
        for half_deg in WINDOWS_DEG:
            best: dict[int, dict] = {}
            for row in self._window_rows(lat, lon, half_deg, classes):
                point_lat, point_lon = row["lat"] / 1e6, row["lon"] / 1e6
                distance = _haversine_m(lat, lon, point_lat, point_lon)
                seen = best.get(row["id"])
                if seen is None or distance < seen["distance_m"]:
                    best[row["id"]] = {
                        "feature_class": row["class"],
                        "name": row["name"],
                        "distance_m": round(distance),
                        "bearing_deg": round(
                            _bearing_deg(lat, lon, point_lat, point_lon)
                        ),
                        "lat": point_lat,
                        "lon": point_lon,
                    }
            hits = sorted(best.values(), key=lambda hit: hit["distance_m"])[:limit]
            # A hit farther than the window half-size may be beaten by a
            # feature outside the window; expand instead of answering.
            window_m = half_deg * 111_000
            if hits and hits[0]["distance_m"] <= window_m:
                return hits
        return hits


def feature_store_from_env() -> FeatureStore | None:
    """Open the artifact named by FLUX_FEATURES_DB; unset means no layer."""
    db_path = os.environ.get("FLUX_FEATURES_DB")
    if db_path and Path(db_path).is_file():
        return FeatureStore(Path(db_path))
    return None
