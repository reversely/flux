"""Build the Washington species checklist and BioCLIP label file from a GBIF
SPECIES_LIST download.

Reads the tab-separated extract, keeps accepted species-rank rows in the three
kingdoms the product identifies (Animalia, Plantae, Fungi), and writes two
files next to the input: checklist.tsv (all kept rows with ranks, occurrence
counts, and IUCN category) and bioclip_labels.txt (full seven-rank taxonomy
strings for species at or above --min-occurrences, the format the perception
service's BioCLIP head scores against).

Run on the box:
  ~/flux/venvs/tools/bin/python build_gbif_checklist.py <extract.csv>
"""

import argparse
import csv
from pathlib import Path

KINGDOMS = {"Animalia", "Plantae", "Fungi"}
RANKS = ["kingdom", "phylum", "class", "order", "family", "genus", "species"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("extract", type=Path, help="GBIF SPECIES_LIST csv (tab-separated)")
    ap.add_argument("--min-occurrences", type=int, default=50)
    args = ap.parse_args()

    kept: list[dict] = []
    with args.extract.open(newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if (
                row["taxonRank"] == "SPECIES"
                and row["taxonomicStatus"] == "ACCEPTED"
                and row["kingdom"] in KINGDOMS
                and all(row[r] for r in RANKS)
            ):
                kept.append(row)
    kept.sort(key=lambda r: -int(r["numberOfOccurrences"]))

    out_dir = args.extract.parent
    checklist = out_dir / "checklist.tsv"
    with checklist.open("w", newline="") as f:
        w = csv.writer(f, delimiter="\t")
        w.writerow(["speciesKey", *RANKS, "numberOfOccurrences", "iucnRedListCategory"])
        for r in kept:
            w.writerow(
                [
                    r["speciesKey"],
                    *(r[k] for k in RANKS),
                    r["numberOfOccurrences"],
                    r["iucnRedListCategory"],
                ]
            )

    labels = out_dir / "bioclip_labels.txt"
    n_labels = 0
    with labels.open("w") as f:
        for r in kept:
            if int(r["numberOfOccurrences"]) >= args.min_occurrences:
                f.write(" ".join(r[k] for k in RANKS) + "\n")
                n_labels += 1

    print(f"checklist: {len(kept)} species -> {checklist}")
    print(f"labels (>= {args.min_occurrences} occurrences): {n_labels} -> {labels}")


if __name__ == "__main__":
    main()
