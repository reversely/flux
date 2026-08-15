"""Schema-exact tests for the stub server's contract with the app."""

from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.canned import CANNED_FINDINGS, MIN_FRAMES_FOR_RESULTS
from flux_server.main import create_app
from flux_server.models import SEVERITY_ORDER
from flux_server.seed import seed_session
from PIL import Image

WIDTH, HEIGHT = 640, 480

PRD_FIELDS = {
    "joint_id",
    "bounding_box",
    "classification",
    "confidence",
    "severity",
    "supporting_frames",
    "capture_quality",
}


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
        data={"captured_at": "2026-08-14T00:00:00Z"},
    )
    assert response.status_code == 200
    return response.json()


def test_healthz(client: TestClient) -> None:
    assert client.get("/healthz").json() == {"ok": True}


def test_session_id_format(client: TestClient) -> None:
    assert create_session(client).startswith("sess_")


def test_results_withheld_below_frame_threshold(client: TestClient) -> None:
    session_id = create_session(client)
    for _ in range(MIN_FRAMES_FOR_RESULTS - 1):
        body = upload_frame(client, session_id)
        assert body["results"] == []
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["status"] == "in_progress"
    assert results["joints"] == []


def test_canned_results_match_prd_schema(client: TestClient) -> None:
    session_id = create_session(client)
    for _ in range(MIN_FRAMES_FOR_RESULTS):
        body = upload_frame(client, session_id)
    joints = body["results"]
    assert len(joints) == len(CANNED_FINDINGS)
    classifications = {joint["classification"] for joint in joints}
    assert classifications == {finding[0] for finding in CANNED_FINDINGS}
    for index, joint in enumerate(joints, start=1):
        assert set(joint) == PRD_FIELDS
        assert joint["joint_id"] == f"joint_{index:03d}"
        x1, y1, x2, y2 = joint["bounding_box"]
        assert 0 <= x1 < x2 <= WIDTH
        assert 0 <= y1 < y2 <= HEIGHT
        assert 0.0 <= joint["confidence"] <= 1.0
        assert joint["severity"] in SEVERITY_ORDER
        assert joint["supporting_frames"], "every finding links to a frame"


def test_results_endpoint_complete_and_frames_resolve(client: TestClient) -> None:
    session_id = create_session(client)
    for _ in range(MIN_FRAMES_FOR_RESULTS):
        upload_frame(client, session_id)
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["status"] == "complete"
    for joint in results["joints"]:
        for frame_id in joint["supporting_frames"]:
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


def test_seeded_session_serves_results(tmp_path: Path) -> None:
    session_id = seed_session(tmp_path)
    client = TestClient(create_app(data_dir=tmp_path))
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["status"] == "complete"
    assert len(results["joints"]) == len(CANNED_FINDINGS)
