"""Speech service on the GN100: ASR (Parakeet, Whisper) and TTS (Kokoro).

One FastAPI app behind the voice loop (#74 ASR, #77 TTS; flux-server relays,
#80). Models load once at startup from MODELS_DIR (the fetch_models.sh tree):

- parakeet-tdt-0.6b-v3 via NeMo: the primary ASR, low-latency short commands.
- faster-whisper large-v3 via CTranslate2: the second engine, for utterances
  Parakeet garbles (accents, noise); selected per request with engine=whisper.
- Kokoro-82M: walk narration. Synthesis streams sentence by sentence so
  time-to-first-audio stays ahead of total synthesis time.

Streaming ASR (WS /asr/stream) takes 16 kHz mono s16le PCM binary frames and
re-transcribes the growing buffer on a cadence, emitting partials; a text
frame "end" closes the utterance and emits the final. Buffered re-decode is
the simple correct scheme for command-length utterances; NeMo cache-aware
streaming is the refinement if partial latency disappoints on the bench.

Every response carries engine, model, and latency_ms so flux-server can put
the inference trace in front of the app's traces tab unchanged.
"""

import asyncio
import os
import struct
import subprocess
import tempfile
import time
from pathlib import Path

import numpy as np
from fastapi import (
    FastAPI,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import StreamingResponse

MODELS_DIR = Path(os.environ.get("MODELS_DIR", str(Path.home() / "flux/models")))
PARAKEET_DIR = MODELS_DIR / "parakeet-tdt-0.6b-v3"
WHISPER_DIR = MODELS_DIR / "faster-whisper-large-v3"
KOKORO_DIR = MODELS_DIR / "kokoro-82m"

SAMPLE_RATE = 16_000
TTS_SAMPLE_RATE = 24_000
DEFAULT_VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
# Re-transcribe the stream buffer once at least this much new audio arrived.
PARTIAL_STRIDE_S = 1.0
# A stream longer than this is not a command utterance; refuse to grow.
MAX_STREAM_S = 60


def decode_to_pcm(data: bytes) -> np.ndarray:
    """Any container ffmpeg reads (wav, m4a, webm) -> float32 mono 16 kHz."""
    result = subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-i",
            "pipe:0",
            "-f",
            "f32le",
            "-ac",
            "1",
            "-ar",
            str(SAMPLE_RATE),
            "pipe:1",
        ],
        input=data,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=422, detail="audio not decodable")
    return np.frombuffer(result.stdout, dtype=np.float32)


def wav_header(n_samples: int, rate: int) -> bytes:
    data_len = n_samples * 2
    return (
        b"RIFF"
        + struct.pack("<I", 36 + data_len)
        + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
        + b"data"
        + struct.pack("<I", data_len)
    )


class Engines:
    """The three models, loaded once; each ASR call returns (text, model_id)."""

    def __init__(self) -> None:
        import nemo.collections.asr as nemo_asr

        nemo_files = list(PARAKEET_DIR.glob("*.nemo"))
        if not nemo_files:
            raise RuntimeError(f"no .nemo file under {PARAKEET_DIR}")
        self.parakeet = nemo_asr.models.ASRModel.restore_from(str(nemo_files[0]))
        self.parakeet.eval()

        self.whisper = None
        if WHISPER_DIR.exists():
            from faster_whisper import WhisperModel

            self.whisper = WhisperModel(
                str(WHISPER_DIR), device="cuda", compute_type="float16"
            )

        from kokoro import KModel, KPipeline

        # Built from the fetched snapshot, not repo_id, so synthesis works
        # with the box offline.
        weights = next(KOKORO_DIR.glob("*.pth"))
        model = KModel(config=str(KOKORO_DIR / "config.json"), model=str(weights))
        self.kokoro = KPipeline(lang_code="a", model=model.eval().cuda())

    def voice_ref(self, name: str) -> str:
        """A fetched voice file when present, else the name for hub lookup."""
        local = KOKORO_DIR / "voices" / f"{name}.pt"
        return str(local) if local.exists() else name

    def transcribe(self, audio: np.ndarray, engine: str) -> tuple[str, str]:
        if engine == "whisper":
            if self.whisper is None:
                raise HTTPException(status_code=503, detail="whisper not fetched")
            segments, _ = self.whisper.transcribe(audio, beam_size=1, language="en")
            return " ".join(
                s.text.strip() for s in segments
            ).strip(), "faster-whisper-large-v3"
        if engine != "parakeet":
            raise HTTPException(status_code=422, detail=f"unknown engine: {engine}")
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            pcm16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
            tmp.write(wav_header(len(pcm16), SAMPLE_RATE) + pcm16.tobytes())
            tmp.flush()
            out = self.parakeet.transcribe([tmp.name], verbose=False)
        text = out[0].text if hasattr(out[0], "text") else str(out[0])
        return text.strip(), "parakeet-tdt-0.6b-v3"


def create_app() -> FastAPI:
    app = FastAPI(title="flux speech service")
    engines = Engines()
    # One GPU, models are not reentrant: serialize inference calls.
    gpu_lock = asyncio.Lock()

    @app.get("/healthz")
    def healthz() -> dict:
        return {
            "parakeet": True,
            "whisper": engines.whisper is not None,
            "kokoro": True,
        }

    @app.post("/asr")
    async def asr(audio: UploadFile, engine: str = Form("parakeet")) -> dict:
        pcm = decode_to_pcm(await audio.read())
        started = time.monotonic()
        async with gpu_lock:
            text, model = await asyncio.to_thread(engines.transcribe, pcm, engine)
        return {
            "text": text,
            "engine": engine,
            "model": model,
            "latency_ms": int((time.monotonic() - started) * 1000),
            "audio_s": round(len(pcm) / SAMPLE_RATE, 2),
        }

    @app.websocket("/asr/stream")
    async def asr_stream(ws: WebSocket) -> None:
        """Binary s16le 16 kHz frames in; partial/final transcript JSON out."""
        engine = ws.query_params.get("engine", "parakeet")
        await ws.accept()
        chunks: list[np.ndarray] = []
        decoded_upto = 0
        started = time.monotonic()
        try:
            while True:
                message = await ws.receive()
                if message.get("bytes") is not None:
                    pcm = np.frombuffer(message["bytes"], dtype=np.int16)
                    chunks.append(pcm.astype(np.float32) / 32768.0)
                    total = sum(len(c) for c in chunks)
                    if total / SAMPLE_RATE > MAX_STREAM_S:
                        await ws.send_json(
                            {"type": "error", "detail": "stream too long"}
                        )
                        break
                    if total - decoded_upto >= PARTIAL_STRIDE_S * SAMPLE_RATE:
                        decoded_upto = total
                        audio = np.concatenate(chunks)
                        async with gpu_lock:
                            text, model = await asyncio.to_thread(
                                engines.transcribe, audio, engine
                            )
                        await ws.send_json({"type": "partial", "text": text})
                elif message.get("text") is not None:
                    audio = (
                        np.concatenate(chunks) if chunks else np.zeros(0, np.float32)
                    )
                    final_start = time.monotonic()
                    text = ""
                    model = ""
                    if len(audio) > 0:
                        async with gpu_lock:
                            text, model = await asyncio.to_thread(
                                engines.transcribe, audio, engine
                            )
                    await ws.send_json(
                        {
                            "type": "final",
                            "text": text,
                            "engine": engine,
                            "model": model,
                            "latency_ms": int((time.monotonic() - final_start) * 1000),
                            "stream_s": round(time.monotonic() - started, 2),
                            "audio_s": round(len(audio) / SAMPLE_RATE, 2),
                        }
                    )
                    break
        except WebSocketDisconnect:
            return
        await ws.close()

    @app.post("/tts")
    async def tts(body: dict) -> StreamingResponse:
        """{"text", "voice"?} -> WAV. Synthesis completes before the first
        byte; if the bench shows time-to-first-audio lagging on long node
        text, the refinement is yielding per Kokoro sentence piece."""
        text = str(body.get("text", "")).strip()
        if not text:
            raise HTTPException(status_code=422, detail="empty text")
        voice = str(body.get("voice") or DEFAULT_VOICE)
        started = time.monotonic()

        async with gpu_lock:
            pieces: list[np.ndarray] = await asyncio.to_thread(
                lambda: [
                    np.asarray(a, dtype=np.float32)
                    for _, _, a in engines.kokoro(text, voice=engines.voice_ref(voice))
                ]
            )
        audio = np.concatenate(pieces) if pieces else np.zeros(0, np.float32)
        pcm16 = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
        latency_ms = int((time.monotonic() - started) * 1000)

        def body_iter():
            yield wav_header(len(pcm16), TTS_SAMPLE_RATE)
            yield pcm16.tobytes()

        return StreamingResponse(
            body_iter(),
            media_type="audio/wav",
            headers={
                "X-Model": "kokoro-82m",
                "X-Voice": voice,
                "X-Latency-Ms": str(latency_ms),
                "X-Audio-S": str(round(len(pcm16) / TTS_SAMPLE_RATE, 2)),
            },
        )

    return app


app = create_app()
