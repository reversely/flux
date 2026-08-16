"""Civilian transfer from military clauses (PRD 8.1, #172).

The parse marks blocks whose text carries military clauses; this module
applies the editor-approved transfer recorded in edits/civilian_edits.json.
Three actions, keyed by block id:

- rewrite: replacement text; review_status becomes "edited" so the pack
  records that the block no longer matches the manual verbatim.
- approve: the flagged text stands as printed (figurative military
  language); review_status becomes "auto".
- drop: the block leaves the pack (purely military content with no
  civilian transfer).

An edit whose id matches no parsed block raises: a manual re-source can
shift block ids, and a silently skipped edit would ship the military text
it was written to replace.
"""

import json
from pathlib import Path

from flux_pipeline.parse import ParsedManual

DEFAULT_EDITS_PATH = (
    Path(__file__).resolve().parents[2] / "edits" / "civilian_edits.json"
)


def apply_civilian_edits(manual: ParsedManual, edits_path: Path) -> ParsedManual:
    edits = {e["id"]: e for e in json.loads(edits_path.read_text())}
    blocks_by_id = {b.id: b for b in manual.blocks}
    unmatched = sorted(set(edits) - set(blocks_by_id))
    if unmatched:
        raise ValueError(
            f"civilian edits name blocks the parse did not produce: {unmatched[:5]}"
            " (block ids shifted; re-key the edits file)"
        )
    dropped: set[str] = set()
    for block_id, edit in edits.items():
        block = blocks_by_id[block_id]
        action = edit["action"]
        if action == "rewrite":
            block.text = edit["text"]
            block.review_status = "edited"
        elif action == "approve":
            block.review_status = "auto"
        elif action == "drop":
            if any(f.block_id == block_id for f in manual.figures):
                raise ValueError(f"cannot drop {block_id}: figures reference it")
            dropped.add(block_id)
        else:
            raise ValueError(f"unknown action {action!r} for {block_id}")
    if dropped:
        manual.blocks = [b for b in manual.blocks if b.id not in dropped]
    return manual
