"""Tests for the media-mode contract: declaration, storage, and rejection."""

from pathlib import Path

from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.models import FUNCTIONALITY_MEDIA_MODE
from flux_server.vss import NotConfiguredHandoff

MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 32
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 16


def make_client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(data_dir=tmp_path, handoff=NotConfiguredHandoff()))


def post_frame(client: TestClient, session_id: str):
    return client.post(
        f"/v1/sessions/{session_id}/frames",
        files={"frame": ("still.jpg", JPEG_BYTES, "image/jpeg")},
        data={"captured_at": "2026-08-15T00:00:00Z"},
    )


def post_video(client: TestClient, session_id: str):
    return client.post(
        f"/v1/sessions/{session_id}/videos",
        files={"video": ("hike.mp4", MP4_BYTES, "video/mp4")},
        data={"captured_at": "2026-08-15T00:00:00Z"},
    )


def test_functionality_listing_matches_the_registry(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    listed = client.get("/v1/functionalities").json()["functionalities"]
    assert {
        entry["functionality"]: entry["media_mode"] for entry in listed
    } == FUNCTIONALITY_MEDIA_MODE


def test_session_creation_declares_the_media_mode(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    created = client.post("/v1/sessions", json={"functionality": "trail_memory"}).json()
    assert created["functionality"] == "trail_memory"
    assert created["media_mode"] == "video"


def test_unknown_functionality_is_rejected(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    response = client.post("/v1/sessions", json={"functionality": "time_travel"})
    assert response.status_code == 422
    assert "unknown functionality" in response.json()["detail"]


def test_photo_session_rejects_video_uploads(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    session_id = client.post(
        "/v1/sessions", json={"functionality": "plant_fungus_id"}
    ).json()["session_id"]
    assert post_frame(client, session_id).status_code == 200
    response = post_video(client, session_id)
    assert response.status_code == 415
    assert "photo mode" in response.json()["detail"]


def test_video_session_rejects_frame_uploads(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    session_id = client.post("/v1/sessions", json={"functionality": "coaching"}).json()[
        "session_id"
    ]
    assert post_video(client, session_id).status_code == 200
    response = post_frame(client, session_id)
    assert response.status_code == 415
    assert "video mode" in response.json()["detail"]


def test_undeclared_session_accepts_both_kinds(tmp_path: Path) -> None:
    client = make_client(tmp_path)
    created = client.post("/v1/sessions").json()
    assert "media_mode" not in created
    session_id = created["session_id"]
    assert post_frame(client, session_id).status_code == 200
    assert post_video(client, session_id).status_code == 200
