"""VSS handoff: forward a finished session's MP4 files for summarization.

PRD 3.4 routes buffered video through VSS's OpenAI-style REST surface:
POST /files uploads each MP4, POST /summarize runs the summary against the
returned file id, and PRD 3.5 makes the client delete files after use with
retry on pending deletion.

The VideoHandoff protocol is the seam. VSSHandoff talks to a real deployment
whose base URL comes from VSS_BASE_URL (the GN100 bring-up, ticket #29, slots
in via that env var alone). When VSS_BASE_URL is unset, NotConfiguredHandoff
records what it would have sent and returns nothing, so the session honestly
stays in_progress instead of receiving a fabricated summary.
"""

import logging
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol

import httpx

logger = logging.getLogger(__name__)

SUMMARIZE_TIMEOUT_S = 600.0
DELETE_ATTEMPTS = 3
DELETE_RETRY_DELAY_S = 1.0


@dataclass
class HandoffOutcome:
    """What the handoff produced for a session: a summary or a failure."""

    status: Literal["complete", "failed"]
    summary: str | None = None
    detail: str | None = None


class VideoHandoff(Protocol):
    def summarize_session(
        self, session_id: str, videos: list[Path]
    ) -> HandoffOutcome | None:
        """Return the outcome, or None when no VSS is configured."""
        ...


class NotConfiguredHandoff:
    """Records planned VSS requests and leaves the session in progress.

    No canned summaries: without a VSS the server has no result to report,
    so it logs the requests it would have made and returns None.
    """

    def __init__(self) -> None:
        self.recorded: list[dict] = []

    def summarize_session(
        self, session_id: str, videos: list[Path]
    ) -> HandoffOutcome | None:
        for video in videos:
            plan = {
                "session_id": session_id,
                "video": str(video),
                "requests": ["POST /files", "POST /summarize", "DELETE /files/{id}"],
            }
            self.recorded.append(plan)
            logger.warning(
                "VSS_BASE_URL not configured: session %s would have sent %s "
                "through POST /files and /summarize; leaving the session "
                "in_progress",
                session_id,
                video.name,
            )
        return None


class VSSHandoff:
    """Forwards MP4s to a VSS deployment and collects the summaries."""

    def __init__(
        self,
        base_url: str,
        model: str | None = None,
        http_client: httpx.Client | None = None,
        delete_retry_delay_s: float = DELETE_RETRY_DELAY_S,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self._client = http_client or httpx.Client(timeout=SUMMARIZE_TIMEOUT_S)
        self._delete_retry_delay_s = delete_retry_delay_s

    def summarize_session(
        self, session_id: str, videos: list[Path]
    ) -> HandoffOutcome | None:
        summaries: list[str] = []
        for video in videos:
            try:
                summaries.append(self._summarize_video(video))
            except httpx.HTTPError as error:
                logger.error(
                    "VSS handoff failed for session %s video %s: %s",
                    session_id,
                    video.name,
                    error,
                )
                return HandoffOutcome(status="failed", detail=str(error))
        return HandoffOutcome(status="complete", summary="\n\n".join(summaries))

    def _summarize_video(self, video: Path) -> str:
        file_id = self._upload(video)
        try:
            return self._summarize(file_id)
        finally:
            self._delete_with_retry(file_id)

    def _upload(self, video: Path) -> str:
        with video.open("rb") as handle:
            response = self._client.post(
                f"{self.base_url}/files",
                files={"file": (video.name, handle, "video/mp4")},
                data={"purpose": "vision", "media_type": "video"},
            )
        response.raise_for_status()
        return response.json()["id"]

    def _summarize(self, file_id: str) -> str:
        body: dict = {"id": file_id}
        if self.model:
            body["model"] = self.model
        response = self._client.post(f"{self.base_url}/summarize", json=body)
        response.raise_for_status()
        payload = response.json()
        # VSS answers in OpenAI completion shape; fall back to a bare
        # summary field for older builds.
        choices = payload.get("choices")
        if choices:
            return choices[0]["message"]["content"]
        return payload["summary"]

    def _delete_with_retry(self, file_id: str) -> None:
        """PRD 3.5: remove files after use, retrying pending deletion."""
        for attempt in range(1, DELETE_ATTEMPTS + 1):
            try:
                response = self._client.delete(f"{self.base_url}/files/{file_id}")
                if response.status_code < 500:
                    return
                logger.warning(
                    "VSS delete of %s returned %s (attempt %d/%d)",
                    file_id,
                    response.status_code,
                    attempt,
                    DELETE_ATTEMPTS,
                )
            except httpx.HTTPError as error:
                logger.warning(
                    "VSS delete of %s failed (attempt %d/%d): %s",
                    file_id,
                    attempt,
                    DELETE_ATTEMPTS,
                    error,
                )
            if attempt < DELETE_ATTEMPTS:
                time.sleep(self._delete_retry_delay_s)
        logger.error(
            "VSS file %s not deleted after %d attempts", file_id, DELETE_ATTEMPTS
        )


def handoff_from_env() -> VideoHandoff:
    """Choose the handoff from VSS_BASE_URL; unset means not configured."""
    base_url = os.environ.get("VSS_BASE_URL")
    if base_url:
        return VSSHandoff(base_url=base_url, model=os.environ.get("VSS_MODEL"))
    return NotConfiguredHandoff()
