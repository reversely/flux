"""FastAPI app: sessions, frame and video storage, VSS handoff, results.

Photo frames wait on the box perception service; MP4 videos forward to VSS
on POST /sessions/{id}/finish (PRD 3.4) and the summary comes back through
the results route. The routes and models.py are the contract with the app.
"""

import asyncio
import hashlib
import json
import os
from pathlib import Path

import httpx
from fastapi import (
    FastAPI,
    Form,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from flux_server.coach import (
    KNOTS,
    ClipUnreadableError,
    CoachStore,
    StepClassifier,
    advance_pointer,
    classifier_from_env,
    extract_frames,
)
from flux_server.content import ContentStore, content_store_from_env
from flux_server.models import (
    FUNCTIONALITY_MEDIA_MODE,
    Block,
    BlockDetail,
    ChapterDetail,
    ChapterSummary,
    ChatAnswer,
    ChatRequest,
    CoachClipResult,
    CoachSessionCreate,
    CoachSessionState,
    CoachStep,
    Figure,
    FrameUploadResponse,
    FunctionalityList,
    FunctionalityMode,
    NarrationCreated,
    NarrationRequest,
    SearchResults,
    SectionDetail,
    SessionCreated,
    SessionCreateRequest,
    SessionFinished,
    SessionResults,
    SpeechTrace,
    TranscriptionResult,
    VideoUploadResponse,
    WalkAnswer,
    WalkSessionState,
    WalkSpeciesDetail,
    WalkUtteranceResult,
)
from flux_server.retrieval import Retriever, retriever_from_env
from flux_server.speech import SpeechService, map_utterance, speech_from_env
from flux_server.storage import SessionStore, UnplayableVideoError
from flux_server.vss import VideoHandoff, handoff_from_env
from flux_server.walkthrough import WalkthroughStore, walkthrough_store_from_env

DEFAULT_DATA_DIR = Path("data/sessions")

# Distinguishes "argument not passed" from an explicit None, which means
# the server runs without an installed content pack.
_FROM_ENV = object()


def create_app(
    data_dir: Path | None = None,
    retriever: Retriever | None = None,
    handoff: VideoHandoff | None = None,
    content: ContentStore | None | object = _FROM_ENV,
    tile_archive: Path | None | object = _FROM_ENV,
    walkthrough: WalkthroughStore | None | object = _FROM_ENV,
    coach_classifier: StepClassifier | None | object = _FROM_ENV,
    speech: SpeechService | None | object = _FROM_ENV,
) -> FastAPI:
    """Build the app around one on-disk session store and one retriever."""
    if data_dir is None:
        data_dir = Path(os.environ.get("FLUX_DATA_DIR", DEFAULT_DATA_DIR))
    store = SessionStore(data_dir)
    if retriever is None:
        retriever = retriever_from_env()
    if handoff is None:
        handoff = handoff_from_env()
    if content is _FROM_ENV:
        content = content_store_from_env()
    if tile_archive is _FROM_ENV:
        configured = os.environ.get("FLUX_TILE_ARCHIVE")
        tile_archive = Path(configured) if configured else None
    if walkthrough is _FROM_ENV:
        walkthrough = walkthrough_store_from_env(data_dir)
    if coach_classifier is _FROM_ENV:
        coach_classifier = classifier_from_env()
    if speech is _FROM_ENV:
        speech = speech_from_env()
    coach_store = CoachStore(data_dir / "coach")
    app = FastAPI(title="flux stub inference server")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def require_session(session_id: str) -> None:
        if not store.session_exists(session_id):
            raise HTTPException(status_code=404, detail="unknown session")

    @app.get("/healthz")
    def healthz() -> dict[str, bool]:
        return {"ok": True}

    # exclude_none keeps optional fields absent on the wire, matching the
    # app mirror's `tool?`/`prime?` optionals rather than emitting nulls.
    @app.post("/v1/chat", response_model=ChatAnswer, response_model_exclude_none=True)
    def chat(request: ChatRequest) -> ChatAnswer:
        return retriever.answer(request.question)

    def require_content() -> ContentStore:
        if content is None or content is _FROM_ENV:
            raise HTTPException(status_code=503, detail="no content pack installed")
        return content

    @app.get("/v1/content/chapters", response_model=list[ChapterSummary])
    def list_chapters() -> list[ChapterSummary]:
        return [ChapterSummary(**row) for row in require_content().chapters()]

    @app.get("/v1/content/chapters/{chapter_id}", response_model=ChapterDetail)
    def get_chapter(chapter_id: str) -> ChapterDetail:
        row = require_content().chapter(chapter_id)
        if row is None:
            raise HTTPException(status_code=404, detail="unknown chapter")
        return ChapterDetail(**row)

    @app.get("/v1/content/sections/{section_id}", response_model=SectionDetail)
    def get_section(section_id: str) -> SectionDetail:
        row = require_content().section(section_id)
        if row is None:
            raise HTTPException(status_code=404, detail="unknown section")
        row["blocks"] = [Block(**block) for block in row["blocks"]]
        return SectionDetail(**row)

    @app.get("/v1/content/blocks/{block_id}", response_model=BlockDetail)
    def get_block(block_id: str) -> BlockDetail:
        row = require_content().block(block_id)
        if row is None:
            raise HTTPException(status_code=404, detail="unknown block")
        return BlockDetail(**row)

    @app.get("/v1/content/figures/{figure_id}", response_model=Figure)
    def get_figure(figure_id: str) -> Figure:
        row = require_content().figure(figure_id)
        if row is None:
            raise HTTPException(status_code=404, detail="unknown figure")
        return Figure(**row)

    @app.get("/v1/content/search", response_model=SearchResults)
    def search_content(
        q: str = Query(min_length=1), limit: int = Query(default=20, ge=1, le=100)
    ) -> SearchResults:
        hits = require_content().search(q, limit)
        return SearchResults(query=q, hits=hits)

    # MapLibre's pmtiles protocol reads byte windows of the archive, so the
    # route leans on FileResponse's native Range handling. HEAD is
    # registered too: the protocol probes the archive size before ranging.
    @app.get("/v1/tiles/archive")
    @app.head("/v1/tiles/archive")
    def tile_archive_file() -> FileResponse:
        if tile_archive is None or tile_archive is _FROM_ENV:
            raise HTTPException(status_code=503, detail="no tile archive installed")
        if not tile_archive.is_file():
            raise HTTPException(
                status_code=503,
                detail=f"tile archive missing at {tile_archive}",
            )
        return FileResponse(tile_archive, media_type="application/octet-stream")

    def require_media_mode(session_id: str, upload_kind: str) -> None:
        """Reject an upload whose kind contradicts the session's media mode."""
        declared = store.session_metadata(session_id).get("media_mode")
        if declared is not None and declared != upload_kind:
            raise HTTPException(
                status_code=415,
                detail=f"session is {declared} mode; {upload_kind} upload rejected",
            )

    @app.get("/v1/functionalities", response_model=FunctionalityList)
    def functionalities() -> FunctionalityList:
        return FunctionalityList(
            functionalities=[
                FunctionalityMode(functionality=name, media_mode=mode)
                for name, mode in FUNCTIONALITY_MEDIA_MODE.items()
            ]
        )

    @app.post(
        "/v1/sessions",
        response_model=SessionCreated,
        response_model_exclude_none=True,
    )
    def create_session(request: SessionCreateRequest | None = None) -> SessionCreated:
        if request is None:
            return SessionCreated(session_id=store.create_session())
        media_mode = FUNCTIONALITY_MEDIA_MODE.get(request.functionality)
        if media_mode is None:
            raise HTTPException(
                status_code=422,
                detail=f"unknown functionality: {request.functionality}",
            )
        session_id = store.create_session(
            {"functionality": request.functionality, "media_mode": media_mode}
        )
        return SessionCreated(
            session_id=session_id,
            functionality=request.functionality,
            media_mode=media_mode,
        )

    @app.post("/v1/sessions/{session_id}/frames", response_model=FrameUploadResponse)
    async def upload_frame(
        session_id: str, frame: UploadFile, captured_at: str = Form()
    ) -> FrameUploadResponse:
        require_session(session_id)
        require_media_mode(session_id, "photo")
        data = await frame.read()
        frame_id = store.add_frame(session_id, data, captured_at)
        return FrameUploadResponse(frame_id=frame_id, results=[])

    @app.post("/v1/sessions/{session_id}/videos", response_model=VideoUploadResponse)
    async def upload_video(
        session_id: str, video: UploadFile, captured_at: str = Form()
    ) -> VideoUploadResponse:
        require_session(session_id)
        require_media_mode(session_id, "video")
        data = await video.read()
        try:
            video_id = store.add_video(session_id, data, captured_at)
        except UnplayableVideoError as error:
            raise HTTPException(
                status_code=422, detail=f"unreadable video container: {error}"
            ) from error
        return VideoUploadResponse(video_id=video_id)

    @app.post("/v1/sessions/{session_id}/finish", response_model=SessionFinished)
    def finish_session(session_id: str) -> SessionFinished:
        """Close the upload phase and forward the session's MP4s to VSS.

        The handoff awaits the VSS summary and stores it as the session
        result; without a configured VSS the session stays in_progress.
        Finishing an already-finished session repeats the stored status
        without forwarding again.
        """
        require_session(session_id)
        stored = store.read_result(session_id)
        if stored is not None:
            return SessionFinished(session_id=session_id, status=stored["status"])
        videos = store.video_paths(session_id)
        if not videos:
            raise HTTPException(status_code=409, detail="session has no videos")
        outcome = handoff.summarize_session(session_id, videos)
        if outcome is None:
            return SessionFinished(session_id=session_id, status="in_progress")
        store.write_result(
            session_id,
            {
                "status": outcome.status,
                "summary": outcome.summary,
                "detail": outcome.detail,
            },
        )
        return SessionFinished(session_id=session_id, status=outcome.status)

    @app.get("/v1/sessions/{session_id}/results", response_model=SessionResults)
    def session_results(session_id: str) -> SessionResults:
        require_session(session_id)
        result = store.read_result(session_id)
        if result is None:
            return SessionResults(
                session_id=session_id, status="in_progress", records=[]
            )
        return SessionResults(
            session_id=session_id,
            status=result["status"],
            records=[],
            summary=result.get("summary"),
            detail=result.get("detail"),
        )

    @app.get("/v1/sessions/{session_id}/frames/{frame_id}")
    def get_frame(session_id: str, frame_id: str) -> FileResponse:
        require_session(session_id)
        path = store.frame_path(session_id, frame_id)
        if path is None:
            raise HTTPException(status_code=404, detail="unknown frame")
        return FileResponse(path, media_type="image/jpeg")

    def require_walkthrough() -> WalkthroughStore:
        if walkthrough is None or walkthrough is _FROM_ENV:
            raise HTTPException(
                status_code=503, detail="no walkthrough tables in the content pack"
            )
        return walkthrough

    def walk_state(walk: WalkthroughStore, session_id: str) -> WalkSessionState:
        transcript = walk.transcript(session_id)
        if transcript is None:
            raise HTTPException(status_code=404, detail="unknown walkthrough session")
        return WalkSessionState(**walk.state(session_id, transcript))

    @app.post(
        "/v1/walkthrough/sessions",
        response_model=WalkSessionState,
        response_model_exclude_none=True,
    )
    def create_walkthrough() -> WalkSessionState:
        walk = require_walkthrough()
        return walk_state(walk, walk.create())

    @app.get(
        "/v1/walkthrough/sessions/{session_id}",
        response_model=WalkSessionState,
        response_model_exclude_none=True,
    )
    def get_walkthrough(session_id: str) -> WalkSessionState:
        return walk_state(require_walkthrough(), session_id)

    @app.post(
        "/v1/walkthrough/sessions/{session_id}/answer",
        response_model=WalkSessionState,
        response_model_exclude_none=True,
    )
    def answer_walkthrough(session_id: str, answer: WalkAnswer) -> WalkSessionState:
        walk = require_walkthrough()
        if walk.transcript(session_id) is None:
            raise HTTPException(status_code=404, detail="unknown walkthrough session")
        known = walk.states.get(answer.character)
        if known is None:
            raise HTTPException(status_code=422, detail="unknown character")
        selected = (
            answer.states
            if answer.states is not None
            else ([answer.state] if answer.state is not None else [])
        )
        unknown = [s for s in selected if s not in known]
        if unknown:
            raise HTTPException(status_code=422, detail=f"unknown state: {unknown[0]}")
        walk.record(session_id, {"character": answer.character, "states": selected})
        return walk_state(walk, session_id)

    @app.get(
        "/v1/walkthrough/species",
        response_model=list[WalkSpeciesDetail],
    )
    def walkthrough_species() -> list[WalkSpeciesDetail]:
        return [WalkSpeciesDetail(**row) for row in require_walkthrough().catalog()]

    @app.get("/v1/walkthrough/images/{species}")
    def walkthrough_image(species: str) -> FileResponse:
        path = require_walkthrough().image_path(species)
        if path is None:
            raise HTTPException(status_code=404, detail="no image for this species")
        return FileResponse(path, media_type="image/jpeg")

    def coach_state(session_id: str, session: dict) -> CoachSessionState:
        knot = KNOTS[session["knot"]]
        return CoachSessionState(
            session_id=session_id,
            knot=knot.id,
            name=knot.name,
            step=advance_pointer(session["predictions"], len(knot.steps)),
            steps=[CoachStep(screen=s.screen, voice=s.voice) for s in knot.steps],
        )

    @app.post("/v1/coach/sessions", response_model=CoachSessionState)
    def create_coach_session(request: CoachSessionCreate) -> CoachSessionState:
        if request.knot not in KNOTS:
            raise HTTPException(status_code=422, detail="unknown knot")
        session_id = coach_store.create(request.knot)
        return coach_state(session_id, {"knot": request.knot, "predictions": []})

    @app.get("/v1/coach/sessions/{session_id}", response_model=CoachSessionState)
    def get_coach_session(session_id: str) -> CoachSessionState:
        session = coach_store.load(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="unknown coach session")
        return coach_state(session_id, session)

    @app.post("/v1/coach/sessions/{session_id}/clip", response_model=CoachClipResult)
    async def coach_clip(session_id: str, video: UploadFile) -> CoachClipResult:
        session = coach_store.load(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="unknown coach session")
        if coach_classifier is None or coach_classifier is _FROM_ENV:
            raise HTTPException(status_code=503, detail="coach model not configured")
        knot = KNOTS[session["knot"]]
        data = await video.read()
        # ffmpeg decodes QuickTime directly, so no remux is needed here.
        try:
            frames = extract_frames(data)
        except ClipUnreadableError as error:
            raise HTTPException(
                status_code=422, detail=f"unreadable clip: {error}"
            ) from error
        before = advance_pointer(session["predictions"], len(knot.steps))
        prediction = coach_classifier.classify(knot, frames)
        session = coach_store.record(session_id, prediction)
        after = advance_pointer(session["predictions"], len(knot.steps))
        return CoachClipResult(
            prediction=prediction, step=after, advanced=after > before
        )

    @app.post(
        "/v1/walkthrough/sessions/{session_id}/undo",
        response_model=WalkSessionState,
        response_model_exclude_none=True,
    )
    def undo_walkthrough(session_id: str) -> WalkSessionState:
        walk = require_walkthrough()
        if walk.transcript(session_id) is None:
            raise HTTPException(status_code=404, detail="unknown walkthrough session")
        walk.undo(session_id)
        return walk_state(walk, session_id)

    def require_speech() -> SpeechService:
        if speech is None or speech is _FROM_ENV:
            raise HTTPException(status_code=503, detail="speech backend not configured")
        return speech  # type: ignore[return-value]

    def speech_trace(engine: str, model: str, latency_ms: int) -> SpeechTrace:
        return SpeechTrace(engine=engine, model=model, latency_ms=latency_ms)

    narrations_dir = data_dir / "narrations"

    @app.post("/v1/speech/transcriptions", response_model=TranscriptionResult)
    async def transcribe_utterance(
        audio: UploadFile, engine: str = Form("parakeet")
    ) -> TranscriptionResult:
        """One utterance to text on the box; plain STT with its trace."""
        relay = require_speech()
        data = await audio.read()
        try:
            heard = await asyncio.to_thread(relay.transcribe, data, engine)
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=502, detail="speech backend unreachable"
            ) from error
        return TranscriptionResult(
            text=heard.text,
            trace=speech_trace(heard.engine, heard.model, heard.latency_ms),
        )

    @app.post("/v1/speech/narrations", response_model=NarrationCreated)
    async def create_narration(request: NarrationRequest) -> NarrationCreated:
        """Synthesize narration on the box. The id is content-addressed, so
        a repeated node question replays the cached audio without a second
        synthesis; the stored trace reports the original one."""
        relay = require_speech()
        narration_id = hashlib.sha1(
            f"{request.voice or ''}\n{request.text}".encode()
        ).hexdigest()[:16]
        meta_path = narrations_dir / f"{narration_id}.json"
        if not meta_path.exists():
            try:
                spoken = await asyncio.to_thread(
                    relay.synthesize, request.text, request.voice
                )
            except httpx.HTTPError as error:
                raise HTTPException(
                    status_code=502, detail="speech backend unreachable"
                ) from error
            narrations_dir.mkdir(parents=True, exist_ok=True)
            (narrations_dir / f"{narration_id}.audio").write_bytes(spoken.audio)
            meta_path.write_text(
                json.dumps(
                    {
                        "media_type": spoken.media_type,
                        "voice": spoken.voice,
                        "model": spoken.model,
                        "latency_ms": spoken.latency_ms,
                    }
                )
            )
        meta = json.loads(meta_path.read_text())
        return NarrationCreated(
            narration_id=narration_id,
            audio_url=f"/v1/speech/narrations/{narration_id}",
            media_type=meta["media_type"],
            voice=meta["voice"],
            trace=speech_trace("kokoro", meta["model"], meta["latency_ms"]),
        )

    @app.get("/v1/speech/narrations/{narration_id}")
    def get_narration(narration_id: str) -> FileResponse:
        meta_path = narrations_dir / f"{narration_id}.json"
        if not narration_id.isalnum() or not meta_path.exists():
            raise HTTPException(status_code=404, detail="unknown narration")
        meta = json.loads(meta_path.read_text())
        return FileResponse(
            narrations_dir / f"{narration_id}.audio", media_type=meta["media_type"]
        )

    @app.post(
        "/v1/walkthrough/sessions/{session_id}/utterance",
        response_model=WalkUtteranceResult,
        response_model_exclude_none=True,
    )
    async def walkthrough_utterance(
        session_id: str, audio: UploadFile, engine: str = Form("parakeet")
    ) -> WalkUtteranceResult:
        """A spoken answer for the current node. Exact matches only: an
        unrecognized utterance comes back as ask_again and changes nothing,
        so a garbled transcript can never advance the walk (#80)."""
        walk = require_walkthrough()
        transcript = walk.transcript(session_id)
        if transcript is None:
            raise HTTPException(status_code=404, detail="unknown walkthrough session")
        relay = require_speech()
        data = await audio.read()
        try:
            heard = await asyncio.to_thread(relay.transcribe, data, engine)
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=502, detail="speech backend unreachable"
            ) from error
        question = walk.next_question(transcript)
        states = [] if question is None else walk.states.get(question["character"], [])
        mapped = map_utterance(heard.text, states)
        action = mapped["action"]
        if question is None and action in ("answer", "skip"):
            action = "ask_again"
        if action == "answer":
            walk.record(
                session_id,
                {"character": question["character"], "states": [mapped["state"]]},
            )
        elif action == "skip":
            walk.record(session_id, {"character": question["character"], "states": []})
        elif action == "undo":
            walk.undo(session_id)
        return WalkUtteranceResult(
            transcript=heard.text,
            action=action,
            character=None if question is None else question["character"],
            state=mapped.get("state"),
            trace=speech_trace(heard.engine, heard.model, heard.latency_ms),
            walk=WalkSessionState(
                **walk.state(session_id, walk.transcript(session_id) or [])
            ),
        )

    @app.websocket("/v1/speech/stream")
    async def speech_stream(ws: WebSocket) -> None:
        """Live transcription relay: binary PCM frames from the app forward
        to the box stream; partial and final transcript events come back as
        they are produced. A text frame ends the utterance."""
        await ws.accept()
        if speech is None or speech is _FROM_ENV:
            await ws.send_json(
                {"type": "error", "detail": "speech backend not configured"}
            )
            await ws.close()
            return
        stream = speech.stream(ws.query_params.get("engine", "parakeet"))

        async def pump_up() -> bool:
            """True when the client ended the utterance, False on disconnect."""
            while True:
                message = await ws.receive()
                if message["type"] == "websocket.disconnect":
                    return False
                if message.get("bytes") is not None:
                    await stream.send(message["bytes"])
                elif message.get("text") is not None:
                    await stream.finish()
                    return True

        async def pump_down() -> None:
            async for event in stream.events():
                await ws.send_json(event)

        down = asyncio.create_task(pump_down())
        try:
            ended = await pump_up()
            if ended:
                await down
            else:
                down.cancel()
        finally:
            if not down.done():
                down.cancel()
            await stream.close()
            try:
                await ws.close()
            except RuntimeError:
                pass  # already closed by the client

    return app


app = create_app()
