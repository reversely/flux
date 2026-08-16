"""Encode the staged 3DEP GeoTIFFs as a terrain-RGB MBTiles set (#78).

Pure rasterio, no GDAL binaries: each source DEM opens once behind a
WarpedVRT into EPSG:3857, and every XYZ tile merges its window from the
overlapping VRTs at tile resolution with bilinear resampling. Elevation
encodes per the Mapbox terrain-RGB convention (base -10000 m, 0.1 m
interval), which MapLibre's raster-dem source decodes client-side, so the
same archive later backs the altitude grid. Nodata encodes as 0 m.

Run on the GN100 from the terrain venv, then convert:

    ~/flux/venvs/terrain/bin/python build_terrain_pmtiles.py \
        ~/flux/data/regions/washington/elevation wa-terrain.mbtiles
    ~/flux/bin/pmtiles convert wa-terrain.mbtiles wa-terrain.pmtiles
"""

import io
import math
import os
import sqlite3
import sys
import time
from pathlib import Path

import mercantile
import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.merge import merge
from rasterio.vrt import WarpedVRT

MIN_ZOOM = int(os.environ.get("TERRAIN_MIN_ZOOM", "5"))
MAX_ZOOM = int(os.environ.get("TERRAIN_MAX_ZOOM", "12"))
TILE_SIZE = 256
MERCATOR = "EPSG:3857"


def encode_terrain_rgb(elevation: np.ndarray) -> np.ndarray:
    value = np.round((elevation + 10_000.0) / 0.1).astype(np.uint32)
    rgb = np.empty((*elevation.shape, 3), dtype=np.uint8)
    rgb[..., 0] = (value >> 16) & 0xFF
    rgb[..., 1] = (value >> 8) & 0xFF
    rgb[..., 2] = value & 0xFF
    return rgb


def open_vrts(dem_dir: Path) -> list[WarpedVRT]:
    tifs = sorted(dem_dir.glob("**/*.tif"))
    if not tifs:
        raise SystemExit(f"no GeoTIFFs under {dem_dir}")
    print(f"{len(tifs)} DEMs")
    return [
        WarpedVRT(rasterio.open(t), crs=MERCATOR, resampling=Resampling.bilinear)
        for t in tifs
    ]


def union_bounds(vrts: list[WarpedVRT]) -> tuple[float, float, float, float]:
    lefts, bottoms, rights, tops = zip(*(v.bounds for v in vrts))
    return min(lefts), min(bottoms), max(rights), max(tops)


def main(dem_dir: Path, out_path: Path) -> None:
    vrts = open_vrts(dem_dir)
    web_bounds = union_bounds(vrts)
    out_path.unlink(missing_ok=True)
    db = sqlite3.connect(out_path)
    db.executescript(
        "CREATE TABLE metadata (name TEXT, value TEXT);"
        "CREATE TABLE tiles (zoom_level INTEGER, tile_column INTEGER,"
        " tile_row INTEGER, tile_data BLOB);"
        "CREATE UNIQUE INDEX tile_index ON tiles"
        " (zoom_level, tile_column, tile_row);"
    )
    lnglat = _lnglat(web_bounds)
    written = 0
    started = time.monotonic()
    for zoom in range(MIN_ZOOM, MAX_ZOOM + 1):
        tiles = list(mercantile.tiles(*lnglat, zoom))
        for tile in tiles:
            b = mercantile.xy_bounds(tile)
            res = (b.right - b.left) / TILE_SIZE
            sources = [
                v
                for v in vrts
                if not (
                    v.bounds.left >= b.right
                    or v.bounds.right <= b.left
                    or v.bounds.bottom >= b.top
                    or v.bounds.top <= b.bottom
                )
            ]
            if not sources:
                continue
            mosaic, _ = merge(
                sources,
                bounds=(b.left, b.bottom, b.right, b.top),
                res=res,
                nodata=np.nan,
                resampling=Resampling.bilinear,
            )
            elevation = mosaic[0][:TILE_SIZE, :TILE_SIZE]
            if np.all(np.isnan(elevation)):
                continue
            if elevation.shape != (TILE_SIZE, TILE_SIZE):
                padded = np.full((TILE_SIZE, TILE_SIZE), np.nan, dtype=elevation.dtype)
                padded[: elevation.shape[0], : elevation.shape[1]] = elevation
                elevation = padded
            elevation = np.nan_to_num(elevation, nan=0.0)
            png = Image.fromarray(encode_terrain_rgb(elevation))
            buf = io.BytesIO()
            png.save(buf, format="PNG", optimize=False)
            db.execute(
                "INSERT INTO tiles VALUES (?, ?, ?, ?)",
                (zoom, tile.x, (1 << zoom) - 1 - tile.y, buf.getvalue()),
            )
            written += 1
        db.commit()
        print(f"z{zoom}: {written} tiles total, {time.monotonic() - started:.0f}s")
    lng_w, lat_s, lng_e, lat_n = lnglat
    for name, value in [
        ("name", "flux-wa-terrain"),
        ("format", "png"),
        ("type", "baselayer"),
        ("encoding", "mapbox"),
        ("description", "USGS 3DEP 10 m terrain-RGB, Washington (#78)"),
        ("minzoom", str(MIN_ZOOM)),
        ("maxzoom", str(MAX_ZOOM)),
        ("bounds", f"{lng_w},{lat_s},{lng_e},{lat_n}"),
        ("center", f"{(lng_w + lng_e) / 2},{(lat_s + lat_n) / 2},{MIN_ZOOM}"),
    ]:
        db.execute("INSERT INTO metadata VALUES (?, ?)", (name, value))
    db.commit()
    db.close()
    print(f"wrote {written} tiles -> {out_path}")


def _lnglat(web_bounds: tuple[float, float, float, float]):
    def to_lng(x: float) -> float:
        return x / 6378137.0 * 180.0 / math.pi

    def to_lat(y: float) -> float:
        return math.degrees(2 * math.atan(math.exp(y / 6378137.0)) - math.pi / 2)

    left, bottom, right, top = web_bounds
    return to_lng(left), to_lat(bottom), to_lng(right), to_lat(top)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
