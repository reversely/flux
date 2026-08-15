"""Tests for the bare stub contract with the app."""

from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from PIL import Image

WIDTH, HEIGHT = 640, 480


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    return TestClient(create_app(data_dir=tmp_path))


def jpeg_bytes(width: int = WIDTH, height: int = HEIGHT) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (width, height), (30, 90, 60)).save(buffer, format="JPEG")
    return buffer.getvalue()


def create_session(client: TestClient) -> str:
    response = client.post("/v1/sessions")
    assert response.status_code == 200
    return response.json()["session_id"]


def upload_frame(client: TestClient, session_id: str) -> dict:
    response = client.post(
        f"/v1/sessions/{session_id}/frames",
        files={"frame": ("frame.jpg", jpeg_bytes(), "image/jpeg")},
        data={"captured_at": "2026-08-15T00:00:00Z"},
    )
    assert response.status_code == 200
    return response.json()


def test_healthz(client: TestClient) -> None:
    assert client.get("/healthz").json() == {"ok": True}


def test_session_id_format(client: TestClient) -> None:
    assert create_session(client).startswith("sess_")


def test_uploads_store_frames_and_return_empty_results(client: TestClient) -> None:
    session_id = create_session(client)
    for index in range(1, 4):
        body = upload_frame(client, session_id)
        assert body["frame_id"] == f"frame_{index:03d}"
        assert body["results"] == []


def test_results_stay_empty_and_in_progress(client: TestClient) -> None:
    session_id = create_session(client)
    upload_frame(client, session_id)
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results == {
        "session_id": session_id,
        "status": "in_progress",
        "records": [],
        "summary": None,
        "detail": None,
    }


def test_uploaded_frame_is_served_back(client: TestClient) -> None:
    session_id = create_session(client)
    frame_id = upload_frame(client, session_id)["frame_id"]
    response = client.get(f"/v1/sessions/{session_id}/frames/{frame_id}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content.startswith(b"\xff\xd8")


def test_unknown_session_and_frame_return_404(client: TestClient) -> None:
    assert client.get("/v1/sessions/sess_missing/results").status_code == 404
    assert client.get("/v1/sessions/sess_missing/frames/frame_001").status_code == 404
    session_id = create_session(client)
    assert client.get(f"/v1/sessions/{session_id}/frames/frame_001").status_code == 404
    traversal = client.get(f"/v1/sessions/{session_id}/frames/..%2F..%2Fetc")
    assert traversal.status_code == 404
