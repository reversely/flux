"""Tag the #68 focus photos by visible feature, using the box's Cosmos NIM.

For every photo in the focus manifest, one chat completion against the
OpenAI-compatible VLM on port 30082 asks which walkthrough features are
clearly visible (gill underside, stem ring, stem base, cap top) and whether
the frame is clear enough to serve as a reference. The answer is forced to
one JSON object; unparseable answers record as untagged rather than guessed.
The output TSV is the curation pool the #68 per-feature packaging picks
from, and every row stays reviewable against its photo file.

Run on the box:
  python3 tag_focus_photos.py <focus_dir> [--endpoint http://localhost:30082/v1]
"""

import argparse
import base64
import csv
import json
import re
import time
import urllib.request
from pathlib import Path

MODEL = "nvidia/cosmos-reason2-8b"
FEATURES = ["gills", "ring", "volva", "cap"]
PROMPT = (
    "You see one mushroom photo. Answer with one JSON object only, no other "
    'text, in this exact shape: {"gills": true/false, "ring": true/false, '
    '"volva": true/false, "cap": true/false, "clear": true/false}. '
    '"gills": the underside gill surface is visible. "ring": a ring on the '
    'stem is visible. "volva": the stem base or a basal sack is visible. '
    '"cap": the cap top is visible. "clear": the mushroom is sharp, close, '
    "and well lit enough to serve as an identification reference."
)


def ask(endpoint: str, image_path: Path) -> dict | None:
    payload = {
        "model": MODEL,
        "max_tokens": 200,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "data:image/jpeg;base64,"
                            + base64.b64encode(image_path.read_bytes()).decode()
                        },
                    },
                ],
            }
        ],
    }
    req = urllib.request.Request(
        f"{endpoint}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                answer = json.load(resp)["choices"][0]["message"]["content"]
            match = re.search(r"\{[^{}]*\}", answer)
            return json.loads(match.group()) if match else None
        except (urllib.error.URLError, OSError, KeyError):
            if attempt == 3:
                return None
            time.sleep(15)
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("focus_dir", type=Path)
    ap.add_argument("--endpoint", default="http://localhost:30082/v1")
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()

    out = args.focus_dir / "feature-tags.tsv"
    done: set[str] = set()
    if out.exists():
        with out.open(newline="") as f:
            done = {row["photo_id"] for row in csv.DictReader(f, delimiter="\t")}

    with (args.focus_dir / "manifest.tsv").open(newline="") as f:
        rows = [
            r for r in csv.DictReader(f, delimiter="\t") if r["photo_id"] not in done
        ]
    if args.limit:
        rows = rows[: args.limit]
    print(f"tagging {len(rows)} photos ({len(done)} already tagged)")

    n = 0
    with out.open("a", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        if not done:
            w.writerow(["species", "photo_id", *FEATURES, "clear", "tagged"])
        for row in rows:
            path = (
                args.focus_dir
                / "photos"
                / row["species"].replace(" ", "_")
                / f"{row['photo_id']}.{row['extension']}"
            )
            if not path.exists():
                continue
            tags = ask(args.endpoint, path)
            if tags is None:
                # No row: an unanswered photo retries on the next run
                # instead of persisting as tagged-empty.
                continue
            w.writerow(
                [
                    row["species"],
                    row["photo_id"],
                    *[int(bool(tags.get(k))) for k in FEATURES],
                    int(bool(tags.get("clear"))),
                    1,
                ]
            )
            f.flush()
            n += 1
    print(f"tagged {n} photos -> {out}")


if __name__ == "__main__":
    main()
