"""Graph-window lookup over the trail artifact (#229).

TrailStore opens the #148 trails.db read-only (FLUX_TRAILS_DB) and serves
route corridors to the in-app router (#149): the nodes inside a bounding
box and the edges with both ends inside. The wire shape is compact arrays
rather than objects because a corridor carries thousands of rows.
"""

import os
import sqlite3
import threading
from pathlib import Path

# A corridor bigger than this answers 413; the client shrinks the box.
MAX_WINDOW_EDGES = 30_000


class WindowTooLargeError(ValueError):
    """The bounding box holds more than MAX_WINDOW_EDGES edges."""


class TrailStore:
    """Read-only view over one trails.db artifact."""

    def __init__(self, db_path: Path) -> None:
        self._conn = sqlite3.connect(
            f"file:{db_path}?mode=ro", uri=True, check_same_thread=False
        )
        self._lock = threading.Lock()
        self.meta: dict[str, str] = dict(
            self._conn.execute("SELECT key, value FROM meta")
        )

    def window(
        self, min_lat: float, max_lat: float, min_lon: float, max_lon: float
    ) -> dict:
        """Nodes in the box and edges with both ends in it, as flat arrays."""
        bounds = (
            round(min_lat * 1e6),
            round(max_lat * 1e6),
            round(min_lon * 1e6),
            round(max_lon * 1e6),
        )
        with self._lock:
            nodes = self._conn.execute(
                "SELECT id, lat, lon FROM node"
                " WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?",
                bounds,
            ).fetchall()
            ids = {row[0] for row in nodes}
            edges = [
                row
                for row in self._conn.execute(
                    "SELECT edge.a, edge.b, edge.distance_m FROM edge"
                    " JOIN node ON node.id = edge.a"
                    " WHERE node.lat BETWEEN ? AND ? AND node.lon BETWEEN ? AND ?",
                    bounds,
                )
                if row[1] in ids
            ]
        if len(edges) > MAX_WINDOW_EDGES:
            raise WindowTooLargeError(str(len(edges)))
        return {
            "nodes": [[row[0], row[1] / 1e6, row[2] / 1e6] for row in nodes],
            "edges": [list(row) for row in edges],
            "attribution": self.meta.get("attribution", ""),
        }


def trail_store_from_env() -> TrailStore | None:
    """Open the artifact named by FLUX_TRAILS_DB; unset means no graph."""
    db_path = os.environ.get("FLUX_TRAILS_DB")
    if db_path and Path(db_path).is_file():
        return TrailStore(Path(db_path))
    return None
