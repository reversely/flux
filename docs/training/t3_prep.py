"""Build the T3 instruction-tuning sets for the tourniquet adapter.

Box-side. Reads the regular/ and JIT/ annotation CSVs, pre-extracts 4-8
evenly spaced 720p frames per segment, and writes chat-format JSONL in the
exact prompt shape the server sends (see t3_zeroshot.py, which holds the
shared scaffold). Two tasks in this pass:

- action grain: every procedure, each set classified against its own
  procedure-and-set action vocabulary;
- step grain: P05 only, the six authored-step cues and the draft
  action-to-step mapping from t3_zeroshot.py.

Splits are by video id. The zero-shot bench's eval videos are excluded
entirely; of what remains, the lexically last 10 percent of videos per
procedure and set become validation.

Grounding and VQA tasks are a second pass: grounding waits on the class-id
name mapping (objects/class-noun-correlation.md), VQA on its video
extraction.

Usage (on the box):
    python3 t3_prep.py --out ~/flux-model/train/data
"""

import argparse
import csv
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from t3_zeroshot import (
    DATA,
    MAP_JIT,
    MAP_REGULAR,
    STEPS_JIT,
    STEPS_REGULAR,
    step_prompt,
    video_fps,
)

BENCH_EVAL = {
    "regular": {"P05_36", "P05_37", "P05_39", "P05_40", "P05_41", "P05_42"},
    "JIT": {
        "P05_21",
        "P05_22",
        "P05_43",
        "P05_44",
        "P05_46",
        "P05_47",
        "P05_48",
        "P05_49",
        "P05_51",
        "P05_52",
        "P05_53",
        "P05_54",
        "P05_56",
        "P05_57",
    },
}
VAL_FRACTION = 0.1
PROCEDURE_NAMES = {
    "P01": "a cricothyroidotomy",
    "P02": "a tube thoracostomy",
    "P03": "intraosseous access",
    "P04": "a needle decompression",
    "P05": "tourniquet application to stop limb bleeding",
}
MAX_FRAMES = 8


def extract_frames(video: Path, start: float, stop: float, dest: Path) -> list[Path]:
    if dest.exists() and any(dest.iterdir()):
        return sorted(dest.glob("*.jpg"))
    dest.mkdir(parents=True, exist_ok=True)
    duration = max(stop - start, 0.1)
    n = min(MAX_FRAMES, max(4, round(duration)))
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
            str(dest / "f%02d.jpg"),
        ],
        capture_output=True,
        check=False,
    )
    return sorted(dest.glob("*.jpg"))


def load_rows(subdir: str) -> list[dict]:
    path = DATA / subdir / "train" / "annotations_train.csv"
    with open(path) as handle:
        rows = [
            r for r in csv.DictReader(handle) if r["video_id"] not in BENCH_EVAL[subdir]
        ]
    for r in rows:
        r["set"] = subdir
        fps = video_fps(DATA / subdir / "train" / "videos" / f"{r['video_id']}.mp4")
        r["start_s"] = int(r["start_frame"]) / fps
        r["stop_s"] = int(r["stop_frame"]) / fps
    return rows


def val_videos(rows: list[dict]) -> set[str]:
    out: set[str] = set()
    by_group: dict[tuple[str, str], set[str]] = {}
    for r in rows:
        by_group.setdefault((r["set"], r["procedure_id"]), set()).add(r["video_id"])
    for vids in by_group.values():
        ordered = sorted(vids)
        n = max(1, round(len(ordered) * VAL_FRACTION))
        out.update(ordered[-n:])
    return out


def record(prompt: str, frames: list[Path], answer_index: int) -> dict:
    return {
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}]
                + [{"type": "image", "path": str(f)} for f in frames],
            },
            {"role": "assistant", "content": json.dumps({"step": f"S{answer_index}"})},
        ]
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    out = Path(args.out).expanduser()
    frames_root = out / "frames"
    rows = load_rows("regular") + load_rows("JIT")
    val = val_videos(rows)

    vocab: dict[tuple[str, str], list[str]] = {}
    for r in rows:
        key = (r["set"], r["procedure_id"])
        vocab.setdefault(key, [])
    for key in vocab:
        vocab[key] = sorted(
            {r["action"] for r in rows if (r["set"], r["procedure_id"]) == key}
        )

    out.mkdir(parents=True, exist_ok=True)
    counts: Counter = Counter()
    writers = {name: (out / f"{name}.jsonl").open("w") for name in ("train", "val")}
    for i, r in enumerate(rows):
        video = DATA / r["set"] / "train" / "videos" / f"{r['video_id']}.mp4"
        frames = extract_frames(
            video, r["start_s"], r["stop_s"], frames_root / r["clip_id"]
        )
        if not frames:
            counts["no_frames"] += 1
            continue
        split = "val" if r["video_id"] in val else "train"
        name = PROCEDURE_NAMES[r["procedure_id"]]
        actions = vocab[(r["set"], r["procedure_id"])]
        writers[split].write(
            json.dumps(
                record(step_prompt(name, actions), frames, actions.index(r["action"]))
            )
            + "\n"
        )
        counts[f"action_{split}"] += 1
        if r["procedure_id"] == "P05":
            mapping = MAP_REGULAR if r["set"] == "regular" else MAP_JIT
            cues = STEPS_REGULAR if r["set"] == "regular" else STEPS_JIT
            if r["action"] in mapping:
                writers[split].write(
                    json.dumps(
                        record(step_prompt(name, cues), frames, mapping[r["action"]])
                    )
                    + "\n"
                )
                counts[f"step_{split}"] += 1
        if (i + 1) % 200 == 0:
            print(f"{i + 1}/{len(rows)} segments processed")
    for w in writers.values():
        w.close()
    print(json.dumps(dict(counts), indent=2))
    print(f"val videos: {len(val)}")


if __name__ == "__main__":
    main()
