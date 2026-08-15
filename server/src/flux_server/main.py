"""FastAPI stub with bare endpoints: sessions, frame storage, frame serving.

Results stay empty until the trained model supplies them; the routes and the
PRD section 8 models in models.py are the contract that pipeline must keep.
"""

import os
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from flux_server.models import FrameUploadResponse, SessionCreated, SessionResults
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
        return FrameUploadResponse(frame_id=frame_id, results=[])

    @app.get("/v1/sessions/{session_id}/results", response_model=SessionResults)
    def session_results(session_id: str) -> SessionResults:
        require_session(session_id)
        return SessionResults(session_id=session_id, status="in_progress", joints=[])

    @app.get("/v1/sessions/{session_id}/frames/{frame_id}")
    def get_frame(session_id: str, frame_id: str) -> FileResponse:
        require_session(session_id)
        path = store.frame_path(session_id, frame_id)
        if path is None:
            raise HTTPException(status_code=404, detail="unknown frame")
        return FileResponse(path, media_type="image/jpeg")

    return app


app = create_app()
