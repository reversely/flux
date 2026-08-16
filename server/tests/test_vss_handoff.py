"""Tests for the VSS video handoff: finish trigger, mock mode, fake VSS."""

import json
import shutil
import subprocess
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.vss import (
    HandoffOutcome,
    NotConfiguredHandoff,
    VSSHandoff,
    answer_from_generate_value,
)

MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 32
SUMMARY_TEXT = "A creek crossing at minute two; standing water near the trail."
THINK_BLOCK = (
    "<agent-think><agent-think-step>listing sensors</agent-think-step>"
    "<agent-think-step>watching the clip</agent-think-step></agent-think>"
)


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
    """In-memory VSS 3.2 agent API served through an httpx MockTransport.

    Serves the three-step upload contract (upload-URL grant, multipart
    storage POST naming the sensor, /generate with agent-think markup) and
    sensor deletion. Deletes fail with 500 until `delete_failures` runs out,
    exercising the PRD 3.5 delete-retry path.
    """

    def __init__(self, delete_failures: int = 0) -> None:
        self.granted_filenames: list[str] = []
        self.uploaded_filenames: list[str] = []
        self.sensor_ids: list[str] = []
        self.generate_messages: list[str] = []
        self.deleted: list[str] = []
        self.delete_attempts = 0
        self._delete_failures = delete_failures

    def handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "POST" and path == "/api/v1/videos":
            self.granted_filenames.append(json.loads(request.content)["filename"])
            return httpx.Response(
                200, json={"url": "http://vss.test/vst/api/v1/storage/file"}
            )
        if request.method == "POST" and path == "/vst/api/v1/storage/file":
            filename = _multipart_filename(request)
            self.uploaded_filenames.append(filename)
            sensor_id = f"sensor-{len(self.uploaded_filenames)}"
            self.sensor_ids.append(sensor_id)
            return httpx.Response(200, json={"id": filename, "sensorId": sensor_id})
        if request.method == "POST" and path == "/generate":
            message = json.loads(request.content)["input_message"]
            self.generate_messages.append(message)
            return httpx.Response(
                200, json={"value": f"{THINK_BLOCK}\n\n{SUMMARY_TEXT}\n\n"}
            )
        if request.method == "DELETE" and path.startswith("/vst/api/v1/sensor/"):
            self.delete_attempts += 1
            if self._delete_failures > 0:
                self._delete_failures -= 1
                return httpx.Response(500, json={"detail": "pending"})
            self.deleted.append(path.removeprefix("/vst/api/v1/sensor/"))
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


def _multipart_filename(request: httpx.Request) -> str:
    marker = b'filename="'
    body = request.read()
    start = body.index(marker) + len(marker)
    return body[start : body.index(b'"', start)].decode()


def test_answer_from_generate_value_strips_think_markup() -> None:
    assert (
        answer_from_generate_value(f"{THINK_BLOCK}\n\n{SUMMARY_TEXT}\n\n")
        == SUMMARY_TEXT
    )


def test_answer_from_generate_value_passes_bare_text_through() -> None:
    assert answer_from_generate_value(f"  {SUMMARY_TEXT} ") == SUMMARY_TEXT


def test_quicktime_upload_is_remuxed_to_mp4(tmp_path: Path) -> None:
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg not installed")
    clip = tmp_path / "clip.mov"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=1:size=64x64:rate=2",
            "-f",
            "mov",
            str(clip),
        ],
        check=True,
    )
    mov_bytes = clip.read_bytes()
    assert mov_bytes[8:12] == b"qt  "
    client = make_client(tmp_path / "data", NotConfiguredHandoff())
    session_id = create_session(client)
    response = client.post(
        f"/v1/sessions/{session_id}/videos",
        files={"video": ("clip.mov", mov_bytes, "video/quicktime")},
        data={"captured_at": "2026-08-15T00:00:00Z"},
    )
    assert response.status_code == 200
    stored = (tmp_path / "data" / session_id / "video_001.mp4").read_bytes()
    assert stored[4:8] == b"ftyp"
    assert stored[8:12] != b"qt  "


def test_unreadable_quicktime_upload_is_rejected(tmp_path: Path) -> None:
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg not installed")
    client = make_client(tmp_path, NotConfiguredHandoff())
    session_id = create_session(client)
    broken = b"\x00\x00\x00\x14ftypqt  " + b"\x00" * 16
    response = client.post(
        f"/v1/sessions/{session_id}/videos",
        files={"video": ("clip.mov", broken, "video/quicktime")},
        data={"captured_at": "2026-08-15T00:00:00Z"},
    )
    assert response.status_code == 422
    assert "unreadable video container" in response.json()["detail"]


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
    assert "POST /api/v1/videos" in handoff.recorded[0]["requests"]


def test_finish_forwards_to_vss_and_stores_summary(tmp_path: Path) -> None:
    fake = FakeVSS()
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    response = client.post(f"/v1/sessions/{session_id}/finish")
    assert response.json() == {"session_id": session_id, "status": "complete"}
    assert fake.granted_filenames == [f"{session_id}_video_001.mp4"]
    assert fake.uploaded_filenames == [f"{session_id}_video_001.mp4"]
    assert len(fake.generate_messages) == 1
    assert "sensor-1" in fake.generate_messages[0]
    assert fake.deleted == ["sensor-1"]
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
    assert fake.uploaded_filenames == [
        f"{session_id}_video_001.mp4",
        f"{session_id}_video_002.mp4",
    ]
    assert fake.deleted == ["sensor-1", "sensor-2"]
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["summary"] == f"{SUMMARY_TEXT}\n\n{SUMMARY_TEXT}"


def test_delete_retries_until_it_succeeds(tmp_path: Path) -> None:
    fake = FakeVSS(delete_failures=2)
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    client.post(f"/v1/sessions/{session_id}/finish")
    assert fake.delete_attempts == 3
    assert fake.deleted == ["sensor-1"]


def test_finish_is_idempotent(tmp_path: Path) -> None:
    fake = FakeVSS()
    client = make_client(tmp_path, fake.handoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    client.post(f"/v1/sessions/{session_id}/finish")
    again = client.post(f"/v1/sessions/{session_id}/finish")
    assert again.json() == {"session_id": session_id, "status": "complete"}
    assert fake.uploaded_filenames == [f"{session_id}_video_001.mp4"]


def test_vss_failure_reports_failed_without_fabricating(tmp_path: Path) -> None:
    def broken(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path == "/api/v1/videos":
            return httpx.Response(
                200, json={"url": "http://vss.test/vst/api/v1/storage/file"}
            )
        if request.url.path == "/vst/api/v1/storage/file":
            return httpx.Response(200, json={"id": "f", "sensorId": "sensor-1"})
        if request.url.path == "/generate":
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


@pytest.mark.parametrize("env_value", [None, "http://gn100.local:8000"])
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


class StubAskHandoff:
    """Scripted ask/summarize outcomes with recorded calls."""

    def __init__(self) -> None:
        self.asked: list[tuple[str, str]] = []

    def summarize_session(self, session_id, videos, progress=None, transcript=None):
        if progress is not None:
            for video in videos:
                progress(video.name, "summarizing")
                progress(video.name, "done")
        return HandoffOutcome(status="complete", summary="ok")

    def ask_session(self, session_id, videos, question):
        self.asked.append((session_id, question))
        return HandoffOutcome(status="complete", summary="Water is 400 m back.")


def test_ask_answers_over_a_recorded_session(tmp_path: Path) -> None:
    handoff = StubAskHandoff()
    client = make_client(tmp_path, handoff)
    session_id = create_session(client)
    upload_video(client, session_id)
    response = client.post(
        f"/v1/sessions/{session_id}/ask", json={"question": "any water sources?"}
    )
    assert response.status_code == 200
    assert response.json() == {
        "session_id": session_id,
        "answer": "Water is 400 m back.",
    }
    assert handoff.asked == [(session_id, "any water sources?")]


def test_ask_without_videos_is_409(tmp_path: Path) -> None:
    client = make_client(tmp_path, StubAskHandoff())
    session_id = create_session(client)
    response = client.post(f"/v1/sessions/{session_id}/ask", json={"question": "q"})
    assert response.status_code == 409


def test_ask_unconfigured_is_503(tmp_path: Path) -> None:
    client = make_client(tmp_path, NotConfiguredHandoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    response = client.post(f"/v1/sessions/{session_id}/ask", json={"question": "q"})
    assert response.status_code == 503


def test_finish_exposes_per_clip_ingest_states(tmp_path: Path) -> None:
    client = make_client(tmp_path, StubAskHandoff())
    session_id = create_session(client)
    upload_video(client, session_id)
    client.post(f"/v1/sessions/{session_id}/finish")
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["ingest"] == [{"video": "video_001.mp4", "state": "done"}]
