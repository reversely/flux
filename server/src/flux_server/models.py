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


class IdentificationRecord(BaseModel):
    """One candidate from the box perception relay (#105): the model that
    produced it, the candidate label, and its score."""

    source: Literal["speciesnet", "bioclip", "fungitastic"]
    label: str
    score: float


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
    # Real identification candidates from the perception relay; absent when
    # no perception endpoint is configured (#105). records stays alongside
    # the stub field so shipped clients keep their contract.
    identifications: list[IdentificationRecord] | None = None


class IngestEntry(BaseModel):
    """One clip's place in the VSS handoff while a finish runs (#106)."""

    video: str
    state: Literal["summarizing", "done", "failed"]


class SessionResults(BaseModel):
    session_id: str
    status: Literal["in_progress", "complete", "failed"]
    records: list[RecordStub]
    identifications: list[IdentificationRecord] | None = None
    summary: str | None = None
    detail: str | None = None
    # Per-clip handoff progress; absent before the finish starts (#106).
    ingest: list[IngestEntry] | None = None
    # What the user said while filming, transcribed on the box (#168);
    # absent when no speech backend is configured or the clips are silent.
    transcript: str | None = None


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
    """A confirmed observation. `states` selects any-of within the
    character; empty or absent alongside a None `state` records a skip,
    which filters nothing. `state` remains for single-answer clients."""

    character: str
    state: str | None = None
    states: list[str] | None = None


class WalkSpeciesDetail(WalkSpeciesCard):
    traits: dict[str, list[str]]
    image: bool = False
    image_artist: str | None = None
    image_license: str | None = None


class WalkSessionState(BaseModel):
    """The whole session, recomputed from the transcript on every response.

    danger_species carries full cards on every step (#136); candidates
    carries them when the survivor set is small or the walk is complete and
    stays absent while the set is large. The counts are always present.
    """

    session_id: str
    answers: list[WalkAnswer]
    questions: list[WalkQuestion]
    candidate_count: int
    danger_count: int
    danger_species: list[WalkSpeciesCard] | None = None
    candidates: list[WalkSpeciesCard] | None = None
    complete: bool
    question: WalkQuestion | None = None


class CoachSessionCreate(BaseModel):
    """Names the knot to coach; the step list comes back in the state."""

    knot: str


class CoachStep(BaseModel):
    """One coached step: the screen fragment and the spoken line."""

    screen: str
    voice: str


class CoachSessionState(BaseModel):
    """The pointer plus the full step list, recomputed from the transcript."""

    session_id: str
    knot: str
    name: str
    step: int
    steps: list[CoachStep]


class CoachClipResult(BaseModel):
    """One clip's classification and the pointer after it."""

    prediction: int | None = None
    step: int
    advanced: bool


class SpeechTrace(BaseModel):
    """Where a speech inference ran; shown raw in the app's traces tab."""

    engine: str
    model: str
    latency_ms: int


class TranscriptionResult(BaseModel):
    """One utterance transcribed on the box."""

    text: str
    trace: SpeechTrace


class NarrationRequest(BaseModel):
    """Text to synthesize; voice picks a Kokoro voice, absent for default."""

    text: str
    voice: str | None = None


class NarrationCreated(BaseModel):
    """A synthesized narration, fetchable at audio_url until server restart."""

    narration_id: str
    audio_url: str
    media_type: str
    voice: str
    trace: SpeechTrace


class WalkUtteranceResult(BaseModel):
    """A spoken walk answer: the transcript, what it mapped to, and the
    session after applying it. ask_again means nothing matched exactly and
    the node did not advance."""

    transcript: str
    action: Literal["answer", "skip", "undo", "repeat", "ask_again"]
    character: str | None = None
    state: str | None = None
    trace: SpeechTrace
    walk: "WalkSessionState"


class TrailQuestion(BaseModel):
    """A question asked over a finished trail session (#106)."""

    question: str


class TrailAnswer(BaseModel):
    """The VSS agent's answer over the session's clips: implication first."""

    session_id: str
    answer: str
