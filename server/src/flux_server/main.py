"""FastAPI stub returning canned inspection results.

The GN100 pipeline replaces the canned layer later; the routes and models are
the contract it must keep.
"""

import os
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image

from flux_server.canned import MIN_FRAMES_FOR_RESULTS, canned_joints
from flux_server.models import (
    FrameUploadResponse,
    JointRecord,
    SessionCreated,
    SessionResults,
)
from flux_server.storage import SessionStore

DEFAULT_DATA_DIR = Path("data/sessions")


def create_app(data_dir: Path | None = None) -> FastAPI:
    """Build the app around one on-disk session store."""
    if data_dir is None:
        data_dir = Path(os.environ.get("FLUX_DATA_DIR", DEFAULT_DATA_DIR))
    store = SessionStore(data_dir)
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

    def results_for(session_id: str) -> list[JointRecord]:
        frame_ids = store.frame_ids(session_id)
        if len(frame_ids) < MIN_FRAMES_FOR_RESULTS:
            return []
        latest = store.frame_path(session_id, frame_ids[-1])
        with Image.open(latest) as image:
            width, height = image.size
        return canned_joints(width, height, frame_ids)

    @app.get("/healthz")
    def healthz() -> dict[str, bool]:
        return {"ok": True}

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
        return FrameUploadResponse(frame_id=frame_id, results=results_for(session_id))

    @app.get("/v1/sessions/{session_id}/results", response_model=SessionResults)
    def session_results(session_id: str) -> SessionResults:
        require_session(session_id)
        joints = results_for(session_id)
        return SessionResults(
            session_id=session_id,
            status="complete" if joints else "in_progress",
            joints=joints,
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
