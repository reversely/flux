import sqlite3

from flux_pipeline.db import summarize, write_db
from flux_pipeline.lines import Line
from flux_pipeline.parse import parse_lines


def small_manual():
    return parse_lines(
        [
            Line("CHAPTER 7 - FIRECRAFT", "bold", 15.0),
            Line("Fire lead paragraph (Figure 7-1).", "body", 8.0),
            Line("SITE SELECTION", "bold_oblique", 15.0),
            Line("Note: Choose a dry spot.", "body", 8.0),
        ]
    )


def test_write_db_round_trips_all_tables(tmp_path):
    db_path = tmp_path / "content.db"
    write_db(small_manual(), db_path)
    conn = sqlite3.connect(db_path)
    assert conn.execute("SELECT count(*) FROM chapter").fetchone()[0] == 1
    assert conn.execute("SELECT count(*) FROM section").fetchone()[0] == 2
    assert conn.execute("SELECT count(*) FROM block").fetchone()[0] == 2
    assert conn.execute("SELECT count(*) FROM figure").fetchone()[0] == 1
    block_id, figure_ref = conn.execute(
        "SELECT id, figure_ref FROM block WHERE figure_ref IS NOT NULL"
    ).fetchone()
    assert figure_ref == "7-1"
    assert (
        conn.execute(
            "SELECT block_id FROM figure WHERE fm_figure_ref = '7-1'"
        ).fetchone()[0]
        == block_id
    )


def test_block_type_check_constraint_rejects_unknown_type(tmp_path):
    db_path = tmp_path / "content.db"
    write_db(small_manual(), db_path)
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "INSERT INTO block VALUES ('x', 'fm21-76-ch07-intro', 9,"
            " 'unknown', 't', NULL, 'FM 21-76', 'auto')"
        )
        raised = False
    except sqlite3.IntegrityError:
        raised = True
    assert raised


def test_summarize_counts_tables_and_block_types():
    summary = summarize(small_manual())
    assert "chapter: 1" in summary
    assert "section: 2" in summary
    assert "block/note: 1" in summary
    assert "block/principle: 1" in summary
