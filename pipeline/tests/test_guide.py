"""The one node format (#65): two guide kinds in one pack, per-guide rebuild."""

import json
import sqlite3

import pytest
from flux_pipeline.guide import GuideSourceError, write_guide
from flux_pipeline.walkthrough import write_walkthrough

TSV_HEADER = (
    "page_title\trevid\thymeniumType\thymeniumType2\twhichGills\twhichGills2"
    "\tstipeCharacter\tstipeCharacter2\tsporePrintColor\tsporePrintColor2"
    "\tcapShape\tcapShape2\tecologicalType\tecologicalType2\thowEdible\thowEdible2"
)
TSV_ROW = (
    "Amanita phalloides\t123\tgills\t\tfree\t\tring and volva\t\twhite\t"
    "\tconvex\t\tmycorrhizal\t\tdeadly\t"
)


def guide_source(tmp_path, **overrides):
    guide = {
        "id": "knot-test",
        "kind": "process",
        "title": "Test knot",
        "tile_id": 8,
        "source": "test",
        "nodes": [
            {
                "id": "loop",
                "question": "Loop formed?",
                "screen": "Small loop.",
                "voice": "Form a small loop.",
                "answers": [{"state": "done"}, {"state": "not yet"}],
                "answer_source": "both",
                "capture_condition": "rope in frame",
                "evidence_kind": "clip",
            },
            {
                "id": "finish",
                "question": "Pulled tight?",
                "answers": [
                    {"state": "done", "implication": "Holds under load."},
                    {"state": "not yet"},
                ],
            },
        ],
    }
    guide.update(overrides)
    path = tmp_path / "guide.json"
    path.write_text(json.dumps(guide))
    return path


def test_two_kinds_coexist_in_one_pack(tmp_path):
    tsv = tmp_path / "traits.tsv"
    tsv.write_text(TSV_HEADER + "\n" + TSV_ROW + "\n")
    db = tmp_path / "pack.db"
    write_walkthrough(tsv, db)
    write_guide(guide_source(tmp_path), db)
    with sqlite3.connect(db) as conn:
        kinds = dict(conn.execute("SELECT id, kind FROM guide"))
        assert kinds == {
            "fungi-edibility": "identification",
            "knot-test": "process",
        }
        per_guide = dict(
            conn.execute("SELECT guide_id, COUNT(*) FROM walk_question GROUP BY 1")
        )
        assert per_guide == {"fungi-edibility": 6, "knot-test": 2}


def test_mushroom_rebuild_leaves_other_guides_alone(tmp_path):
    tsv = tmp_path / "traits.tsv"
    tsv.write_text(TSV_HEADER + "\n" + TSV_ROW + "\n")
    db = tmp_path / "pack.db"
    write_guide(guide_source(tmp_path), db)
    write_walkthrough(tsv, db)
    write_walkthrough(tsv, db)
    with sqlite3.connect(db) as conn:
        assert conn.execute(
            "SELECT COUNT(*) FROM walk_question WHERE guide_id = 'knot-test'"
        ).fetchone() == (2,)
        assert conn.execute(
            "SELECT COUNT(*) FROM walk_question WHERE guide_id = 'fungi-edibility'"
        ).fetchone() == (6,)


def test_node_without_capture_condition_is_user_answered(tmp_path):
    db = tmp_path / "pack.db"
    write_guide(guide_source(tmp_path), db)
    with sqlite3.connect(db) as conn:
        row = conn.execute(
            "SELECT answer_source, capture_condition FROM walk_question"
            " WHERE guide_id = 'knot-test' AND character = 'finish'"
        ).fetchone()
    assert row == ("user", None)


def test_camera_node_requires_capture_condition(tmp_path):
    path = guide_source(tmp_path)
    guide = json.loads(path.read_text())
    del guide["nodes"][0]["capture_condition"]
    path.write_text(json.dumps(guide))
    with pytest.raises(GuideSourceError):
        write_guide(path, tmp_path / "pack.db")


def test_end_state_implication_round_trips(tmp_path):
    db = tmp_path / "pack.db"
    write_guide(guide_source(tmp_path), db)
    with sqlite3.connect(db) as conn:
        row = conn.execute(
            "SELECT implication FROM walk_state"
            " WHERE guide_id = 'knot-test' AND character = 'finish'"
            " AND state = 'done'"
        ).fetchone()
    assert row == ("Holds under load.",)
