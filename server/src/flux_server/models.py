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


class ChapterSummary(BaseModel):
    id: str
    tile_id: int | None = None
    fm_number: int
    title: str
    priority_order: int


class SectionSummary(BaseModel):
    id: str
    title: str
    order: int


class ChapterDetail(ChapterSummary):
    sections: list[SectionSummary]


class Block(BaseModel):
    id: str
    order: int
    type: str
    text: str
    figure_ref: str | None = None
    source: str
    review_status: str


class BlockDetail(Block):
    section_id: str


class SectionDetail(BaseModel):
    id: str
    chapter_id: str
    fm_heading: str | None = None
    title: str
    order: int
    blocks: list[Block]


class Figure(BaseModel):
    id: str
    block_id: str
    fm_figure_ref: str
    image_path: str | None = None
    source_manual: str
    license: str


class SearchHit(BaseModel):
    block_id: str
    section_id: str
    chapter_id: str
    snippet: str


class SearchResults(BaseModel):
    query: str
    hits: list[SearchHit]


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


class WalkSpeciesCard(BaseModel):
    species: str
    edibility: Literal["edible", "inedible", "caution", "danger", "unknown"]
    edibility_raw: str
    source_title: str
    source_revid: str


class WalkQuestion(BaseModel):
    character: str
    ask_order: int
    question: str
    citation: str
    states: list[str]


class WalkAnswer(BaseModel):
    """A confirmed observation; a None state records a skipped question,
    which filters nothing."""

    character: str
    state: str | None = None


class WalkSessionState(BaseModel):
    """The whole session, recomputed from the transcript on every response.

    candidates and danger_species carry full cards when the survivor set is
    small or the walk is complete, and stay absent while the set is large;
    the counts are always present.
    """

    session_id: str
    answers: list[WalkAnswer]
    candidate_count: int
    danger_count: int
    danger_species: list[WalkSpeciesCard] | None = None
    candidates: list[WalkSpeciesCard] | None = None
    complete: bool
    question: WalkQuestion | None = None
