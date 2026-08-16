"""Compile a process-guide source file into the pack's node tables (#65).

One node format serves both guide kinds: an identification walk's answers
eliminate candidates (the mycomorphbox compiler in walkthrough.py), a
process walk's answers advance steps. This compiler reads an authored JSON
guide and emits its nodes into the same walk_ tables, per-guide idempotent,
so many guides coexist in one pack.

The source carries the copy decisions the node format encodes: a screen
fragment and a voice line per node (never one field serving both), verbatim
expert terminology, and a per-node capture-activation condition. A node
without a capture condition is user-answered; it can never cause a capture.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from flux_pipeline.walkthrough import _ensure_schema, _replace_guide

REQUIRED_NODE_KEYS = {"id", "question", "answers"}
ANSWER_SOURCES = {"user", "camera", "both"}
EVIDENCE_KINDS = {None, "frame", "clip"}


class GuideSourceError(ValueError):
    """The guide source violates the node format."""


def _check_node(node: dict, index: int) -> None:
    missing = REQUIRED_NODE_KEYS - node.keys()
    if missing:
        raise GuideSourceError(f"node {index}: missing {sorted(missing)}")
    if node.get("answer_source", "user") not in ANSWER_SOURCES:
        raise GuideSourceError(f"node {node['id']}: bad answer_source")
    if node.get("evidence_kind") not in EVIDENCE_KINDS:
        raise GuideSourceError(f"node {node['id']}: bad evidence_kind")
    if node.get("answer_source", "user") != "user" and not node.get(
        "capture_condition"
    ):
        raise GuideSourceError(
            f"node {node['id']}: a camera-answerable node states its "
            "capture-activation condition"
        )


def write_guide(source_path: Path, db_path: Path) -> str:
    guide = json.loads(source_path.read_text())
    guide_id = guide["id"]
    kind = guide.get("kind", "process")
    nodes = guide["nodes"]
    for index, node in enumerate(nodes):
        _check_node(node, index)

    with sqlite3.connect(db_path) as conn:
        _ensure_schema(conn)
        _replace_guide(
            conn,
            guide_id,
            kind,
            guide["title"],
            guide.get("tile_id"),
            guide.get("source", source_path.name),
        )
        for order, node in enumerate(nodes, start=1):
            conn.execute(
                "INSERT INTO walk_question"
                " (guide_id, character, ask_order, question, citation, screen,"
                "  voice, block_id, figure_id, anchor, answer_source,"
                "  capture_condition, evidence_kind, reference_image)"
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    guide_id,
                    node["id"],
                    order,
                    node["question"],
                    node.get("citation", guide.get("source", source_path.name)),
                    node.get("screen"),
                    node.get("voice"),
                    node.get("block_id"),
                    node.get("figure_id"),
                    node.get("anchor"),
                    node.get("answer_source", "user"),
                    node.get("capture_condition"),
                    node.get("evidence_kind"),
                    node.get("reference_image"),
                ),
            )
            for answer in node["answers"]:
                conn.execute(
                    "INSERT INTO walk_state"
                    " (guide_id, character, state, implication)"
                    " VALUES (?, ?, ?, ?)",
                    (
                        guide_id,
                        node["id"],
                        answer["state"],
                        answer.get("implication"),
                    ),
                )
    return f"guide: {guide_id} ({kind}), {len(nodes)} nodes -> {db_path}"
