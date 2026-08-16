"""Speech routes: relay, utterance mapping gate, narration cache, WS stream."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.speech import Synthesis, Transcription, map_utterance


class FakeStream:
    """Scripted box stream: partials per chunk, one final on finish."""

    def __init__(self, script: list[str]) -> None:
        self.script = list(script)
        self.received: list[bytes] = []
        self.closed = False
        self.finished = False

    async def send(self, chunk: bytes) -> None:
        self.received.append(chunk)

    async def finish(self) -> None:
        self.finished = True

    async def events(self):
        for text in self.script[:-1]:
            yield {"type": "partial", "text": text}
        yield {
            "type": "final",
            "text": self.script[-1],
            "engine": "parakeet",
            "model": "parakeet-tdt-0.6b-v3",
            "latency_ms": 42,
        }

    async def close(self) -> None:
        self.closed = True


class FakeSpeech:
    """Returns scripted transcripts and canned audio, recording calls."""

    def __init__(self, transcripts: list[str]) -> None:
        self.transcripts = list(transcripts)
        self.synthesized: list[tuple[str, str | None]] = []
        self.streams: list[FakeStream] = []

    def transcribe(self, audio: bytes, engine: str) -> Transcription:
        return Transcription(
            text=self.transcripts.pop(0),
            engine=engine,
            model="parakeet-tdt-0.6b-v3"
            if engine == "parakeet"
            else "faster-whisper-large-v3",
            latency_ms=17,
        )

    def synthesize(self, text: str, voice: str | None) -> Synthesis:
        self.synthesized.append((text, voice))
        return Synthesis(
            audio=b"RIFFfake",
            media_type="audio/wav",
            model="kokoro-82m",
            voice=voice or "af_heart",
            latency_ms=120,
        )

    def stream(self, engine: str) -> FakeStream:
        stream = FakeStream(["wrap the", "wrap the tag end"])
        self.streams.append(stream)
        return stream


def make_client(
    tmp_path: Path, fake: FakeSpeech | None, walkthrough=None
) -> TestClient:
    app = create_app(
        data_dir=tmp_path / "data",
        content=None,
        tile_archive=None,
        walkthrough=walkthrough,
        coach_classifier=None,
        speech=fake,
    )
    return TestClient(app)


def post_utterance(client: TestClient, path: str, engine: str | None = None):
    data = {} if engine is None else {"engine": engine}
    return client.post(
        path, files={"audio": ("u.wav", b"fake-wav", "audio/wav")}, data=data
    )


def test_transcription_carries_trace(tmp_path):
    client = make_client(tmp_path, FakeSpeech(["go back"]))
    body = post_utterance(client, "/v1/speech/transcriptions", engine="whisper").json()
    assert body["text"] == "go back"
    assert body["trace"] == {
        "engine": "whisper",
        "model": "faster-whisper-large-v3",
        "latency_ms": 17,
    }


def test_speech_routes_503_when_unconfigured(tmp_path):
    client = make_client(tmp_path, None)
    assert post_utterance(client, "/v1/speech/transcriptions").status_code == 503
    assert client.post("/v1/speech/narrations", json={"text": "hi"}).status_code == 503


def test_narration_synthesizes_once_and_serves_audio(tmp_path):
    fake = FakeSpeech([])
    client = make_client(tmp_path, fake)
    first = client.post("/v1/speech/narrations", json={"text": "Are the gills free?"})
    again = client.post("/v1/speech/narrations", json={"text": "Are the gills free?"})
    assert first.status_code == 200
    assert again.json() == first.json()
    assert len(fake.synthesized) == 1  # content-addressed cache
    body = first.json()
    assert body["trace"]["model"] == "kokoro-82m"
    audio = client.get(body["audio_url"])
    assert audio.status_code == 200
    assert audio.content == b"RIFFfake"
    assert audio.headers["content-type"].startswith("audio/wav")


def test_unknown_narration_404(tmp_path):
    client = make_client(tmp_path, FakeSpeech([]))
    assert client.get("/v1/speech/narrations/deadbeef").status_code == 404


class OneQuestionWalk:
    """Minimal WalkthroughStore stand-in: one question, real transcript ops."""

    def __init__(self) -> None:
        self.transcripts: dict[str, list[dict]] = {"s1": []}
        self.states = {"gill_attachment": ["free", "attached", "decurrent"]}

    def transcript(self, session_id):
        return self.transcripts.get(session_id)

    def record(self, session_id, entry):
        self.transcripts[session_id].append(entry)
        return self.transcripts[session_id]

    def undo(self, session_id):
        self.transcripts[session_id] = self.transcripts[session_id][:-1]
        return self.transcripts[session_id]

    def next_question(self, transcript):
        if any(e["character"] == "gill_attachment" for e in transcript):
            return None
        return {
            "character": "gill_attachment",
            "ask_order": 1,
            "question": "How do the gills meet the stem?",
            "citation": "test",
        }

    def state(self, session_id, transcript):
        question = self.next_question(transcript)
        return {
            "session_id": session_id,
            "answers": transcript,
            "questions": [],
            "candidate_count": 1,
            "danger_count": 0,
            "complete": question is None,
            "question": None
            if question is None
            else {**question, "states": self.states["gill_attachment"]},
        }


def test_spoken_answer_lands_like_a_tap(tmp_path):
    walk = OneQuestionWalk()
    client = make_client(tmp_path, FakeSpeech(["Free."]), walkthrough=walk)
    body = post_utterance(client, "/v1/walkthrough/sessions/s1/utterance").json()
    assert body["action"] == "answer"
    assert body["state"] == "free"
    assert walk.transcripts["s1"] == [
        {"character": "gill_attachment", "states": ["free"]}
    ]
    assert body["walk"]["complete"] is True
    assert body["trace"]["engine"] == "parakeet"


def test_unrecognized_utterance_asks_again(tmp_path):
    walk = OneQuestionWalk()
    client = make_client(tmp_path, FakeSpeech(["fried eggs"]), walkthrough=walk)
    body = post_utterance(client, "/v1/walkthrough/sessions/s1/utterance").json()
    assert body["action"] == "ask_again"
    assert walk.transcripts["s1"] == []  # nothing advanced


def test_spoken_undo_removes_last_answer(tmp_path):
    walk = OneQuestionWalk()
    walk.transcripts["s1"] = [{"character": "gill_attachment", "states": ["free"]}]
    client = make_client(tmp_path, FakeSpeech(["go back"]), walkthrough=walk)
    body = post_utterance(client, "/v1/walkthrough/sessions/s1/utterance").json()
    assert body["action"] == "undo"
    assert walk.transcripts["s1"] == []


def test_utterance_unknown_session_404(tmp_path):
    client = make_client(tmp_path, FakeSpeech(["free"]), walkthrough=OneQuestionWalk())
    response = post_utterance(client, "/v1/walkthrough/sessions/nope/utterance")
    assert response.status_code == 404


def test_stream_relays_partials_then_final(tmp_path):
    fake = FakeSpeech([])
    client = make_client(tmp_path, fake)
    with client.websocket_connect("/v1/speech/stream?engine=parakeet") as ws:
        ws.send_bytes(b"\x00\x01" * 800)
        ws.send_text("end")
        first = ws.receive_json()
        final = ws.receive_json()
    assert first == {"type": "partial", "text": "wrap the"}
    assert final["type"] == "final"
    assert final["text"] == "wrap the tag end"
    assert final["model"] == "parakeet-tdt-0.6b-v3"
    stream = fake.streams[0]
    assert stream.received == [b"\x00\x01" * 800]
    assert stream.finished and stream.closed


def test_stream_reports_unconfigured_backend(tmp_path):
    client = make_client(tmp_path, None)
    with client.websocket_connect("/v1/speech/stream") as ws:
        assert ws.receive_json()["type"] == "error"


@pytest.mark.parametrize(
    ("spoken", "expected"),
    [
        ("Free.", {"action": "answer", "state": "free"}),
        ("ATTACHED", {"action": "answer", "state": "attached"}),
        ("not sure", {"action": "skip"}),
        ("go back", {"action": "undo"}),
        ("repeat", {"action": "repeat"}),
        ("freeform nonsense", {"action": "ask_again"}),
        ("fre", {"action": "ask_again"}),  # prefix is not a confirmation
        ("", {"action": "ask_again"}),
    ],
)
def test_map_utterance_gate(spoken, expected):
    assert map_utterance(spoken, ["free", "attached", "decurrent"]) == expected
