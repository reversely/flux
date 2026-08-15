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
    args = top.parse_args()

    from flux_pipeline.db import summarize, write_db
    from flux_pipeline.lines import normalize
    from flux_pipeline.parse import parse_lines
    from flux_pipeline.pdfio import extract_lines

    manual = parse_lines(normalize(extract_lines(args.pdf)))
    write_db(manual, args.out_db)
    print(summarize(manual))


if __name__ == "__main__":
    main()
