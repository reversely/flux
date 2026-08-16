"""Perception relay: flattening, honest gating, and the frame/results routes."""

import httpx
import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.perception import HttpPerception, NotConfiguredPerception

IDENTIFY_PAYLOAD = {
    "domain": "auto",
    "speciesnet": {
        "prediction": "uuid;mammalia;rodentia;sciuridae;tamiasciurus;douglasii;douglas's squirrel",
        "score": 0.91,
        "detections": [],
    },
    "bioclip": [
        {"label": "Tamiasciurus douglasii", "score": 0.83},
        {"label": "Sciurus griseus", "score": 0.11},
    ],
    "fungitastic": [],
}


class StubPerception:
    def __init__(self, records):
        self.records = records
        self.calls = 0

    def identify(self, image):
        self.calls += 1
        return self.records


def make_client(tmp_path, perception):
    app = create_app(
        data_dir=tmp_path / "data",
        content=None,
        tile_archive=None,
        walkthrough=None,
        coach_classifier=None,
        speech=None,
        perception=perception,
    )
    return TestClient(app)


def create_photo_session(client):
    response = client.post("/v1/sessions", json={"functionality": "plant_fungus_id"})
    return response.json()["session_id"]


def upload_frame(client, session_id):
    return client.post(
        f"/v1/sessions/{session_id}/frames",
        files={"frame": ("f.jpg", b"\xff\xd8jpeg", "image/jpeg")},
        data={"captured_at": "2026-08-16T00:00:00Z"},
    )


def test_http_perception_flattens_and_ranks() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=IDENTIFY_PAYLOAD)

    client = httpx.Client(transport=httpx.MockTransport(handle))
    records = HttpPerception("http://box:8100", http_client=client).identify(b"jpg")
    assert [r["source"] for r in records] == ["speciesnet", "bioclip", "bioclip"]
    assert records[0]["label"] == "douglas's squirrel"
    assert records[0]["score"] == pytest.approx(0.91)


def test_http_perception_error_returns_empty() -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    client = httpx.Client(transport=httpx.MockTransport(handle))
    assert HttpPerception("http://box:8100", http_client=client).identify(b"x") == []


def test_frame_upload_relays_records(tmp_path) -> None:
    records = [{"source": "bioclip", "label": "Tamiasciurus douglasii", "score": 0.8}]
    perception = StubPerception(records)
    client = make_client(tmp_path, perception)
    session_id = create_photo_session(client)
    response = upload_frame(client, session_id)
    assert response.status_code == 200
    assert response.json()["identifications"] == records
    assert perception.calls == 1
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results["identifications"] == records


def test_unconfigured_perception_keeps_results_empty(tmp_path) -> None:
    client = make_client(tmp_path, NotConfiguredPerception())
    session_id = create_photo_session(client)
    response = upload_frame(client, session_id)
    assert response.status_code == 200
    assert "identifications" not in response.json()
    results = client.get(f"/v1/sessions/{session_id}/results").json()
    assert results.get("identifications") is None
