"""VSS handoff: forward a finished session's MP4 files for summarization.

PRD 3.4 routes buffered video through the VSS agent API. Per video: POST
/api/v1/videos {filename} returns the VST storage URL, the bytes upload
multipart to that URL and the response names the VST sensor, and POST
/generate runs the agent loop (vst_video_list, video_understanding) whose
answer follows the final agent-think block in the returned value. PRD 3.5
makes the client remove the sensor after use with retry on pending deletion.

The VideoHandoff protocol is the seam. VSSHandoff talks to a real deployment
whose agent API base URL comes from VSS_BASE_URL (port 8000 on the GN100).
When VSS_BASE_URL is unset, NotConfiguredHandoff records what it would have
sent and returns nothing, so the session honestly stays in_progress instead
of receiving a fabricated summary.
"""

import logging
import os
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol

import httpx

from flux_server.prompts import trail_summary_prompt

logger = logging.getLogger(__name__)

SUMMARIZE_TIMEOUT_S = 600.0
DELETE_ATTEMPTS = 3
DELETE_RETRY_DELAY_S = 1.0

# Trail answers follow the VSS-surface shape: the practical implication for
# the user first, then the observation from the footage that supports it.
ASK_PROMPT = (
    "Call the video_understanding tool on the video {sensor_id} and answer "
    "this question about the recorded trail: {question}. "
    "Answer with the practical implication for the hiker first, in one or "
    "two sentences, then the specific observation from the video that "
    "supports it."
)

# Reports one video's ingest state ("summarizing", "done", "failed") while a
# handoff runs, so the results route can show progress mid-finish.
IngestProgress = Callable[[str, str], None]

_AGENT_THINK_RE = re.compile(r"<agent-think>.*</agent-think>", flags=re.DOTALL)


def answer_from_generate_value(value: str) -> str:
    """Strip the agent-think markup from a /generate value.

    /generate has no clean-answer field; the consumable answer is the text
    after the final closing agent-think tag.
    """
    return _AGENT_THINK_RE.sub("", value).strip()


@dataclass
class HandoffOutcome:
    """What the handoff produced for a session: a summary or a failure."""

    status: Literal["complete", "failed"]
    summary: str | None = None
    detail: str | None = None


class VideoHandoff(Protocol):
    def summarize_session(
        self,
        session_id: str,
        videos: list[Path],
        progress: IngestProgress | None = None,
        transcript: str | None = None,
    ) -> HandoffOutcome | None:
        """Return the outcome, or None when no VSS is configured."""
        ...

    def ask_session(
        self, session_id: str, videos: list[Path], question: str
    ) -> HandoffOutcome | None:
        """Answer a question over the session's clips, or None unconfigured."""
        ...


class NotConfiguredHandoff:
    """Records planned VSS requests and leaves the session in progress.

    No canned summaries: without a VSS the server has no result to report,
    so it logs the requests it would have made and returns None.
    """

    def __init__(self) -> None:
        self.recorded: list[dict] = []

    def ask_session(
        self, session_id: str, videos: list[Path], question: str
    ) -> HandoffOutcome | None:
        self.recorded.append({"session_id": session_id, "question": question})
        logger.warning(
            "VSS_BASE_URL not configured: session %s trail question dropped",
            session_id,
        )
        return None

    def summarize_session(
        self,
        session_id: str,
        videos: list[Path],
        progress: IngestProgress | None = None,
        transcript: str | None = None,
    ) -> HandoffOutcome | None:
        for video in videos:
            plan = {
                "session_id": session_id,
                "video": str(video),
                "requests": [
                    "POST /api/v1/videos",
                    "POST {storage_url}",
                    "POST /generate",
                    "DELETE {vst}/sensor/{sensor_id}",
                ],
            }
            self.recorded.append(plan)
            logger.warning(
                "VSS_BASE_URL not configured: session %s would have sent %s "
                "through the VSS agent API; leaving the session in_progress",
                session_id,
                video.name,
            )
        return None


class VSSHandoff:
    """Forwards MP4s through the VSS agent API and collects the summaries."""

    def __init__(
        self,
        base_url: str,
        http_client: httpx.Client | None = None,
        delete_retry_delay_s: float = DELETE_RETRY_DELAY_S,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._client = http_client or httpx.Client(timeout=SUMMARIZE_TIMEOUT_S)
        self._delete_retry_delay_s = delete_retry_delay_s

    def summarize_session(
        self,
        session_id: str,
        videos: list[Path],
        progress: IngestProgress | None = None,
        transcript: str | None = None,
    ) -> HandoffOutcome | None:
        report = progress or (lambda video, state: None)
        summaries: list[str] = []
        for video in videos:
            try:
                report(video.name, "summarizing")
                summaries.append(self._summarize_video(session_id, video, transcript))
                report(video.name, "done")
            except httpx.HTTPError as error:
                report(video.name, "failed")
                logger.error(
                    "VSS handoff failed for session %s video %s: %s",
                    session_id,
                    video.name,
                    error,
                )
                return HandoffOutcome(status="failed", detail=str(error))
        return HandoffOutcome(status="complete", summary="\n\n".join(summaries))

    def ask_session(
        self, session_id: str, videos: list[Path], question: str
    ) -> HandoffOutcome | None:
        """Re-upload the stored clips and ask one question over each.

        Sensors do not outlive the summarize handoff (PRD 3.5 deletes them),
        so a question re-uploads from the server's own copies and cleans up
        the same way. One answer per clip, joined like the summaries.
        """
        answers: list[str] = []
        for video in videos:
            sensor_id, sensor_url = self._upload(
                f"{session_id}_ask_{video.name}", video
            )
            try:
                response = self._client.post(
                    f"{self.base_url}/generate",
                    json={
                        "input_message": ASK_PROMPT.format(
                            sensor_id=sensor_id, question=question
                        )
                    },
                )
                response.raise_for_status()
                answers.append(answer_from_generate_value(response.json()["value"]))
            except httpx.HTTPError as error:
                logger.error(
                    "VSS ask failed for session %s video %s: %s",
                    session_id,
                    video.name,
                    error,
                )
                return HandoffOutcome(status="failed", detail=str(error))
            finally:
                self._delete_with_retry(sensor_url)
        return HandoffOutcome(status="complete", summary="\n\n".join(answers))

    def _summarize_video(
        self, session_id: str, video: Path, transcript: str | None
    ) -> str:
        # Session-qualified filename: VST names the sensor after the upload,
        # and video_001.mp4 alone would collide across sessions.
        sensor_id, sensor_url = self._upload(f"{session_id}_{video.name}", video)
        try:
            return self._generate(sensor_id, transcript)
        finally:
            self._delete_with_retry(sensor_url)

    def _upload(self, filename: str, video: Path) -> tuple[str, str]:
        """Upload one video into VST; return its sensor id and sensor URL."""
        response = self._client.post(
            f"{self.base_url}/api/v1/videos", json={"filename": filename}
        )
        response.raise_for_status()
        storage_url = response.json()["url"]
        with video.open("rb") as handle:
            upload = self._client.post(
                storage_url, files={"file": (filename, handle, "video/mp4")}
            )
        upload.raise_for_status()
        sensor_id = upload.json()["sensorId"]
        # The storage URL ends in /storage/file under the VST API root; the
        # sensor-management route lives under the same root.
        sensor_url = storage_url.removesuffix("/storage/file") + f"/sensor/{sensor_id}"
        return sensor_id, sensor_url

    def _generate(self, sensor_id: str, transcript: str | None) -> str:
        response = self._client.post(
            f"{self.base_url}/generate",
            json={"input_message": trail_summary_prompt(sensor_id, transcript)},
        )
        response.raise_for_status()
        return answer_from_generate_value(response.json()["value"])

    def _delete_with_retry(self, sensor_url: str) -> None:
        """PRD 3.5: remove the sensor after use, retrying pending deletion."""
        for attempt in range(1, DELETE_ATTEMPTS + 1):
            try:
                response = self._client.delete(sensor_url)
                if response.status_code < 500:
                    return
                logger.warning(
                    "VSS delete of %s returned %s (attempt %d/%d)",
                    sensor_url,
                    response.status_code,
                    attempt,
                    DELETE_ATTEMPTS,
                )
            except httpx.HTTPError as error:
                logger.warning(
                    "VSS delete of %s failed (attempt %d/%d): %s",
                    sensor_url,
                    attempt,
                    DELETE_ATTEMPTS,
                    error,
                )
            if attempt < DELETE_ATTEMPTS:
                time.sleep(self._delete_retry_delay_s)
        logger.error(
            "VSS sensor at %s not deleted after %d attempts",
            sensor_url,
            DELETE_ATTEMPTS,
        )


def handoff_from_env() -> VideoHandoff:
    """Choose the handoff from VSS_BASE_URL; unset means not configured."""
    base_url = os.environ.get("VSS_BASE_URL")
    if base_url:
        return VSSHandoff(base_url=base_url)
    return NotConfiguredHandoff()
