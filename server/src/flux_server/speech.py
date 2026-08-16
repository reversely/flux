"""Speech relay: the box speech service behind the app's voice loop (#80).

The box serves ASR (Parakeet, Whisper) and TTS (Kokoro) on its speech
service (box/services/speech); this module is the server's client plus the
transcript-to-walk-answer mapping. Every result keeps the box's inference
trace (engine, model, latency_ms) so the routes can hand it to the app's
traces tab unmodified.

A voice answer is a user confirmation, so the mapping is an exact gate: a
transcript either matches one of the current question's states (or a walk
control) after normalization, or the caller is told to ask again. A fuzzy
match must never advance a node.
"""

import asyncio
import os
import re
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol

import httpx

TRANSCRIBE_TIMEOUT_S = 30
SYNTHESIZE_TIMEOUT_S = 60


@dataclass
class Transcription:
    text: str
    engine: str
    model: str
    latency_ms: int


@dataclass
class Synthesis:
    audio: bytes
    media_type: str
    model: str
    voice: str
    latency_ms: int


class SpeechService(Protocol):
    def transcribe(self, audio: bytes, engine: str) -> Transcription:
        """One utterance to text on the box."""

    def synthesize(self, text: str, voice: str | None) -> Synthesis:
        """Narration text to audio on the box."""

    def stream(self, engine: str) -> "SpeechStream":
        """An open streaming-transcription connection to the box."""


class SpeechStream(Protocol):
    async def send(self, chunk: bytes) -> None:
        """Forward one PCM chunk."""

    async def finish(self) -> None:
        """Signal end of utterance."""

    def events(self) -> AsyncIterator[dict]:
        """Partial and final transcript events, as the box emits them."""

    async def close(self) -> None:
        """Drop the connection."""


class BoxSpeech:
    """The real client against box/services/speech."""

    def __init__(self, base_url: str) -> None:
        self._base = base_url.rstrip("/")

    def transcribe(self, audio: bytes, engine: str) -> Transcription:
        response = httpx.post(
            f"{self._base}/asr",
            files={"audio": ("utterance", audio, "application/octet-stream")},
            data={"engine": engine},
            timeout=TRANSCRIBE_TIMEOUT_S,
        )
        response.raise_for_status()
        body = response.json()
        return Transcription(
            text=body["text"],
            engine=body["engine"],
            model=body["model"],
            latency_ms=body["latency_ms"],
        )

    def synthesize(self, text: str, voice: str | None) -> Synthesis:
        started = time.monotonic()
        response = httpx.post(
            f"{self._base}/tts",
            json={"text": text} if voice is None else {"text": text, "voice": voice},
            timeout=SYNTHESIZE_TIMEOUT_S,
        )
        response.raise_for_status()
        box_ms = response.headers.get("x-latency-ms")
        return Synthesis(
            audio=response.content,
            media_type=response.headers.get("content-type", "audio/wav"),
            model=response.headers.get("x-model", "kokoro-82m"),
            voice=response.headers.get("x-voice", voice or ""),
            latency_ms=int(box_ms)
            if box_ms is not None
            else int((time.monotonic() - started) * 1000),
        )

    def stream(self, engine: str) -> SpeechStream:
        return BoxSpeechStream(
            self._base.replace("http", "ws", 1) + f"/asr/stream?engine={engine}"
        )


class BoxSpeechStream:
    """One WS connection to the box ASR stream, opened lazily on first use."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._ws = None
        # The send pump and the event pump both trigger the lazy connect;
        # without the lock they race and open two box connections, and the
        # events arrive on the one that never received audio.
        self._connect_lock = asyncio.Lock()

    async def _connect(self):
        async with self._connect_lock:
            if self._ws is None:
                import websockets

                self._ws = await websockets.connect(self._url)
        return self._ws

    async def send(self, chunk: bytes) -> None:
        ws = await self._connect()
        await ws.send(chunk)

    async def finish(self) -> None:
        ws = await self._connect()
        await ws.send("end")

    async def events(self) -> AsyncIterator[dict]:
        import json

        ws = await self._connect()
        async for raw in ws:
            event = json.loads(raw)
            yield event
            if event.get("type") in ("final", "error"):
                return

    async def close(self) -> None:
        if self._ws is not None:
            await self._ws.close()


def speech_from_env() -> SpeechService | None:
    """A real relay when FLUX_SPEECH_URL names the box service, else None."""
    base_url = os.environ.get("FLUX_SPEECH_URL")
    if not base_url:
        return None
    return BoxSpeech(base_url)


# Spoken walk controls, normalized form -> action. Answer states win over
# controls when a state happens to contain one of these words.
CONTROL_PHRASES = {
    "undo": "undo",
    "go back": "undo",
    "back": "undo",
    "repeat": "repeat",
    "say again": "repeat",
    "again": "repeat",
    "skip": "skip",
    "not sure": "skip",
    "i dont know": "skip",
}


def normalize_utterance(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


def map_utterance(text: str, states: list[str]) -> dict:
    """Transcript -> {"action": ...} against one question's answer set.

    Actions: answer (with the matched state), skip, undo, repeat, or
    ask_again when nothing matches exactly. The state comparison ignores
    case and punctuation but requires the whole normalized utterance to
    equal a whole normalized state; substring hits are not confirmations.
    """
    spoken = normalize_utterance(text)
    if not spoken:
        return {"action": "ask_again"}
    for state in states:
        if normalize_utterance(state) == spoken:
            return {"action": "answer", "state": state}
    control = CONTROL_PHRASES.get(spoken)
    if control is not None:
        return {"action": control}
    return {"action": "ask_again"}
