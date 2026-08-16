"""Coach sessions: pointer rule, clip classification route, error paths."""

import shutil
import subprocess

import pytest
from fastapi.testclient import TestClient
from flux_server.coach import KNOTS, CoachKnot, advance_pointer
from flux_server.main import create_app


class ScriptedClassifier:
    """Returns a scripted prediction per clip, recording what it saw."""

    def __init__(self, script: list[int | None]) -> None:
        self.script = list(script)
        self.calls: list[tuple[str, int]] = []

    def classify(self, knot: CoachKnot, frames: list[bytes]) -> int | None:
        self.calls.append((knot.id, len(frames)))
        return self.script.pop(0)


def make_clip() -> bytes:
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg not installed")
    result = subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=2:size=64x64:rate=2",
            "-f",
            "mp4",
            "-movflags",
            "frag_keyframe+empty_moov",
            "-",
        ],
        capture_output=True,
        check=True,
    )
    return result.stdout


@pytest.fixture
def client_and_classifier(tmp_path):
    classifier = ScriptedClassifier([])
    app = create_app(
        data_dir=tmp_path / "data",
        content=None,
        tile_archive=None,
        walkthrough=None,
        coach_classifier=classifier,
    )
    return TestClient(app), classifier


def test_pointer_advances_on_two_agreeing_later_predictions():
    assert advance_pointer([0, 1, 1], 4) == 1
    assert advance_pointer([0, 1, 1, 3, 3], 4) == 3


def test_pointer_holds_on_single_votes_and_never_regresses():
    assert advance_pointer([0, 1, 2, 1, 3], 4) == 0
    assert advance_pointer([1, 1, 0, 0, 0], 4) == 1


def test_pointer_ignores_none_and_out_of_range():
    assert advance_pointer([None, None], 4) == 0
    assert advance_pointer([9, 9], 4) == 0


def test_create_session_returns_steps(client_and_classifier):
    client, _ = client_and_classifier
    response = client.post("/v1/coach/sessions", json={"knot": "bowline"})
    assert response.status_code == 200
    state = response.json()
    assert state["step"] == 0
    assert len(state["steps"]) == len(KNOTS["bowline"].steps)
    assert state["steps"][0]["screen"]
    assert state["steps"][0]["voice"]


def test_create_session_rejects_unknown_knot(client_and_classifier):
    client, _ = client_and_classifier
    response = client.post("/v1/coach/sessions", json={"knot": "granny"})
    assert response.status_code == 422


def test_clips_drive_the_pointer(client_and_classifier):
    client, classifier = client_and_classifier
    classifier.script = [1, 1, 2]
    session_id = client.post("/v1/coach/sessions", json={"knot": "square"}).json()[
        "session_id"
    ]
    clip = make_clip()

    first = client.post(
        f"/v1/coach/sessions/{session_id}/clip",
        files={"video": ("clip.mp4", clip, "video/mp4")},
    ).json()
    assert first["prediction"] == 1
    assert (first["step"], first["advanced"]) == (0, False)
    assert first["trace"]["latency_ms"] >= 0

    second = client.post(
        f"/v1/coach/sessions/{session_id}/clip",
        files={"video": ("clip.mp4", clip, "video/mp4")},
    ).json()
    assert (second["prediction"], second["step"], second["advanced"]) == (1, 1, True)

    third = client.post(
        f"/v1/coach/sessions/{session_id}/clip",
        files={"video": ("clip.mp4", clip, "video/mp4")},
    ).json()
    assert (third["prediction"], third["step"], third["advanced"]) == (2, 1, False)

    # The classifier saw sampled frames, not the raw container.
    assert classifier.calls[0][0] == "square"
    assert 1 <= classifier.calls[0][1] <= 8

    state = client.get(f"/v1/coach/sessions/{session_id}").json()
    assert state["step"] == 1


def test_clip_rejects_unreadable_bytes(client_and_classifier):
    client, classifier = client_and_classifier
    classifier.script = [0]
    session_id = client.post("/v1/coach/sessions", json={"knot": "bowline"}).json()[
        "session_id"
    ]
    if shutil.which("ffmpeg") is None:
        pytest.skip("ffmpeg not installed")
    response = client.post(
        f"/v1/coach/sessions/{session_id}/clip",
        files={"video": ("clip.mp4", b"not a video", "video/mp4")},
    )
    assert response.status_code == 422


def test_clip_without_classifier_is_503(tmp_path):
    app = create_app(
        data_dir=tmp_path / "data",
        content=None,
        tile_archive=None,
        walkthrough=None,
        coach_classifier=None,
    )
    client = TestClient(app)
    session_id = client.post("/v1/coach/sessions", json={"knot": "bowline"}).json()[
        "session_id"
    ]
    response = client.post(
        f"/v1/coach/sessions/{session_id}/clip",
        files={"video": ("clip.mp4", b"x", "video/mp4")},
    )
    assert response.status_code == 503


def test_unknown_session_is_404(client_and_classifier):
    client, _ = client_and_classifier
    assert client.get("/v1/coach/sessions/nope").status_code == 404
