"""Endpoint-by-endpoint live verification of the whole flux stack.

Runs real requests with real media against the running server and asserts on
the substance of every reply, not just status codes. The demo gate: green
here means every surface the app touches answers correctly right now.

  uv run python scripts/verify_stack.py            # everything (VSS asks take minutes)
  uv run python scripts/verify_stack.py --fast     # skip the long VSS paths

Media inputs come from data/demo (bowline_src.mp4, testclip.mp4); the script
synthesizes what is missing with ffmpeg.
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

import httpx

SERVER = "http://localhost:8000"
REPO = Path(__file__).resolve().parents[1]
DEMO = REPO / "data" / "demo"

RESULTS: list[tuple[str, bool, str]] = []


def check(name: str, passed: bool, detail: str = "") -> None:
    RESULTS.append((name, passed, detail))
    mark = "PASS" if passed else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))


def clip_path() -> Path:
    path = DEMO / "testclip.mp4"
    if not path.exists():
        subprocess.run(
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "testsrc=duration=3:size=320x240:rate=8",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                str(path),
            ],
            check=True,
        )
    return path


def jpeg_bytes() -> bytes:
    out = subprocess.run(
        [
            "ffmpeg",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=duration=1:size=320x240:rate=1",
            "-frames:v",
            "1",
            "-f",
            "image2",
            "-c:v",
            "mjpeg",
            "-",
        ],
        capture_output=True,
        check=True,
    )
    return out.stdout


def wav_bytes(text: str) -> bytes | None:
    """A spoken utterance via the box TTS, so ASR checks use real speech."""
    try:
        r = httpx.post(
            f"{SERVER}/v1/speech/narrations",
            json={"text": text},
            timeout=60,
        )
        if r.status_code != 200:
            return None
        narration = r.json()
        audio = httpx.get(
            f"{SERVER}/v1/speech/narrations/{narration['narration_id']}", timeout=60
        )
        return audio.content if audio.status_code == 200 else None
    except httpx.HTTPError:
        return None


def main() -> int:
    fast = "--fast" in sys.argv
    client = httpx.Client(timeout=120)
    clip = clip_path()

    print("== infrastructure")
    for name, url, expect in [
        ("nemotron NIM tunnel", "http://localhost:30081/v1/models", "nemotron"),
        ("cosmos NIM tunnel", "http://localhost:30082/v1/models", "cosmos"),
        ("VSS agent tunnel", "http://localhost:18000/health", "isAlive"),
        ("perception tunnel", "http://localhost:18100/healthz", "bioclip"),
    ]:
        try:
            body = client.get(url).text
            check(name, expect.lower() in body.lower(), body[:60])
        except httpx.HTTPError as e:
            check(name, False, str(e)[:80])

    print("== core content")
    r = client.get(f"{SERVER}/healthz")
    check("healthz", r.status_code == 200 and r.json() == {"ok": True})
    chapters = client.get(f"{SERVER}/v1/content/chapters").json()
    check("chapters", len(chapters) >= 20, f"{len(chapters)} chapters")
    ch7 = next((c for c in chapters if c["fm_number"] == 7), None)
    check("firecraft chapter", ch7 is not None and "fire" in ch7["title"].lower())
    detail = client.get(f"{SERVER}/v1/content/chapters/{ch7['id']}").json()
    check("chapter detail", len(detail.get("sections", [])) >= 3)
    # 'bowline' never appears in FM 21-76's text; lashing is its cordage term.
    hits = client.get(f"{SERVER}/v1/content/search", params={"q": "lashing"}).json()[
        "hits"
    ]
    check("search finds lashing", len(hits) >= 1, f"{len(hits)} hits")
    r = client.get(f"{SERVER}/v1/tiles/archive", headers={"Range": "bytes=0-99"})
    check("tiles range", r.status_code == 206 and len(r.content) == 100)

    print("== chat")
    hi = client.post(f"{SERVER}/v1/chat", json={"question": "hi"}).json()
    check(
        "greeting is human",
        "chapter" not in hi["text"].lower() and len(hi["text"]) < 200,
        hi["text"][:60],
    )
    water = client.post(
        f"{SERVER}/v1/chat", json={"question": "how do I purify water?"}
    ).json()
    check(
        "survival cites chapter", "chapter" in water["text"].lower(), water["text"][:60]
    )
    knot = client.post(
        f"{SERVER}/v1/chat", json={"question": "how do I tie a bowline?"}
    ).json()
    check(
        "knot question offers camera tool",
        (knot.get("tool") or {}).get("prime") == "knot-verification",
        json.dumps(knot.get("tool"))[:60],
    )

    print("== walkthrough (mushroom scene)")
    sid = client.post(f"{SERVER}/v1/walkthrough/sessions").json()
    check(
        "walk creates",
        sid["candidate_count"] > 1500,
        f"{sid['candidate_count']} candidates",
    )
    check(
        "danger ships upfront",
        sid["danger_count"] > 100,
        f"{sid['danger_count']} danger",
    )
    camera_nodes = [
        q for q in sid["questions"] if q.get("answer_source") in ("camera", "both")
    ]
    check(
        "camera-capable nodes present",
        len(camera_nodes) >= 3,
        ",".join(q["character"] for q in camera_nodes),
    )
    wid = sid["session_id"]
    answered = client.post(
        f"{SERVER}/v1/walkthrough/sessions/{wid}/answer",
        json={"character": "hymeniumType", "state": "gills"},
    ).json()
    check("answer narrows", answered["candidate_count"] < sid["candidate_count"])
    undone = client.post(f"{SERVER}/v1/walkthrough/sessions/{wid}/undo").json()
    check("undo restores", undone["candidate_count"] == sid["candidate_count"])
    with clip.open("rb") as f:
        r = client.post(
            f"{SERVER}/v1/walkthrough/sessions/{wid}/observe",
            data={"character": "whichGills"},
            files={"video": ("clip.mp4", f, "video/mp4")},
        )
    ok = r.status_code == 200
    body = r.json() if ok else {}
    check(
        "observe answers bounded",
        ok and (body.get("state") is None or isinstance(body.get("state"), str)),
        f"{body.get('state')} conf={body.get('confidence')}" if ok else r.text[:80],
    )
    check(
        "observe never writes transcript",
        client.get(f"{SERVER}/v1/walkthrough/sessions/{wid}").json()["answers"] == [],
    )
    r = client.post(
        f"{SERVER}/v1/walkthrough/sessions/{wid}/observe",
        data={"character": "sporePrintColor"},
        files={"video": ("c.mp4", b"x", "video/mp4")},
    )
    check("observe refuses user node", r.status_code == 422)

    print("== coach (knot scene)")
    cs = client.post(f"{SERVER}/v1/coach/sessions", json={"knot": "bowline"}).json()
    check("coach session", cs["step"] == 0 and len(cs["steps"]) == 4)
    with clip.open("rb") as f:
        r = client.post(
            f"{SERVER}/v1/coach/sessions/{cs['session_id']}/clip",
            files={"video": ("clip.mp4", f, "video/mp4")},
        )
    check(
        "coach clip classifies",
        r.status_code == 200 and "prediction" in r.json(),
        json.dumps(r.json())[:60] if r.status_code == 200 else r.text[:80],
    )

    print("== identify (perception)")
    ps = client.post(
        f"{SERVER}/v1/sessions", json={"functionality": "plant_fungus_id"}
    ).json()
    r = client.post(
        f"{SERVER}/v1/sessions/{ps['session_id']}/frames",
        files={"frame": ("f.jpg", jpeg_bytes(), "image/jpeg")},
        data={"captured_at": "2026-08-16T00:00:00Z"},
    )
    ids = r.json().get("identifications") or []
    check(
        "frame returns real records",
        r.status_code == 200 and len(ids) >= 1 and all("score" in i for i in ids),
        f"{len(ids)} records, top={ids[0]['label'][:30] if ids else '-'}",
    )

    print("== speech")
    audio = wav_bytes("The gills are free of the stem.")
    check("narration synthesizes", audio is not None and len(audio or b"") > 10000)
    if audio:
        r = client.post(
            f"{SERVER}/v1/speech/transcriptions",
            files={"audio": ("u.wav", audio, "audio/wav")},
        )
        text = r.json().get("text", "") if r.status_code == 200 else ""
        check("round-trip transcription", "gills" in text.lower(), text[:60])

    if fast:
        print("== VSS trail (skipped with --fast)")
    else:
        print("== VSS trail (record scene)")
        ts = client.post(
            f"{SERVER}/v1/sessions", json={"functionality": "trail_memory"}
        ).json()
        tid = ts["session_id"]
        with clip.open("rb") as f:
            client.post(
                f"{SERVER}/v1/sessions/{tid}/videos",
                files={"video": ("clip.mp4", f, "video/mp4")},
                data={"captured_at": "2026-08-16T00:00:00Z"},
            )
        t0 = time.time()
        fin = client.post(f"{SERVER}/v1/sessions/{tid}/finish", timeout=600).json()
        results = client.get(f"{SERVER}/v1/sessions/{tid}/results").json()
        check(
            "finish summarizes",
            fin["status"] == "complete" and bool(results.get("summary")),
            f"{time.time() - t0:.0f}s, ingest={results.get('ingest')}",
        )
        r = client.post(
            f"{SERVER}/v1/sessions/{tid}/ask",
            json={"question": "what is shown in this clip?"},
            timeout=600,
        )
        check(
            "ask answers over trail",
            r.status_code == 200 and len(r.json().get("answer", "")) > 20,
            r.json().get("answer", r.text)[:70],
        )

    failed = [r for r in RESULTS if not r[1]]
    print(f"\n{'=' * 60}\n{len(RESULTS) - len(failed)}/{len(RESULTS)} passed")
    for name, _, detail in failed:
        print(f"  FAILED: {name} — {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    argparse.ArgumentParser().parse_known_args()
    sys.exit(main())
