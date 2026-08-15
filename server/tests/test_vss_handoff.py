"""Tests for the VSS video handoff: finish trigger, mock mode, fake VSS."""

import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.vss import NotConfiguredHandoff, VSSHandoff

MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 32
SUMMARY_TEXT = "A creek crossing at minute two; standing water near the trail."


def make_client(tmp_path: Path, handoff) -> TestClient:
    return TestClient(create_app(data_dir=tmp_path, handoff=handoff))


def create_session(client: TestClient) -> str:
    return client.post("/v1/sessions").json()["session_id"]


def upload_video(client: TestClient, session_id: str) -> str:
    response = client.post(
        f"/v1/sessions/{session_id}/videos",
        files={"video": ("hike.mp4", MP4_BYTES, "video/mp4")},
        data={"captured_at": "2026-08-15T00:00:00Z"},
    )
    assert response.status_code == 200
    return response.json()["video_id"]


class FakeVSS:
    """In-memory VSS served through an httpx MockTransport.

    Deletes fail with 500 until `delete_failures` runs out, exercising the
    PRD 3.5 delete-retry path.
    """

    def __init__(self, delete_failures: int = 0) -> None:
        self.uploads: list[str] = []
        self.summarize_ids: list[str] = []
        self.deleted: list[str] = []
        self.delete_attempts = 0
        self._delete_failures = delete_failures

    def handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "POST" and path == "/files":
            file_id = f"file-{len(self.uploads) + 1}"
            self.uploads.append(file_id)
            return httpx.Response(200, json={"id": file_id})
        if request.method == "POST" and path == "/summarize":
            body = json.loads(request.content)
            self.summarize_ids.append(body["id"])
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": SUMMARY_TEXT}}]},
            )
        if request.method == "DELETE" and path.startswith("/files/"):
            self.delete_attempts += 1
            if self._delete_failures > 0:
                self._delete_failures -= 1
                return httpx.Response(500, json={"detail": "pending"})
            self.deleted.append(path.removeprefix("/files/"))
            return httpx.Response(200, json={})
        return httpx.Response(404)

    def handoff(self) -> VSSHandoff:
        client = httpx.Client(
            transport=httpx.MockTransport(self.handle),
            base_url="http://vss.test",
        )
        return VSSHandoff(
            base_url="http://vss.test",
            http_client=client,
            delete_retry_delay_s=0.0,
        )


def test_video_upload_stores_numbered_mp4s(tmp_path: Path) -> None:
    client = make_client(tmp_path, NotConfiguredHandoff())
    session_id = create_session(client)
    assert upload_video(client, session_id) == "video_001"
    assert upload_video(client, session_id) == "video_002"
    assert (tmp_path / session_id / "video_001.mp4").read_bytes() == MP4_BYTES


def test_finish_requires_session_and_videos(tmp_path: Path) -> None:
    client = make_client(tmp_path, NotConfiguredHandoff())
    assert client.post("/v1/sessions/sess_missing/finish").status_code == 404
    session_id = create_session(client)
    assert client.post(f"/v1/sessions/{session_id}/finish").status_code == 409


def test_mock_mode_records_intent_and_stays_in_progress(tmp_path: Path) -> None:
    handoff = NotConfiguredHandoff()
    client = make_client(tmp_path, handoff)
    session_id = create_session(client)
    upload_video(client, session_id)
    response = client.post(f"/v1/sessions/{session_id}/finish")
    assert response.json() == {"session_id": session_id, "status": "in_progress"}
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["status"] == "in_progress"
    assert results["summary"] is None
    assert len(handoff.recorded) == 1
    assert handoff.recorded[0]["session_id"] == session_id
    assert "POST /files" in handoff.recorded[0]["requests"]


def test_finish_forwards_to_vss_and_stores_summary(tmp_path: Path) -> None:
    fake = FakeVSS()
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    response = client.post(f"/v1/sessions/{session_id}/finish")
    assert response.json() == {"session_id": session_id, "status": "complete"}
    assert fake.uploads == ["file-1"]
    assert fake.summarize_ids == ["file-1"]
    assert fake.deleted == ["file-1"]
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["status"] == "complete"
    assert results["summary"] == SUMMARY_TEXT


def test_multiple_videos_join_summaries(tmp_path: Path) -> None:
    fake = FakeVSS()
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    upload_video(client, session_id)
    client.post(f"/v1/sessions/{session_id}/finish")
    assert fake.uploads == ["file-1", "file-2"]
    assert fake.deleted == ["file-1", "file-2"]
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["summary"] == f"{SUMMARY_TEXT}\n\n{SUMMARY_TEXT}"


def test_delete_retries_until_it_succeeds(tmp_path: Path) -> None:
    fake = FakeVSS(delete_failures=2)
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    client.post(f"/v1/sessions/{session_id}/finish")
    assert fake.delete_attempts == 3
    assert fake.deleted == ["file-1"]


def test_finish_is_idempotent(tmp_path: Path) -> None:
    fake = FakeVSS()
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    client.post(f"/v1/sessions/{session_id}/finish")
    again = client.post(f"/v1/sessions/{session_id}/finish")
    assert again.json() == {"session_id": session_id, "status": "complete"}
    assert fake.uploads == ["file-1"]


def test_vss_failure_reports_failed_without_fabricating(tmp_path: Path) -> None:
    def broken(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/files":
            return httpx.Response(200, json={"id": "file-1"})
        if request.url.path == "/summarize":
            return httpx.Response(500, json={"detail": "vlm crashed"})
        return httpx.Response(200, json={})

    handoff = VSSHandoff(
        base_url="http://vss.test",
        http_client=httpx.Client(transport=httpx.MockTransport(broken)),
        delete_retry_delay_s=0.0,
    )
    client = make_client(tmp_path, handoff)
    session_id = create_session(client)
    upload_video(client, session_id)
    response = client.post(f"/v1/sessions/{session_id}/finish")
    assert response.json() == {"session_id": session_id, "status": "failed"}
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["status"] == "failed"
    assert results["summary"] is None
    assert "500" in results["detail"]


@pytest.mark.parametrize("env_value", [None, "http://gn100.local:8100"])
def test_handoff_from_env(
    monkeypatch: pytest.MonkeyPatch, env_value: str | None
) -> None:
    from flux_server.vss import handoff_from_env

    if env_value is None:
        monkeypatch.delenv("VSS_BASE_URL", raising=False)
        assert isinstance(handoff_from_env(), NotConfiguredHandoff)
    else:
        monkeypatch.setenv("VSS_BASE_URL", env_value)
        handoff = handoff_from_env()
        assert isinstance(handoff, VSSHandoff)
        assert handoff.base_url == env_value
