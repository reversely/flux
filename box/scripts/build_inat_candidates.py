"""Build the per-species photo-candidate table from the iNaturalist Open Data
metadata extract (#67).

Three streaming passes over the extracted metadata, smallest file first, so
nothing but the kept observation ids ever sits in memory:

1. taxa: keep species-rank taxon ids whose name appears in the GBIF regional
   checklist, tagging fungi through the ancestry string.
2. observations: keep research-grade rows inside the region's bounding box
   whose taxon survived pass 1; record taxon and observed month per uuid.
3. photos: emit one row per photo of a kept observation, with license and
   observer id so #68 can filter by license and write attribution.

Run on the box:
  ~/flux/venvs/tools/bin/python build_inat_candidates.py \
      ~/flux/corpora/inat-metadata \
      ~/flux/data/regions/washington/gbif-checklist/checklist.tsv \
      ~/flux/data/regions/washington/inat-candidates.tsv.gz
"""

import argparse
import csv
import gzip
import sys
from pathlib import Path

# Washington plus a margin; matches the checklist download's polygon extent.
BBOX = {"lat_min": 45.3, "lat_max": 49.1, "lon_min": -125.0, "lon_max": -116.8}
FUNGI_ROOT = "47170"  # iNat taxon id for kingdom Fungi


def open_table(directory: Path, stem: str):
    """The extract ships tab-separated .csv or .csv.gz depending on snapshot."""
    for name in (f"{stem}.csv.gz", f"{stem}.csv"):
        path = directory / name
        if path.exists():
            opener = gzip.open if name.endswith(".gz") else open
            return csv.DictReader(opener(path, "rt", newline=""), delimiter="\t")
    sys.exit(f"missing {stem}.csv[.gz] under {directory}")


def checklist_names(path: Path) -> set[str]:
    with path.open(newline="") as f:
        return {
            f"{row['genus']} {row['species'].split()[-1]}"
            if " " not in row["species"]
            else row["species"]
            for row in csv.DictReader(f, delimiter="\t")
        }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("metadata_dir", type=Path)
    ap.add_argument("checklist", type=Path)
    ap.add_argument("out", type=Path)
    args = ap.parse_args()

    names = checklist_names(args.checklist)
    print(f"checklist: {len(names)} species names")

    taxa: dict[str, tuple[str, str]] = {}
    for row in open_table(args.metadata_dir, "taxa"):
        if row["rank"] == "species" and row["name"] in names:
            fungi = "1" if f"/{FUNGI_ROOT}/" in f"/{row['ancestry']}/" else "0"
            taxa[row["taxon_id"]] = (row["name"], fungi)
    print(f"taxa kept: {len(taxa)}")

    obs: dict[str, tuple[str, str]] = {}
    n_seen = 0
    for row in open_table(args.metadata_dir, "observations"):
        n_seen += 1
        if row["quality_grade"] != "research" or row["taxon_id"] not in taxa:
            continue
        try:
            lat, lon = float(row["latitude"]), float(row["longitude"])
        except ValueError:
            continue
        if not (
            BBOX["lat_min"] <= lat <= BBOX["lat_max"]
            and BBOX["lon_min"] <= lon <= BBOX["lon_max"]
        ):
            continue
        month = row["observed_on"][5:7] if len(row["observed_on"]) >= 7 else ""
        obs[row["observation_uuid"]] = (row["taxon_id"], month)
    print(f"observations kept: {len(obs)} of {n_seen}")

    n_photos = 0
    with gzip.open(args.out, "wt", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(
            [
                "species",
                "is_fungi",
                "taxon_id",
                "month",
                "photo_id",
                "extension",
                "license",
                "observer_id",
                "position",
            ]
        )
        for row in open_table(args.metadata_dir, "photos"):
            kept = obs.get(row["observation_uuid"])
            if not kept:
                continue
            taxon_id, month = kept
            name, fungi = taxa[taxon_id]
            w.writerow(
                [
                    name,
                    fungi,
                    taxon_id,
                    month,
                    row["photo_id"],
                    row["extension"],
                    row["license"],
                    row["observer_id"],
                    row["position"],
                ]
            )
            n_photos += 1
    print(f"photo candidates: {n_photos} -> {args.out}")


if __name__ == "__main__":
    main()
