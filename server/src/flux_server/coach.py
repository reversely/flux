"""Knot coach sessions: per-clip step classification driving a monotone pointer.

The step-state bench (docs/training/knot.ipynb) fixed the mechanism (#64/#66):
a stateless full-step-list classification per chunk on the box's
cosmos-reason2-8b beats prompting anchored on the current step, and the
pointer advances only when two consecutive clips agree on a later step, which
absorbs the single-chunk boundary wobble the bench measured. The app posts
short clips; VSS ingest and SSE delivery (#60/#80) can replace this transport
without changing the pointer rule. Step definitions live here until the
pack's per-step procedure records (#65) ship and take over.
"""

import base64
import json
import logging
import os
import re
import subprocess
import tempfile
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import httpx

logger = logging.getLogger(__name__)

CLASSIFY_TIMEOUT_S = 60.0
MAX_FRAMES_PER_CLIP = 8
# Two consecutive clips must agree on a later step before the pointer moves.
AGREE_TO_ADVANCE = 2


@dataclass(frozen=True)
class CoachStepDef:
    screen: str
    voice: str
    # What the classifier sees: the observable description of the step,
    # phrased exactly as the bench prompts phrased it.
    cue: str


@dataclass(frozen=True)
class CoachKnot:
    id: str
    name: str
    steps: tuple[CoachStepDef, ...]


def _knot(knot_id: str, name: str, steps: list[tuple[str, str, str]]) -> CoachKnot:
    return CoachKnot(
        id=knot_id,
        name=name,
        steps=tuple(CoachStepDef(screen=s, voice=v, cue=c) for s, v, c in steps),
    )


# (screen fragment, voice line, classifier cue) per step. Screen and voice
# follow the UI-copy rules in CLAUDE.md; cues are the bench's phase texts.
KNOTS: dict[str, CoachKnot] = {
    k.id: k
    for k in [
        _knot(
            "bowline",
            "Bowline",
            [
                (
                    "Rope laid out.",
                    "Rope laid out. Ready.",
                    "rope laid out straight, knot not yet started",
                ),
                (
                    "Small overhand loop in the standing part.",
                    "Form a small overhand loop in the standing part.",
                    "form a small overhand loop in the standing part",
                ),
                (
                    "Working end: up through the loop, behind the standing part, back down.",
                    (
                        "Thread the working end up through the loop, behind the "
                        "standing part, and back down through the loop."
                    ),
                    (
                        "thread the working end: up through the loop, behind the "
                        "standing part, and back down through the loop"
                    ),
                ),
                (
                    "Pull tight. Loop stays open.",
                    "Pull tight. The loop stays open.",
                    "tighten and dress the knot; finished bowline with a fixed loop",
                ),
            ],
        ),
        _knot(
            "square",
            "Square knot",
            [
                (
                    "Two rope ends laid out.",
                    "Two rope ends laid out.",
                    "two rope ends laid out, knot not started",
                ),
                (
                    "Left over right. Tuck under.",
                    "Cross the left end over the right and tuck it under.",
                    "cross the left end over the right and tuck it under",
                ),
                (
                    "Right over left. Tuck under.",
                    "Cross the right end over the left and tuck it under.",
                    "cross the right end over the left and tuck it under",
                ),
                (
                    "Pull all four ends. Knot lies flat.",
                    "Pull all four ends tight. The knot lies flat.",
                    "pull all four ends tight; flat square knot",
                ),
            ],
        ),
        _knot(
            "clove",
            "Clove hitch",
            [
                (
                    "Rope and pole ready.",
                    "Rope and pole ready.",
                    "rope and pole ready, knot not started",
                ),
                (
                    "Wrap over the pole. Cross the standing part.",
                    "Wrap the end over the pole and cross it over the standing part.",
                    "wrap the end over the pole and cross it over the standing part",
                ),
                (
                    "Wrap again. Tuck under the last wrap.",
                    "Wrap over the pole again and tuck the end under the last wrap.",
                    "wrap over the pole again and tuck the end under the last wrap",
                ),
                (
                    "Pull both ends tight.",
                    "Pull both ends tight against the pole.",
                    "pull both ends tight against the pole",
                ),
            ],
        ),
        _knot(
            "fig8",
            "Figure-eight knot",
            [
                (
                    "Rope laid out straight.",
                    "Rope laid out straight.",
                    "rope laid out straight, knot not started",
                ),
                (
                    "Form a loop. End crosses over.",
                    "Form a loop, crossing the end over the standing part.",
                    "form a loop, crossing the end over the standing part",
                ),
                (
                    "Wrap the end behind the standing part.",
                    "Wrap the end behind the standing part.",
                    "wrap the end behind the standing part",
                ),
                (
                    "End down through the loop.",
                    "Pass the end down through the loop. You get a figure-eight shape.",
                    "pass the end down through the loop; figure-eight shape",
                ),
                (
                    "Pull both ends tight.",
                    "Pull both ends tight.",
                    "pull both ends tight",
                ),
            ],
        ),
        _knot(
            "truckers",
            "Trucker's hitch",
            [
                (
                    "Rope runs to the tie-off point.",
                    "Run the rope to the tie-off point.",
                    "rope runs to the tie-off point, knot not started",
                ),
                (
                    "Small loop in the line.",
                    "Form a small loop in the line.",
                    "form a small loop in the line",
                ),
                (
                    "Pull a fold through. Slipped loop.",
                    "Pull a fold of rope through to make a slipped loop.",
                    "pull a fold of rope through to make a slipped loop",
                ),
                (
                    "End around the tie-off, up through the loop.",
                    "Pass the working end around the tie-off point and up through the loop.",
                    "pass the working end around the tie-off point and up through the loop",
                ),
                (
                    "Haul tight.",
                    "Haul the working end tight.",
                    "haul the working end tight",
                ),
                (
                    "Lock off: two half hitches.",
                    "Lock it off with two half hitches.",
                    "lock it off with two half hitches",
                ),
            ],
        ),
        _knot(
            "palomar",
            "Palomar knot",
            [
                (
                    "Line and hook ready.",
                    "Line and hook ready.",
                    "line and hook ready, knot not started",
                ),
                (
                    "Double the line into a loop.",
                    "Double the line into a loop.",
                    "double the line into a loop",
                ),
                (
                    "Thread the loop through the hook eye.",
                    "Thread the doubled loop through the hook eye.",
                    "thread the loop through the hook eye",
                ),
                (
                    "Loose overhand knot. Hook hangs in the middle.",
                    "Tie a loose overhand knot. The hook hangs from the middle.",
                    "tie a loose overhand knot; the hook hangs from the middle",
                ),
                (
                    "Pass the loop over the whole hook.",
                    "Pass the loop over the whole hook.",
                    "pass the loop over the whole hook",
                ),
                (
                    "Wet the knot (spit works). Pull both lines tight.",
                    (
                        "Wet the knot with spit or water so the line does not weaken "
                        "from friction. Then pull both lines tight."
                    ),
                    "wet the knot and pull both lines to seat it against the eye",
                ),
                (
                    "Trim the tag end (the short leftover).",
                    "Trim the tag end, the short leftover line.",
                    "trim the tag end; finished",
                ),
            ],
        ),
    ]
}


class ClipUnreadableError(ValueError):
    """ffmpeg could not decode the uploaded clip."""


def extract_frames(data: bytes, max_frames: int = MAX_FRAMES_PER_CLIP) -> list[bytes]:
    """Sample up to max_frames JPEGs at 1 fps from an uploaded clip."""
    with tempfile.TemporaryDirectory() as tmp:
        clip = Path(tmp) / "clip.mp4"
        clip.write_bytes(data)
        result = subprocess.run(
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-i",
                str(clip),
                "-vf",
                "fps=1",
                "-frames:v",
                str(max_frames),
                str(Path(tmp) / "frame_%02d.jpg"),
            ],
            capture_output=True,
            check=False,
        )
        frames = sorted(Path(tmp).glob("frame_*.jpg"))
        if result.returncode != 0 or not frames:
            raise ClipUnreadableError(result.stderr.decode(errors="replace")[:200])
        return [f.read_bytes() for f in frames]


class StepClassifier(Protocol):
    def classify(self, knot: CoachKnot, frames: list[bytes]) -> int | None:
        """Index of the step the frames show, or None when unreadable."""


class CosmosStepClassifier:
    """Full-step-list classification against an OpenAI-compatible VLM."""

    def __init__(self, base_url: str, model: str) -> None:
        self._url = base_url.rstrip("/") + "/v1/chat/completions"
        self._model = model

    def classify(self, knot: CoachKnot, frames: list[bytes]) -> int | None:
        steps = "\n".join(f"S{i}: {s.cue}" for i, s in enumerate(knot.steps))
        prompt = (
            f"You are watching someone tie a {knot.name} step by step. "
            f"The procedure's steps are:\n{steps}\n\n"
            "These frames are one consecutive chunk of live video, in order. "
            "Which single step is being performed in this chunk? "
            'Answer with JSON only: {"step": "S<n>"}'
        )
        content: list[dict] = [{"type": "text", "text": prompt}]
        content.extend(
            {
                "type": "image_url",
                "image_url": {
                    "url": "data:image/jpeg;base64," + base64.b64encode(f).decode()
                },
            }
            for f in frames
        )
        try:
            response = httpx.post(
                self._url,
                json={
                    "model": self._model,
                    "temperature": 0,
                    "max_tokens": 200,
                    "messages": [{"role": "user", "content": content}],
                },
                timeout=CLASSIFY_TIMEOUT_S,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError) as error:
            logger.warning("coach classification failed: %s", error)
            return None
        match = re.search(r'"step"\s*:\s*"S(\d+)"', text)
        if match is None:
            return None
        index = int(match.group(1))
        return index if 0 <= index < len(knot.steps) else None


def advance_pointer(predictions: list[int | None], n_steps: int) -> int:
    """Replay the pointer rule over a session's predictions.

    Monotone: moves to a later step only when AGREE_TO_ADVANCE consecutive
    predictions name the same later step. Never regresses; regression events
    are a #66 follow-up once the mistake corpus justifies them.
    """
    pointer = 0
    for i, prediction in enumerate(predictions):
        if prediction is None or prediction <= pointer or prediction >= n_steps:
            continue
        run = predictions[max(0, i - AGREE_TO_ADVANCE + 1) : i + 1]
        if len(run) == AGREE_TO_ADVANCE and all(p == prediction for p in run):
            pointer = prediction
    return pointer


class CoachStore:
    """On-disk coach sessions: one JSON transcript of predictions each."""

    def __init__(self, sessions_dir: Path) -> None:
        self._dir = sessions_dir
        self._dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def _path(self, session_id: str) -> Path:
        return self._dir / f"{session_id}.json"

    def create(self, knot_id: str) -> str:
        session_id = uuid.uuid4().hex
        with self._lock:
            self._path(session_id).write_text(
                json.dumps({"knot": knot_id, "predictions": []})
            )
        return session_id

    def load(self, session_id: str) -> dict | None:
        path = self._path(session_id)
        if not path.exists():
            return None
        return json.loads(path.read_text())

    def record(self, session_id: str, prediction: int | None) -> dict:
        with self._lock:
            session = json.loads(self._path(session_id).read_text())
            session["predictions"].append(prediction)
            self._path(session_id).write_text(json.dumps(session))
        return session


def classifier_from_env() -> StepClassifier | None:
    """A real classifier when FLUX_COSMOS_URL names the box, else None."""
    base_url = os.environ.get("FLUX_COSMOS_URL")
    if not base_url:
        return None
    model = os.environ.get("FLUX_COSMOS_MODEL", "nvidia/cosmos-reason2-8b")
    return CosmosStepClassifier(base_url, model)
