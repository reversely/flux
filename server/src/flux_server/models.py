"""Wire models for the bare session API.

RecordStub stands in for the per-item result the next concept defines; the
routes and this module remain the contract between the app and the server.
"""

from typing import Literal

from pydantic import BaseModel

MediaMode = Literal["photo", "video"]

# PRD 2.1 interaction map: which capture kind each functionality sends.
# Photo functionalities route stills to the box perception service; video
# functionalities buffer low-fps MP4 for the VSS handoff. The coaching row
# carries both the narration captions and the MVP 2 coach loop.
FUNCTIONALITY_MEDIA_MODE: dict[str, MediaMode] = {
    "plant_fungus_id": "photo",
    "animal_id": "photo",
    "tracks_scat": "photo",
    "injury_progression": "photo",
    "trail_memory": "video",
    "hazard_watch": "video",
    "coaching": "video",
}


class RecordStub(BaseModel):
    record_id: str


class SessionCreateRequest(BaseModel):
    """Optional creation body; a session without one accepts either kind."""

    functionality: str


class SessionCreated(BaseModel):
    session_id: str
    functionality: str | None = None
    media_mode: MediaMode | None = None


class FunctionalityMode(BaseModel):
    functionality: str
    media_mode: MediaMode


class FunctionalityList(BaseModel):
    functionalities: list[FunctionalityMode]


class FrameUploadResponse(BaseModel):
    frame_id: str
    results: list[RecordStub]


class SessionResults(BaseModel):
    session_id: str
    status: Literal["in_progress", "complete", "failed"]
    records: list[RecordStub]
    summary: str | None = None
    detail: str | None = None


class VideoUploadResponse(BaseModel):
    video_id: str


class SessionFinished(BaseModel):
    """Acknowledgement of the finish trigger; poll the results route next."""

    session_id: str
    status: Literal["in_progress", "complete", "failed"]


class ChatRequest(BaseModel):
    question: str


class ChatTool(BaseModel):
    """Widget an answer can launch preloaded; prime names the model context."""

    kind: Literal["camera", "chat", "reference"]
    label: str
    prime: str | None = None
    subject: str | None = None
    question: str | None = None
    chapter: int | None = None


class ChatAnswer(BaseModel):
    """Chapter mentions in text carry the reference links (no citations field)."""

    answer_id: str
    text: str
    tool: ChatTool | None = None
