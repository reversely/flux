"""Retrieval seam behind POST /v1/chat.

The chat route answers through the Retriever protocol. NoPackRetriever states
that no content pack is loaded and carries no tool launch. NemotronRetriever
(nemotron.py, ticket #44) answers through the box's OpenAI-compatible endpoint
when FLUX_NEMOTRON_URL is set. The reader over the anchored pack SQLite
(contracts/pack-format.md, ticket #26) implements the same protocol and slots
in through retriever_from_env once the pack format lands.
"""

import os
import uuid
from pathlib import Path
from typing import Protocol

from flux_server.models import ChatAnswer

DEFAULT_NEMOTRON_MODEL = "nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8"

NO_PACK_TEXT = (
    "No content pack is loaded on this server, so there is nothing to answer "
    "from. Point FLUX_CONTENT_DB at an anchored content pack and restart the "
    "server."
)


class Retriever(Protocol):
    def answer(self, question: str) -> ChatAnswer: ...


class NoPackRetriever:
    """Answers every question with the no-pack notice and no tool launch."""

    def answer(self, question: str) -> ChatAnswer:
        return ChatAnswer(
            answer_id=f"ans_{uuid.uuid4().hex[:8]}",
            text=NO_PACK_TEXT,
        )


def retriever_from_env() -> Retriever:
    """Choose the retriever from FLUX_NEMOTRON_URL, then FLUX_CONTENT_DB.

    FLUX_NEMOTRON_URL points at the box's OpenAI-compatible endpoint (#43)
    and selects the Nemotron answerer; FLUX_NEMOTRON_MODEL and
    FLUX_GUIDE_CORPUS override the served model name and the corpus path.
    Otherwise, unset or missing FLUX_CONTENT_DB means no pack; the server
    answers honestly that nothing is loaded. A present database raises until
    the pack reader (#26) exists, because silently ignoring a configured pack
    would hide a misdeployment.
    """
    nemotron_url = os.environ.get("FLUX_NEMOTRON_URL")
    if nemotron_url:
        # Imported here so the plain no-pack server never pays for httpx
        # or the corpus read.
        from flux_server.nemotron import DEFAULT_CORPUS_PATH, NemotronRetriever

        return NemotronRetriever(
            base_url=nemotron_url,
            model=os.environ.get("FLUX_NEMOTRON_MODEL", DEFAULT_NEMOTRON_MODEL),
            corpus_path=Path(os.environ.get("FLUX_GUIDE_CORPUS", DEFAULT_CORPUS_PATH)),
        )
    db = os.environ.get("FLUX_CONTENT_DB")
    if db and Path(db).is_file():
        raise NotImplementedError(
            "pack retrieval over contracts/pack-format.md is not implemented yet (#26)"
        )
    return NoPackRetriever()
