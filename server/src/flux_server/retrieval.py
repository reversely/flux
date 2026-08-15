"""Retrieval seam behind POST /v1/chat.

The chat route answers through the Retriever protocol. The only implementation
today is NoPackRetriever, which states that no content pack is loaded and cites
nothing. The reader over the anchored pack SQLite (contracts/pack-format.md,
ticket #26) implements the same protocol and slots in through
retriever_from_env once the pack format lands.
"""

import os
import uuid
from pathlib import Path
from typing import Protocol

from flux_server.models import ChatAnswer

NO_PACK_TEXT = (
    "No content pack is loaded on this server, so there is nothing to answer "
    "from. Point FLUX_CONTENT_DB at an anchored content pack and restart the "
    "server."
)


class Retriever(Protocol):
    def answer(self, question: str) -> ChatAnswer: ...


class NoPackRetriever:
    """Answers every question with the no-pack notice and zero citations."""

    def answer(self, question: str) -> ChatAnswer:
        return ChatAnswer(
            answer_id=f"ans_{uuid.uuid4().hex[:8]}",
            text=NO_PACK_TEXT,
            citations=[],
        )


def retriever_from_env() -> Retriever:
    """Choose the retriever from FLUX_CONTENT_DB.

    Unset or missing means no pack; the server answers honestly that nothing
    is loaded. A present database raises until the pack reader (#26) exists,
    because silently ignoring a configured pack would hide a misdeployment.
    """
    db = os.environ.get("FLUX_CONTENT_DB")
    if db and Path(db).is_file():
        raise NotImplementedError(
            "pack retrieval over contracts/pack-format.md is not implemented yet (#26)"
        )
    return NoPackRetriever()
