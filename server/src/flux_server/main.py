"""FastAPI app: sessions, frame and video storage, VSS handoff, results.

Photo frames wait on the box perception service; MP4 videos forward to VSS
on POST /sessions/{id}/finish (PRD 3.4) and the summary comes back through
the results route. The routes and models.py are the contract with the app.
"""

import os
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from flux_server.content import ContentStore, content_store_from_env
from flux_server.models import (
    FUNCTIONALITY_MEDIA_MODE,
    Block,
    BlockDetail,
    ChapterDetail,
    ChapterSummary,
    ChatAnswer,
    ChatRequest,
    Figure,
    FrameUploadResponse,
    FunctionalityList,
    FunctionalityMode,
    SearchResults,
    SectionDetail,
    SessionCreated,
    SessionCreateRequest,
    SessionFinished,
    SessionResults,
    VideoUploadResponse,
)
from flux_server.retrieval import Retriever, retriever_from_env
from flux_server.storage import SessionStore, UnplayableVideoError
from flux_server.vss import VideoHandoff, handoff_from_env

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

    return app


app = create_app()
