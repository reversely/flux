"""FastAPI app: sessions, frame and video storage, VSS handoff, results.

Photo frames wait on the box perception service; MP4 videos forward to VSS
on POST /sessions/{id}/finish (PRD 3.4) and the summary comes back through
the results route. The routes and models.py are the contract with the app.
"""

import os
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from flux_server.models import (
    ChatAnswer,
    ChatRequest,
    FrameUploadResponse,
    SessionCreated,
    SessionFinished,
    SessionResults,
    VideoUploadResponse,
)
from flux_server.retrieval import Retriever, retriever_from_env
from flux_server.storage import SessionStore
from flux_server.vss import VideoHandoff, handoff_from_env

DEFAULT_DATA_DIR = Path("data/sessions")


def create_app(
    data_dir: Path | None = None,
    retriever: Retriever | None = None,
    handoff: VideoHandoff | None = None,
) -> FastAPI:
    """Build the app around one on-disk session store and one retriever."""
    if data_dir is None:
        data_dir = Path(os.environ.get("FLUX_DATA_DIR", DEFAULT_DATA_DIR))
    store = SessionStore(data_dir)
    if retriever is None:
        retriever = retriever_from_env()
    if handoff is None:
        handoff = handoff_from_env()
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

    @app.post("/v1/chat", response_model=ChatAnswer)
    def chat(request: ChatRequest) -> ChatAnswer:
        return retriever.answer(request.question)

    @app.post("/v1/sessions", response_model=SessionCreated)
    def create_session() -> SessionCreated:
        return SessionCreated(session_id=store.create_session())

    @app.post("/v1/sessions/{session_id}/frames", response_model=FrameUploadResponse)
    async def upload_frame(
        session_id: str, frame: UploadFile, captured_at: str = Form()
    ) -> FrameUploadResponse:
        require_session(session_id)
        data = await frame.read()
        frame_id = store.add_frame(session_id, data, captured_at)
        return FrameUploadResponse(frame_id=frame_id, results=[])

    @app.post("/v1/sessions/{session_id}/videos", response_model=VideoUploadResponse)
    async def upload_video(
        session_id: str, video: UploadFile, captured_at: str = Form()
    ) -> VideoUploadResponse:
        require_session(session_id)
        data = await video.read()
        video_id = store.add_video(session_id, data, captured_at)
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
