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
    status: Literal["in_progress", "complete"]
    records: list[RecordStub]
