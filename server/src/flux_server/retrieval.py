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

NO_MODEL_TEXT = (
    "A content pack is installed, and the content API serves it, but chat "
    "needs the Nemotron endpoint. Set FLUX_NEMOTRON_URL and restart the "
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


class NoModelRetriever:
    """Answers that chat is off until the Nemotron endpoint is configured.

    Selected when a pack is installed without FLUX_NEMOTRON_URL: the content
    API serves the pack, and chat states its own missing dependency instead
    of failing server startup.
    """

    def answer(self, question: str) -> ChatAnswer:
        return ChatAnswer(
            answer_id=f"ans_{uuid.uuid4().hex[:8]}",
            text=NO_MODEL_TEXT,
        )


def retriever_from_env(research_queue=None) -> Retriever:
    """Choose the retriever from FLUX_NEMOTRON_URL, then FLUX_CONTENT_DB.

    FLUX_NEMOTRON_URL points at the box's OpenAI-compatible endpoint (#43)
    and selects the Nemotron answerer; FLUX_NEMOTRON_MODEL and
    FLUX_GUIDE_CORPUS override the served model name and the corpus path.
    Otherwise, unset or missing FLUX_CONTENT_DB means no pack and the server
    answers that nothing is loaded, while a present database without the
    Nemotron endpoint answers that chat waits on FLUX_NEMOTRON_URL.
    """
    nemotron_url = os.environ.get("FLUX_NEMOTRON_URL")
    if nemotron_url:
        # Imported here so the plain no-pack server never pays for httpx
        # or the corpus read.
        from flux_server.content import content_store_from_env
        from flux_server.nemotron import DEFAULT_CORPUS_PATH, NemotronRetriever

        return NemotronRetriever(
            base_url=nemotron_url,
            model=os.environ.get("FLUX_NEMOTRON_MODEL", DEFAULT_NEMOTRON_MODEL),
            corpus_path=Path(os.environ.get("FLUX_GUIDE_CORPUS", DEFAULT_CORPUS_PATH)),
            # The retriever's own pack view for two-tier answers (#185);
            # the content routes hold a separate read-only handle.
            content=content_store_from_env(),
            research_queue=research_queue,
        )
    db = os.environ.get("FLUX_CONTENT_DB")
    if db and Path(db).is_file():
        return NoModelRetriever()
    return NoPackRetriever()
