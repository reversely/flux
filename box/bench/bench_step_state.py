"""Phase A step-state bench: chunk frames -> VLM -> step label vs ground truth.

Runs on the GN100 against the cosmos-reason2-8b NIM (OpenAI-compatible).
Isolates model capability from VSS plumbing: same ~8 frames/chunk VSS samples.
"""

import base64
import json
import sys
import time
from pathlib import Path

import httpx

ENDPOINT = "http://localhost:30082/v1/chat/completions"
MODEL = "nvidia/cosmos-reason2-8b"
CHUNK_S = 8
FRAMES_PER_CHUNK = 8


def load_case(case_dir: Path):
    case = json.loads((case_dir / "case.json").read_text())
    frames = sorted((case_dir / "frames").glob("*.jpg"))
    return case, frames


def chunk_frames(frames, chunk_s=CHUNK_S, per_chunk=FRAMES_PER_CHUNK):
    """Frames are 1 fps; group into chunks of chunk_s seconds, sample per_chunk."""
    chunks = []
    for start in range(0, len(frames), chunk_s):
        group = frames[start : start + chunk_s]
        if len(group) > per_chunk:
            step = len(group) / per_chunk
            group = [group[int(i * step)] for i in range(per_chunk)]
        chunks.append((start, start + min(chunk_s, len(group) * 1), group))
    return chunks


def gt_label(case, t0, t1):
    """Majority ground-truth step over [t0, t1); returns set of acceptable labels
    (any step overlapping the chunk counts, so boundary chunks accept both)."""
    ok = set()
    for seg in case["ground_truth"]:
        if seg["t0"] < t1 and seg["t1"] > t0:
            ok.add(seg["step"])
    return ok


def build_prompt(case):
    steps = "\n".join(f"S{i}: {s}" for i, s in enumerate(case["steps"]))
    return (
        f"You are watching someone tie a {case['knot']} step by step. "
        f"The procedure's steps are:\n{steps}\n\n"
        "These frames are one consecutive chunk of the video, in order. "
        "Which single step is being performed in this chunk? "
        'Answer with JSON only: {"step": "S<n>", "state": "in_progress"|"completed", '
        '"confidence": "high"|"medium"|"low"}'
    )


def ask(client, prompt, frame_paths):
    content = [{"type": "text", "text": prompt}]
    for p in frame_paths:
        b64 = base64.b64encode(p.read_bytes()).decode()
        content.append(
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
        )
    t = time.monotonic()
    r = client.post(
        ENDPOINT,
        json={
            "model": MODEL,
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 300,
            "temperature": 0,
        },
        timeout=180,
    )
    latency = time.monotonic() - t
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"]
    return text, latency


def parse_answer(text):
    start, end = text.find("{"), text.rfind("}")
    if start == -1:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def main(case_dir):
    case, frames = load_case(Path(case_dir))
    prompt = build_prompt(case)
    rows, correct = [], 0
    with httpx.Client() as client:
        for t0, t1, group in chunk_frames(frames):
            text, latency = ask(client, prompt, group)
            ans = parse_answer(text)
            pred = ans.get("step") if ans else None
            ok = gt_label(case, t0, t1)
            hit = pred in ok or "*" in ok
            correct += hit
            rows.append(
                {
                    "t0": t0,
                    "t1": t1,
                    "pred": pred,
                    "gt": sorted(ok),
                    "hit": hit,
                    "latency_s": round(latency, 2),
                    "raw": None if ans else text[:200],
                }
            )
            print(
                f"[{t0:3d}-{t1:3d}s] pred={pred} gt={sorted(ok)} "
                f"{'OK' if hit else 'MISS'} {latency:.1f}s",
                flush=True,
            )
    n = len(rows)
    summary = {
        "case": case["knot"],
        "chunks": n,
        "accuracy": round(correct / n, 3),
        "mean_latency_s": round(sum(r["latency_s"] for r in rows) / n, 2),
    }
    print(json.dumps(summary))
    out = Path(case_dir) / "results.json"
    out.write_text(json.dumps({"summary": summary, "rows": rows}, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])
