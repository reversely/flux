"""CLI entry point: uv run flux-pipeline parse <pdf> <out.db>."""

from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    top = argparse.ArgumentParser(prog="flux-pipeline")
    sub = top.add_subparsers(dest="command", required=True)
    parse_cmd = sub.add_parser("parse", help="parse the FM 21-76 PDF into content.db")
    parse_cmd.add_argument("pdf", type=Path)
    parse_cmd.add_argument("out_db", type=Path)
    parse_cmd.add_argument(
        "--edits",
        type=Path,
        default=None,
        help="civilian-transfer edits file (default: edits/civilian_edits.json)",
    )
    walk_cmd = sub.add_parser(
        "walkthrough", help="compile the mycomorphbox trait TSV into walk_ tables"
    )
    walk_cmd.add_argument("trait_tsv", type=Path)
    walk_cmd.add_argument("db", type=Path)
    walk_cmd.add_argument(
        "--spec",
        type=Path,
        default=None,
        help="walk spec JSON naming the guide, questions, and TSV columns"
        " (default: the fungi mycomorphbox walk)",
    )
    figures_cmd = sub.add_parser(
        "figures", help="extract figure images from the PDF into the pack (#137)"
    )
    figures_cmd.add_argument("pdf", type=Path)
    figures_cmd.add_argument("db", type=Path)
    figures_cmd.add_argument("out_dir", type=Path)
    guide_cmd = sub.add_parser(
        "guide", help="compile an authored guide JSON into the node tables (#65)"
    )
    guide_cmd.add_argument("source", type=Path)
    guide_cmd.add_argument("db", type=Path)
    features_cmd = sub.add_parser(
        "features", help="extract the water-feature layer from an OSM extract (#222)"
    )
    features_cmd.add_argument("osm_file", type=Path)
    features_cmd.add_argument("out_db", type=Path)
    features_cmd.add_argument(
        "--source-url", default=None, help="recorded in the artifact's meta table"
    )
    trails_cmd = sub.add_parser(
        "trails", help="extract the walkable trail graph from an OSM extract (#148)"
    )
    trails_cmd.add_argument("osm_file", type=Path)
    trails_cmd.add_argument("out_db", type=Path)
    trails_cmd.add_argument(
        "--source-url", default=None, help="recorded in the artifact's meta table"
    )
    args = top.parse_args()

    if args.command == "trails":
        from flux_pipeline.trails import build_trails

        print(build_trails(args.osm_file, args.out_db, args.source_url))
        return

    if args.command == "features":
        from flux_pipeline.features import build_features

        print(build_features(args.osm_file, args.out_db, args.source_url))
        return

    if args.command == "figures":
        from flux_pipeline.figures import write_figures

        print(write_figures(args.pdf, args.db, args.out_dir))
        return

    if args.command == "guide":
        from flux_pipeline.guide import write_guide

        print(write_guide(args.source, args.db))
        return

    if args.command == "walkthrough":
        from flux_pipeline.walkthrough import load_spec, write_walkthrough

        spec = load_spec(args.spec) if args.spec else None
        print(write_walkthrough(args.trait_tsv, args.db, spec))
        return

    from flux_pipeline.civilian import DEFAULT_EDITS_PATH, apply_civilian_edits
    from flux_pipeline.db import summarize, write_db
    from flux_pipeline.lines import normalize
    from flux_pipeline.parse import parse_lines
    from flux_pipeline.pdfio import extract_lines

    manual = parse_lines(normalize(extract_lines(args.pdf)))
    manual = apply_civilian_edits(manual, args.edits or DEFAULT_EDITS_PATH)
    write_db(manual, args.out_db)
    print(summarize(manual))


if __name__ == "__main__":
    main()
