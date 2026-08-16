"""Pull the #68 curation material: field photos of the danger-tier fungi.

From the #67 candidate table, select the fungi whose trait-table edibility
sits in the danger tier plus every species of the pilot genera (Agaricus and
Amanita), and download up to a per-species cap of medium-size photos from the
iNaturalist open-data bucket: pack-shippable licenses first (CC0, CC-BY,
CC-BY-SA), spread across observed months so the set covers growth stages.
The manifest carries photo id, license, and observer id, which is the
attribution iNaturalist requires. Downloads resume: an existing file skips.

Run on the box:
  python3 fetch_focus_photos.py <inat-candidates.tsv.gz> <mycomorphbox.tsv> <out_dir>
"""

import argparse
import csv
import gzip
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

BUCKET = "https://inaturalist-open-data.s3.amazonaws.com"
USER_AGENT = "flux-lifekit-focus-photos/1.0 (offline survival assistant build)"
PER_SPECIES = 12
PILOT_GENERA = ("Agaricus", "Amanita")
DANGER_RAW = {"deadly", "poisonous", "allergenic"}
# Pack-shippable first; NC photos stay usable box-side (PRD 8.2 posture).
LICENSE_RANK = {"CC0": 0, "CC-BY": 1, "CC-BY-SA": 2, "CC-BY-NC": 3, "CC-BY-NC-SA": 4}


def danger_species(trait_tsv: Path) -> set[str]:
    kept = set()
    with trait_tsv.open(newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            values = {
                (row.get(k) or "").strip().lower() for k in ("howEdible", "howEdible2")
            }
            if values & DANGER_RAW:
                kept.add(row["page_title"])
    return kept


def select(candidates_gz: Path, focus: set[str]) -> dict[str, list[dict]]:
    """Per species: the cap's best photos, license rank first, then spread
    across months so one flush week cannot fill the whole set."""
    pools: dict[str, list[dict]] = defaultdict(list)
    with gzip.open(candidates_gz, "rt", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if row["is_fungi"] != "1":
                continue
            name = row["species"]
            if name not in focus and not name.startswith(PILOT_GENERA):
                continue
            if row["license"] in LICENSE_RANK:
                pools[name].append(row)
    chosen: dict[str, list[dict]] = {}
    for name, rows in pools.items():
        rows.sort(key=lambda r: (LICENSE_RANK[r["license"]], r["photo_id"]))
        by_month: dict[str, list[dict]] = defaultdict(list)
        for row in rows:
            by_month[row["month"]].append(row)
        picked: list[dict] = []
        while len(picked) < PER_SPECIES and any(by_month.values()):
            for month in sorted(by_month):
                if by_month[month] and len(picked) < PER_SPECIES:
                    picked.append(by_month[month].pop(0))
        chosen[name] = picked
    return chosen


def fetch(url: str) -> bytes | None:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return None
            if err.code not in (429, 503) or attempt == 3:
                raise
            time.sleep(2**attempt)
        except (urllib.error.URLError, OSError):
            if attempt == 3:
                raise
            time.sleep(30)
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("candidates_gz", type=Path)
    ap.add_argument("trait_tsv", type=Path)
    ap.add_argument("out_dir", type=Path)
    args = ap.parse_args()
    (args.out_dir / "photos").mkdir(parents=True, exist_ok=True)

    focus = danger_species(args.trait_tsv)
    chosen = select(args.candidates_gz, focus)
    total = sum(len(v) for v in chosen.values())
    print(f"focus species with photos: {len(chosen)}; photos selected: {total}")

    n = 0
    with (args.out_dir / "manifest.tsv").open("w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(
            ["species", "photo_id", "extension", "license", "observer_id", "month"]
        )
        for name, rows in sorted(chosen.items()):
            species_dir = args.out_dir / "photos" / name.replace(" ", "_")
            species_dir.mkdir(exist_ok=True)
            for row in rows:
                ext = row["extension"] or "jpg"
                dest = species_dir / f"{row['photo_id']}.{ext}"
                if not dest.exists():
                    data = fetch(f"{BUCKET}/photos/{row['photo_id']}/medium.{ext}")
                    if data is None:
                        continue
                    dest.write_bytes(data)
                    time.sleep(0.3)
                w.writerow(
                    [
                        name,
                        row["photo_id"],
                        ext,
                        row["license"],
                        row["observer_id"],
                        row["month"],
                    ]
                )
                n += 1
    print(f"downloaded or kept {n} photos -> {args.out_dir}")


if __name__ == "__main__":
    main()
