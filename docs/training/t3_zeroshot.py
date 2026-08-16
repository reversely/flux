"""Zero-shot bench: T3 tourniquet segments through the deployed coach prompt.

Runs on the box against the cosmos-reason2-8b NIM (localhost:30082). For each
annotated P05 segment in the eval set, cuts the segment from its video, samples
frames the way server/coach.py does (1 fps, cap 8), sends the coach_step_prompt
with the set's own action vocabulary as the step list, and scores top-1 against
the annotation. Standard (regular/) and improvised (JIT/) sets score separately;
the improvised set's cues use its own nouns (belt, clothing, screwdriver), so
each set is classified against language that matches what its frames show.

Eval split: the lexically last 20 percent of regular P05 videos, and all JIT
P05 videos. If an adapter trains later, its training data must exclude every
video this bench uses.

Usage (on the box):
    python3 t3_zeroshot.py --set regular --out bench_regular.jsonl
    python3 t3_zeroshot.py --set jit --out bench_jit.jsonl
"""

import argparse
import base64
import csv
import json
import re
import subprocess
import tempfile
import urllib.request
from collections import Counter
from pathlib import Path

DATA = Path.home() / "flux-model/data/trauma-thompson"
# Defaults hit the base-model NIM; --url/--model retarget the identical
# harness at the adapter endpoint (t3_serve.py) for before/after numbers.
COSMOS_URL = "http://localhost:30082/v1/chat/completions"
MODEL = "nvidia/cosmos-reason2-8b"
MAX_FRAMES = 8
EVAL_FRACTION = 0.2

# The deployed prompt scaffold, verbatim from server/src/flux_server/prompts.py.
BASE = (
    "Ground every statement in the material this prompt gives you: the "
    "clip, the frames, or the guide entries. State uncertainty plainly "
    "instead of guessing. You inform; the user decides and confirms."
)
CLIP_OBSERVER = (
    "Name only what is visible in the frames. When asked about specific "
    "evidence, answer each item as settled, with the value you can see, "
    "or unsettled; never guess a value the clip does not show."
)


def step_prompt(procedure_name: str, cues: list[str]) -> str:
    steps = "\n".join(f"S{i}: {cue}" for i, cue in enumerate(cues))
    task = (
        f"You are watching someone perform {procedure_name} step by step. "
        f"The procedure's steps are:\n{steps}\n\n"
        "These frames are one consecutive chunk of live video, in order. "
        "Which single step is being performed in this chunk? "
        'Answer with JSON only: {"step": "S<n>"}'
    )
    return f"{BASE}\n\n{CLIP_OBSERVER}\n\n{task}"


_FPS_CACHE: dict[Path, float] = {}


def video_fps(video: Path) -> float:
    """The video's real frame rate. Videos mix 50, 59.94, and 47.95 fps, so
    a constant here mistimes every segment in a non-matching video."""
    if video not in _FPS_CACHE:
        probe = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v",
                "-show_entries",
                "stream=r_frame_rate",
                "-of",
                "csv=p=0",
                str(video),
            ],
            capture_output=True,
            text=True,
            check=False,
        ).stdout.strip()
        num, _, den = probe.partition("/")
        _FPS_CACHE[video] = float(num) / float(den or 1)
    return _FPS_CACHE[video]


def load_segments(csv_path: Path, videos_dir: Path) -> list[dict]:
    with open(csv_path) as handle:
        rows = [r for r in csv.DictReader(handle) if r["procedure_id"] == "P05"]
    for r in rows:
        fps = video_fps(videos_dir / f"{r['video_id']}.mp4")
        r["start_s"] = int(r["start_frame"]) / fps
        r["stop_s"] = int(r["stop_frame"]) / fps
    return rows


def eval_videos(rows: list[dict], take_all: bool) -> list[str]:
    vids = sorted({r["video_id"] for r in rows})
    if take_all:
        return vids
    n = max(1, round(len(vids) * EVAL_FRACTION))
    return vids[-n:]


def extract_frames(video: Path, start: float, stop: float) -> list[bytes]:
    # At the deployed 1 fps a two-second segment yields one frame, which
    # starves the verb distinctions (take vs twist) of temporal evidence,
    # and 8 full-resolution 1080p frames overflow the NIM's request limit
    # (HTTP 400). Sample 4 to 8 evenly spaced frames and downscale to 720p.
    duration = max(stop - start, 0.1)
    n = min(MAX_FRAMES, max(4, round(duration)))
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-ss",
                f"{start:.2f}",
                "-to",
                f"{stop:.2f}",
                "-i",
                str(video),
                "-vf",
                f"fps={n / duration:.4f},scale=-2:720",
                "-frames:v",
                str(n),
                "-q:v",
                "3",
                str(Path(tmp) / "frame_%02d.jpg"),
            ],
            capture_output=True,
            check=False,
        )
        frames = sorted(Path(tmp).glob("frame_*.jpg"))
        return [f.read_bytes() for f in frames]


def classify(
    prompt: str,
    frames: list[bytes],
    n_classes: int,
    url: str = COSMOS_URL,
    model: str = MODEL,
) -> int | None:
    content = [{"type": "text", "text": prompt}] + [
        {
            "type": "image_url",
            "image_url": {
                "url": "data:image/jpeg;base64," + base64.b64encode(f).decode()
            },
        }
        for f in frames
    ]
    body = json.dumps(
        {
            "model": model,
            "temperature": 0,
            "max_tokens": 200,
            "messages": [{"role": "user", "content": content}],
        }
    ).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            text = json.load(resp)["choices"][0]["message"]["content"]
    except Exception as error:  # noqa: BLE001 - any transport failure scores as None
        print("request failed:", error)
        return None
    match = re.search(r'"step"\s*:\s*"S(\d+)"', text)
    if match is None:
        return None
    index = int(match.group(1))
    return index if 0 <= index < n_classes else None


# Step-level bench: the tile's coach tracks 3-6 authored steps, not 18-28
# verb-noun actions, so this grain matches deployment. Cues follow the knot
# cues' observable-state phrasing; the mapping is the first draft of the
# plan's T3-verb-to-authored-step table (TC 4-02.1 shape, medical review
# pending). Actions that are pure object handling (take, grab) map to the
# step the handling serves; "record time"/"take pen" fall outside coaching
# and drop from the step-level eval.
STEPS_REGULAR = [
    "the bleeding site found and exposed on the limb",
    "the tourniquet band placed around the limb above the wound",
    "the strap pulled tight around the limb",
    "the windlass rod or ratchet turned to tighten until bleeding stops",
    "the windlass or ratchet locked so it cannot unwind",
    "the wound and pulse checked after tightening",
]
MAP_REGULAR = {
    "identify wound": 0,
    "take tourniquet": 1,
    "position tourniquet": 1,
    "adjust tourniquet": 1,
    "take strap": 2,
    "tighten strap": 2,
    "tighten tourniquet": 2,
    "take windlass": 3,
    "grab windlass": 3,
    "twist windlass": 3,
    "take ratchet": 3,
    "tighten ratchet": 3,
    "fasten windlass": 4,
    "fasten ratchet": 4,
    "assess pulse": 5,
    "verify hemostasis": 5,
}
STEPS_JIT = [
    "the bleeding site found and exposed on the limb",
    "a belt or strip of clothing placed around the limb above the wound",
    "the band tied or cinched tight around the limb",
    "a screwdriver or rod inserted into the band and twisted to tighten",
    "the rod secured so it cannot unwind",
    "the wound checked for stopped bleeding",
]
MAP_JIT = {
    "identify wound": 0,
    "take belt": 1,
    "take clothing": 1,
    "position belt": 1,
    "position clothing": 1,
    "apply belt": 1,
    "apply clothing": 1,
    "tie belt": 2,
    "tie clothing": 2,
    "tighten belt": 2,
    "tighten clothing": 2,
    "attach strap": 2,
    "secure strap": 2,
    "cinch windlass": 2,
    "take screwdriver": 3,
    "take windlass": 3,
    "insert screwdriver": 3,
    "insert windlass": 3,
    "position screwdriver": 3,
    "position windlass": 3,
    "apply screwdriver": 3,
    "twist screwdriver": 3,
    "twist windlass": 3,
    "secure screwdriver": 4,
    "secure belt": 4,
    "fasten windlass": 4,
    "check bleeding": 5,
    "verify hemostasis": 5,
}

# Phase grain: the knot bench's Run 5 lesson applied here. Merging the
# confusable adjacent steps (band placed with band tied; rod twisted with
# rod secured) removes the dominant confusion T2->P1 and gives the pointer
# fewer, cleaner states. STEP_TO_PHASE folds the six-step mapping down.
STEP_TO_PHASE = {0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3}
PHASES_REGULAR = [
    "the bleeding site found and exposed on the limb",
    "the tourniquet band placed around the limb and the strap pulled tight",
    "the windlass rod or ratchet turned until bleeding stops, then locked",
    "the wound and pulse checked after tightening",
]
PHASES_JIT = [
    "the bleeding site found and exposed on the limb",
    "a belt or strip of clothing wrapped around the limb and tied tight above the wound",
    "a screwdriver or rod in the band, twisted until bleeding stops and secured",
    "the wound checked for stopped bleeding",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--set", choices=["regular", "jit"], required=True)
    parser.add_argument(
        "--grain", choices=["action", "step", "phase"], default="action"
    )
    parser.add_argument("--out", required=True)
    parser.add_argument("--url", default=COSMOS_URL)
    parser.add_argument("--model", default=MODEL)
    args = parser.parse_args()

    subdir = "regular" if args.set == "regular" else "JIT"
    rows = load_segments(
        DATA / subdir / "train" / "annotations_train.csv",
        DATA / subdir / "train" / "videos",
    )
    vids = eval_videos(rows, take_all=args.set == "jit")
    segments = [r for r in rows if r["video_id"] in vids]
    if args.grain in ("step", "phase"):
        mapping = MAP_REGULAR if args.set == "regular" else MAP_JIT
        segments = [r for r in segments if r["action"] in mapping]
        if args.grain == "phase":
            actions = PHASES_REGULAR if args.set == "regular" else PHASES_JIT

            def truth_of(r: dict) -> int:
                return STEP_TO_PHASE[mapping[r["action"]]]
        else:
            actions = STEPS_REGULAR if args.set == "regular" else STEPS_JIT

            def truth_of(r: dict) -> int:
                return mapping[r["action"]]
    else:
        # Classes span the set's full P05 vocabulary, not just the eval
        # videos', so the candidate list matches what deployment would offer.
        actions = sorted({r["action"] for r in rows})
        index_of = {a: i for i, a in enumerate(actions)}

        def truth_of(r: dict) -> int:
            return index_of[r["action"]]

    prompt = step_prompt("tourniquet application to stop limb bleeding", actions)
    print(
        f"{args.set}: {len(vids)} videos, {len(segments)} segments, {len(actions)} action classes"
    )

    hits = 0
    nones = 0
    per_action = Counter()
    per_action_hits = Counter()
    with open(args.out, "w") as out:
        for i, r in enumerate(segments):
            video = DATA / subdir / "train" / "videos" / f"{r['video_id']}.mp4"
            frames = extract_frames(video, r["start_s"], r["stop_s"])
            if not frames:
                prediction = None
            else:
                prediction = classify(
                    prompt, frames, len(actions), url=args.url, model=args.model
                )
            truth = truth_of(r)
            correct = prediction == truth
            hits += correct
            nones += prediction is None
            per_action[r["action"]] += 1
            per_action_hits[r["action"]] += correct
            out.write(
                json.dumps(
                    {
                        "clip_id": r["clip_id"],
                        "action": r["action"],
                        "truth": truth,
                        "prediction": prediction,
                        "predicted_action": None
                        if prediction is None
                        else actions[prediction],
                        "n_frames": len(frames),
                    }
                )
                + "\n"
            )
            out.flush()
            if (i + 1) % 20 == 0:
                print(f"{i + 1}/{len(segments)} top-1 so far {hits / (i + 1):.3f}")

    n = len(segments)
    print(f"\n{args.set} final: top-1 {hits}/{n} = {hits / n:.3f}, unparseable {nones}")
    for action in sorted(per_action):
        print(f"  {per_action_hits[action]:3d}/{per_action[action]:<3d} {action}")


if __name__ == "__main__":
    main()
