"""Filesystem session store: a session is a directory of numbered JPEG frames.

Keeping all state on disk makes the server stateless across restarts and lets
the seed script build a session by writing files.
"""

import json
import re
import subprocess
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path

_SESSION_ID_RE = re.compile(r"sess_[a-z0-9_]+")
_FRAME_ID_RE = re.compile(r"frame_\d{3}")
_VIDEO_ID_RE = re.compile(r"video_\d{3}")
_RESULT_FILENAME = "result.json"
_SESSION_FILENAME = "session.json"


class UnplayableVideoError(ValueError):
    """An uploaded video's container could not be read or rewrapped."""


def _is_quicktime(data: bytes) -> bool:
    """True when the bytes open a QuickTime container (ftyp major brand qt)."""
    return len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] == b"qt  "


def remux_to_mp4(data: bytes) -> bytes:
    """Rewrap QuickTime video into an MP4 container without re-encoding.

    Raises:
        UnplayableVideoError: when ffmpeg cannot read the bytes.
    """
    with tempfile.TemporaryDirectory() as workdir:
        source = Path(workdir) / "in.mov"
        target = Path(workdir) / "out.mp4"
        source.write_bytes(data)
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(source),
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(target),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise UnplayableVideoError(result.stderr.strip())
        return target.read_bytes()


class SessionStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def create_session(self, metadata: dict | None = None) -> str:
        session_id = f"sess_{uuid.uuid4().hex[:8]}"
        (self.root / session_id).mkdir()
        if metadata:
            (self.root / session_id / _SESSION_FILENAME).write_text(
                json.dumps(metadata)
            )
        return session_id

    def session_metadata(self, session_id: str) -> dict:
        path = self.root / session_id / _SESSION_FILENAME
        if not path.is_file():
            return {}
        return json.loads(path.read_text())

    def session_exists(self, session_id: str) -> bool:
        if not _SESSION_ID_RE.fullmatch(session_id):
            return False
        return (self.root / session_id).is_dir()

    def frame_ids(self, session_id: str) -> list[str]:
        return sorted(
            path.stem for path in (self.root / session_id).glob("frame_*.jpg")
        )

    def add_frame(self, session_id: str, data: bytes, captured_at: str) -> str:
        frame_id = f"frame_{len(self.frame_ids(session_id)) + 1:03d}"
        directory = self.root / session_id
        (directory / f"{frame_id}.jpg").write_bytes(data)
        metadata = {
            "frame_id": frame_id,
            "captured_at": captured_at,
            "received_at": datetime.now(UTC).isoformat(),
        }
        (directory / f"{frame_id}.json").write_text(json.dumps(metadata))
        return frame_id

    def frame_path(self, session_id: str, frame_id: str) -> Path | None:
        if not _FRAME_ID_RE.fullmatch(frame_id):
            return None
        path = self.root / session_id / f"{frame_id}.jpg"
        return path if path.is_file() else None

    def video_ids(self, session_id: str) -> list[str]:
        return sorted(
            path.stem for path in (self.root / session_id).glob("video_*.mp4")
        )

    def add_video(self, session_id: str, data: bytes, captured_at: str) -> str:
        # VST sniffs the container and refuses QuickTime even under an .mp4
        # name; iOS records .mov, so rewrap at ingest and keep disk mp4-only.
        if _is_quicktime(data):
            data = remux_to_mp4(data)
        video_id = f"video_{len(self.video_ids(session_id)) + 1:03d}"
        directory = self.root / session_id
        (directory / f"{video_id}.mp4").write_bytes(data)
        metadata = {
            "video_id": video_id,
            "captured_at": captured_at,
            "received_at": datetime.now(UTC).isoformat(),
        }
        (directory / f"{video_id}.json").write_text(json.dumps(metadata))
        return video_id

    def video_paths(self, session_id: str) -> list[Path]:
        directory = self.root / session_id
        return [
            directory / f"{video_id}.mp4" for video_id in self.video_ids(session_id)
        ]

    def write_ingest(self, session_id: str, entries: list[dict]) -> None:
        (self.root / session_id / "ingest.json").write_text(json.dumps(entries))

    def read_ingest(self, session_id: str) -> list[dict] | None:
        path = self.root / session_id / "ingest.json"
        if not path.is_file():
            return None
        return json.loads(path.read_text())

    def write_result(self, session_id: str, result: dict) -> None:
        (self.root / session_id / _RESULT_FILENAME).write_text(json.dumps(result))

    def read_result(self, session_id: str) -> dict | None:
        path = self.root / session_id / _RESULT_FILENAME
        if not path.is_file():
            return None
        return json.loads(path.read_text())
