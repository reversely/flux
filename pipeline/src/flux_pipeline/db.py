"""SQLite boundary: write a ParsedManual to content.db and summarize it."""

from __future__ import annotations

import sqlite3
from dataclasses import astuple
from pathlib import Path

from flux_pipeline.parse import ParsedManual

SCHEMA = """
CREATE TABLE chapter (
    id             TEXT PRIMARY KEY,
    tile_id        INTEGER,
    fm_number      INTEGER NOT NULL UNIQUE,
    title          TEXT NOT NULL,
    priority_order INTEGER NOT NULL
);
CREATE TABLE section (
    id         TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES chapter(id),
    fm_heading TEXT,
    title      TEXT NOT NULL,
    "order"    INTEGER NOT NULL
);
CREATE TABLE block (
    id            TEXT PRIMARY KEY,
    section_id    TEXT NOT NULL REFERENCES section(id),
    "order"       INTEGER NOT NULL,
    type          TEXT NOT NULL CHECK (type IN (
        'principle', 'checklist', 'procedure_step', 'materials', 'warning',
        'note', 'reference', 'mnemonic', 'military_archive')),
    text          TEXT NOT NULL,
    figure_ref    TEXT,
    source        TEXT NOT NULL,
    review_status TEXT NOT NULL CHECK (review_status IN ('auto', 'needs_review', 'edited'))
);
CREATE TABLE figure (
    id            TEXT PRIMARY KEY,
    block_id      TEXT NOT NULL REFERENCES block(id),
    fm_figure_ref TEXT NOT NULL,
    image_path    TEXT,
    source_manual TEXT NOT NULL,
    license       TEXT NOT NULL
);
"""

_INSERTS = {
    "chapter": "INSERT INTO chapter VALUES (?, ?, ?, ?, ?)",
    "section": "INSERT INTO section VALUES (?, ?, ?, ?, ?)",
    "block": "INSERT INTO block VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    "figure": "INSERT INTO figure VALUES (?, ?, ?, ?, ?, ?)",
}


def write_db(manual: ParsedManual, out_path: Path) -> None:
    """Create out_path fresh and write every record."""
    out_path.unlink(missing_ok=True)
    with sqlite3.connect(out_path) as conn:
        conn.executescript(SCHEMA)
        for table, rows in (
            ("chapter", manual.chapters),
            ("section", manual.sections),
            ("block", manual.blocks),
            ("figure", manual.figures),
        ):
            conn.executemany(_INSERTS[table], [astuple(row) for row in rows])


def summarize(manual: ParsedManual) -> str:
    """Counts per table and per block type, one line each."""
    lines = [
        f"chapter: {len(manual.chapters)}",
        f"section: {len(manual.sections)}",
        f"block: {len(manual.blocks)}",
        f"figure: {len(manual.figures)}",
    ]
    type_counts: dict[str, int] = {}
    for block in manual.blocks:
        type_counts[block.type] = type_counts.get(block.type, 0) + 1
    for block_type in sorted(type_counts):
        lines.append(f"block/{block_type}: {type_counts[block_type]}")
    return "\n".join(lines)
