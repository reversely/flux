"""Filter the HowTo100M refined-caption mirror to survival-topic video-id lists.

The mirror is one 8.5 GB JSON line containing bare NaN tokens, which strict
streaming parsers reject, so this never parses the document as one JSON value.
It streams bytes, splits on the record delimiter (}, "<index>": {), repairs
each small record (NaN to null), and json.loads records one at a time. A
record that still fails to parse increments a skip counter instead of ending
the run. A vid qualifies for a topic at 2+ matching clips.

Run on the box:
  ~/flux/venvs/tools/bin/python filter_howto100m.py
"""

import json
import os
import re
from collections import defaultdict

TOPICS = {
    "knots": [
        "bowline",
        "clove hitch",
        "taut-line",
        "tautline",
        "figure eight knot",
        "figure-eight knot",
        "square knot",
        "truckers hitch",
        "trucker's hitch",
        "half hitch",
        "sheet bend",
        "lashing",
        "tie a knot",
        "tying a knot",
        "tie this knot",
        "fishing knot",
    ],
    "fire": [
        "start a fire",
        "starting a fire",
        "fire starter",
        "ferro rod",
        "flint and steel",
        "bow drill",
        "tinder bundle",
        "fire by friction",
    ],
    "shelter": [
        "build a shelter",
        "tarp shelter",
        "lean-to",
        "lean to shelter",
        "pitch a tent",
        "set up a tent",
        "setting up a tent",
        "debris hut",
    ],
    "water": [
        "purify water",
        "purifying water",
        "water purification",
        "filter water",
        "water filter",
        "iodine tablet",
    ],
    "first_aid": [
        "cpr",
        "chest compression",
        "tourniquet",
        "splint",
        "first aid",
        "recovery position",
        "snake bite",
        "snakebite",
    ],
    "foraging": [
        "edible plant",
        "edible plants",
        "foraging",
        "identify mushroom",
        "mushroom identification",
        "chanterelle",
        "amanita",
    ],
    "trapping_fishing": [
        "snare",
        "fish trap",
        "fishing line",
        "gut a fish",
        "clean a fish",
        "filleting",
    ],
}

DELIM = re.compile(rb'\},\s*"\d+":\s*\{')
CHUNK = 1 << 23


def records(path: str):
    """Yield raw record bodies (the {...} content between index keys)."""
    carry = b""
    with open(path, "rb") as f:
        first = True
        while True:
            raw = f.read(CHUNK)
            buf = carry + raw
            if first and buf:
                # Drop the document opening: {"0": {
                m = re.match(rb'\s*\{\s*"\d+":\s*\{', buf)
                if m:
                    buf = buf[m.end() :]
                    first = False
            pieces = DELIM.split(buf)
            if raw:
                carry = pieces.pop()
                yield from pieces
            else:
                tail = pieces.pop() if pieces else carry
                yield from pieces
                yield tail.rstrip().removesuffix(b"}}").rstrip()
                return


def main() -> None:
    hits: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    src = os.path.expanduser(
        "~/flux/corpora/howto100m-captions/htm_llama3_refined.json"
    )
    parsed = skipped = 0
    for body in records(src):
        if not body:
            continue
        try:
            row = json.loads(b"{" + body.replace(b"NaN", b"null") + b"}")
        except ValueError:
            skipped += 1
            continue
        parsed += 1
        blob = ((row.get("text") or "") + " " + (row.get("refined_text") or "")).lower()
        for topic, terms in TOPICS.items():
            if any(t in blob for t in terms):
                hits[topic][row["vid"]] += 1

    out_dir = os.path.expanduser("~/flux/corpora/howto100m-captions/subsets")
    os.makedirs(out_dir, exist_ok=True)
    summary = {"parsed": parsed, "skipped": skipped}
    for topic, vids in hits.items():
        keep = sorted(v for v, n in vids.items() if n >= 2)
        summary[topic] = {"videos_2plus": len(keep), "videos_any": len(vids)}
        with open(f"{out_dir}/{topic}.txt", "w") as f:
            f.write("\n".join(keep) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
