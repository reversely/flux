"""Tests for the tile-archive endpoint: full reads, byte ranges, absence."""

from pathlib import Path

from fastapi.testclient import TestClient
from flux_server.main import create_app

ARCHIVE_BYTES = bytes(range(256)) * 4


def make_client(tmp_path: Path, archive: Path | None) -> TestClient:
    return TestClient(create_app(data_dir=tmp_path / "sessions", tile_archive=archive))


def write_archive(tmp_path: Path) -> Path:
    archive = tmp_path / "region.pmtiles"
    archive.write_bytes(ARCHIVE_BYTES)
    return archive


def test_full_fetch_serves_the_archive(tmp_path: Path) -> None:
    client = make_client(tmp_path, write_archive(tmp_path))
    response = client.get("/v1/tiles/archive")
    assert response.status_code == 200
    assert response.content == ARCHIVE_BYTES
    assert response.headers["accept-ranges"] == "bytes"


def test_range_fetch_returns_the_byte_window(tmp_path: Path) -> None:
    client = make_client(tmp_path, write_archive(tmp_path))
    response = client.get("/v1/tiles/archive", headers={"Range": "bytes=16-31"})
    assert response.status_code == 206
    assert response.content == ARCHIVE_BYTES[16:32]
    assert response.headers["content-range"] == f"bytes 16-31/{len(ARCHIVE_BYTES)}"


def test_open_ended_range_reads_to_the_end(tmp_path: Path) -> None:
    client = make_client(tmp_path, write_archive(tmp_path))
    response = client.get("/v1/tiles/archive", headers={"Range": "bytes=1000-"})
    assert response.status_code == 206
    assert response.content == ARCHIVE_BYTES[1000:]


def test_head_reports_the_archive_size(tmp_path: Path) -> None:
    client = make_client(tmp_path, write_archive(tmp_path))
    response = client.head("/v1/tiles/archive")
    assert response.status_code == 200
    assert response.headers["content-length"] == str(len(ARCHIVE_BYTES))
    assert response.content == b""


def test_unconfigured_archive_answers_503(tmp_path: Path) -> None:
    client = make_client(tmp_path, None)
    response = client.get("/v1/tiles/archive")
    assert response.status_code == 503
    assert response.json()["detail"] == "no base tile archive installed"


def test_missing_archive_file_answers_503_with_the_path(tmp_path: Path) -> None:
    absent = tmp_path / "absent.pmtiles"
    client = make_client(tmp_path, absent)
    response = client.get("/v1/tiles/archive")
    assert response.status_code == 503
    assert str(absent) in response.json()["detail"]


def test_per_layer_routes_serve_their_own_archives(tmp_path: Path) -> None:
    base = write_archive(tmp_path)
    terrain = tmp_path / "terrain.pmtiles"
    terrain.write_bytes(b"terrain-rgb" * 40)
    client = TestClient(
        create_app(
            data_dir=tmp_path / "sessions",
            tile_archive=base,
            terrain_archive=terrain,
        )
    )
    assert client.get("/v1/tiles/base/archive").content == ARCHIVE_BYTES
    assert client.get("/v1/tiles/terrain/archive").content == b"terrain-rgb" * 40
    # The legacy route keeps serving base, and ranges work per layer.
    assert client.get("/v1/tiles/archive").content == ARCHIVE_BYTES
    ranged = client.get("/v1/tiles/terrain/archive", headers={"Range": "bytes=0-6"})
    assert ranged.status_code == 206
    assert ranged.content == b"terrain"


def test_unset_terrain_layer_answers_503(tmp_path: Path) -> None:
    client = make_client(tmp_path, write_archive(tmp_path))
    response = client.get("/v1/tiles/terrain/archive")
    assert response.status_code == 503
    assert client.get("/v1/tiles/base/archive").status_code == 200


def test_unknown_layer_answers_404(tmp_path: Path) -> None:
    client = make_client(tmp_path, write_archive(tmp_path))
    assert client.get("/v1/tiles/roads/archive").status_code == 404
