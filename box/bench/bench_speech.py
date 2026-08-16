"""Bench the speech service: TTS latency, ASR latency, vocabulary round-trip.

Runs on the GN100 against a local speech service (box/services/speech).
Kokoro synthesizes each phrase in the walk answer vocabulary, then both ASR
engines transcribe the synthesized audio back: one run yields the #77 number
(time-to-first-audio and real-time factor per phrase), the #74 number
(utterance transcription latency per engine), and a round-trip accuracy
column showing which vocabulary words each engine survives.

The streaming pass replays one synthesized utterance over WS /asr/stream in
real-time-sized chunks and reports partial cadence and final latency.

Usage: python bench_speech.py [http://localhost:8110]
"""

import asyncio
import io
import json
import re
import struct
import sys
import time
import wave

import httpx
import websockets

PHRASES = [
    "yes",
    "no",
    "not sure",
    "repeat",
    "go back",
    "undo",
    "the gills are free from the stem",
    "wrap the tag end around the standing line",
]
VOCAB_TRIP = PHRASES[:6]
CHUNK_MS = 250


def normalize(text: str) -> str:
    return re.sub(r"[^a-z ]", "", text.lower()).strip()


def wav_pcm16(data: bytes) -> tuple[bytes, int]:
    with wave.open(io.BytesIO(data)) as w:
        return w.readframes(w.getnframes()), w.getframerate()


def resample_s16le(pcm: bytes, rate: int, target: int = 16_000) -> bytes:
    if rate == target:
        return pcm
    samples = struct.unpack(f"<{len(pcm) // 2}h", pcm)
    out = [
        samples[int(i * rate / target)]
        for i in range(int(len(samples) * target / rate))
    ]
    return struct.pack(f"<{len(out)}h", *out)


def main(base: str) -> None:
    client = httpx.Client(base_url=base, timeout=120)
    print(f"speech service: {client.get('/healthz').json()}")

    clips: dict[str, bytes] = {}
    print("\n== TTS (#77): phrase, time-to-first-audio ms, total ms, audio s, rtf ==")
    for phrase in PHRASES:
        started = time.monotonic()
        with client.stream("POST", "/tts", json={"text": phrase}) as r:
            r.raise_for_status()
            first = None
            body = b""
            for chunk in r.iter_bytes():
                if first is None:
                    first = time.monotonic() - started
                body += chunk
        total = time.monotonic() - started
        audio_s = float(r.headers["x-audio-s"])
        clips[phrase] = body
        print(
            f"{phrase!r}\tttfa={first * 1000:.0f}\ttotal={total * 1000:.0f}"
            f"\taudio={audio_s}s\trtf={total / audio_s:.2f}"
        )

    print("\n== ASR (#74): engine, phrase, latency ms, transcript ==")
    trips: dict[str, int] = {"parakeet": 0, "whisper": 0}
    for engine in ["parakeet", "whisper"]:
        for phrase, clip in clips.items():
            r = client.post(
                "/asr",
                files={"audio": ("u.wav", clip, "audio/wav")},
                data={"engine": engine},
            )
            if r.status_code == 503:
                print(f"{engine}: not fetched, skipped")
                break
            got = r.json()
            match = normalize(got["text"]) == normalize(phrase)
            if phrase in VOCAB_TRIP and match:
                trips[engine] += 1
            print(
                f"{engine}\t{phrase!r}\t{got['latency_ms']}ms"
                f"\t{got['text']!r}\t{'ok' if match else 'MISS'}"
            )
    print(
        f"vocabulary round-trip: parakeet {trips['parakeet']}/{len(VOCAB_TRIP)}, "
        f"whisper {trips['whisper']}/{len(VOCAB_TRIP)}"
    )

    print("\n== streaming ASR: partial cadence over WS /asr/stream ==")
    phrase = PHRASES[6]
    pcm, rate = wav_pcm16(clips[phrase])
    pcm = resample_s16le(pcm, rate)
    asyncio.run(stream_one(base, phrase, pcm))


async def stream_one(base: str, phrase: str, pcm: bytes) -> None:
    url = base.replace("http", "ws", 1) + "/asr/stream?engine=parakeet"
    chunk = 16_000 * 2 * CHUNK_MS // 1000
    started = time.monotonic()
    async with websockets.connect(url) as ws:

        async def feed():
            for i in range(0, len(pcm), chunk):
                await ws.send(pcm[i : i + chunk])
                await asyncio.sleep(CHUNK_MS / 1000)  # real-time playback pace
            await ws.send("end")

        feeder = asyncio.create_task(feed())
        async for raw in ws:
            msg = json.loads(raw)
            t = time.monotonic() - started
            print(f"{t * 1000:.0f}ms\t{msg['type']}\t{msg.get('text', '')!r}")
            if msg["type"] in ("final", "error"):
                break
        await feeder


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8110")
