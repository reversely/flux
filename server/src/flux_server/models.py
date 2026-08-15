"""Pydantic models mirroring PRD section 8 (docs/prd.md).

These models are the phone/server contract; the real GN100 pipeline must
satisfy them when it replaces this stub.
"""

from typing import Literal

from pydantic import BaseModel, Field

Classification = Literal[
    "acceptable",
    "insufficient_solder",
    "excessive_solder",
    "solder_bridge",
    "shifted_joint",
    "unable_to_assess",
]

# The PRD leaves the severity vocabulary open, so the stub defines this ordered
# set; app/src/api/types.ts mirrors it. Confirm before the model phase (#2).
Severity = Literal["critical", "review", "ok"]

SEVERITY_ORDER: dict[str, int] = {"critical": 0, "review": 1, "ok": 2}


class JointRecord(BaseModel):
    joint_id: str
    bounding_box: tuple[int, int, int, int]
    classification: Classification
    confidence: float = Field(ge=0.0, le=1.0)
    severity: Severity
    supporting_frames: list[str]
    capture_quality: str


class SessionCreated(BaseModel):
    session_id: str


class FrameUploadResponse(BaseModel):
    frame_id: str
    results: list[JointRecord]


class SessionResults(BaseModel):
    session_id: str
    status: Literal["in_progress", "complete"]
    joints: list[JointRecord]
