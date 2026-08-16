"""The civilian-transfer apply step: three actions, loud failure on drift."""

import json

import pytest
from flux_pipeline.civilian import DEFAULT_EDITS_PATH, apply_civilian_edits
from flux_pipeline.parse import Block, Figure, ParsedManual


def make_block(block_id: str) -> Block:
    return Block(
        id=block_id,
        section_id="s1",
        order=1,
        type="principle",
        text="If the enemy is near, hide.",
        figure_ref=None,
        source="FM 21-76",
        review_status="needs_review",
    )


def write_edits(tmp_path, edits):
    path = tmp_path / "edits.json"
    path.write_text(json.dumps(edits))
    return path


def test_rewrite_approve_and_drop(tmp_path):
    manual = ParsedManual(blocks=[make_block("b1"), make_block("b2"), make_block("b3")])
    path = write_edits(
        tmp_path,
        [
            {
                "id": "b1",
                "action": "rewrite",
                "text": "If a hazard is near, take cover.",
            },
            {"id": "b2", "action": "approve"},
            {"id": "b3", "action": "drop"},
        ],
    )
    manual = apply_civilian_edits(manual, path)
    by_id = {b.id: b for b in manual.blocks}
    assert by_id["b1"].text == "If a hazard is near, take cover."
    assert by_id["b1"].review_status == "edited"
    assert by_id["b2"].review_status == "auto"
    assert by_id["b2"].text == "If the enemy is near, hide."  # verbatim
    assert "b3" not in by_id


def test_unmatched_id_raises(tmp_path):
    manual = ParsedManual(blocks=[make_block("b1")])
    path = write_edits(tmp_path, [{"id": "gone", "action": "approve"}])
    with pytest.raises(ValueError, match="gone"):
        apply_civilian_edits(manual, path)


def test_drop_with_figures_raises(tmp_path):
    block = make_block("b1")
    manual = ParsedManual(
        blocks=[block],
        figures=[
            Figure(
                id="f1",
                block_id="b1",
                fm_figure_ref="1-1",
                image_path=None,
                source_manual="FM 21-76",
                license="PD",
            )
        ],
    )
    path = write_edits(tmp_path, [{"id": "b1", "action": "drop"}])
    with pytest.raises(ValueError, match="figures"):
        apply_civilian_edits(manual, path)


def test_committed_edits_file_is_well_formed():
    edits = json.loads(DEFAULT_EDITS_PATH.read_text())
    ids = [e["id"] for e in edits]
    assert len(ids) == len(set(ids))
    for edit in edits:
        assert edit["action"] in ("rewrite", "approve", "drop")
        if edit["action"] == "rewrite":
            assert edit["text"].strip()
