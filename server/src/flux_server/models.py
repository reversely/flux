"""Wire models for the bare session API.

RecordStub stands in for the per-item result the next concept defines; the
routes and this module remain the contract between the app and the server.
"""

from typing import Literal

from pydantic import BaseModel


class RecordStub(BaseModel):
    record_id: str


class SessionCreated(BaseModel):
    session_id: str


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


class Citation(BaseModel):
    """One FM anchor an answer sentence came from (PRD 4.1 anchor IDs)."""

    anchor: str
    chapter_number: int
    chapter_title: str
    section_title: str
    tile_id: int


class ChatAnswer(BaseModel):
    answer_id: str
    text: str
    citations: list[Citation]
