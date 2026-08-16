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

from flux_server.prompts import coach_procedure_prompt, coach_step_prompt

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
    # Set on non-knot procedures: the classifier prompt says "perform
    # <classifier_phrase>" instead of "tie a <name>", and the phrase is the
    # one the bench and the adapter trained on verbatim.
    classifier_phrase: str | None = None
    # Names the env var holding a fine-tuned model id for this procedure
    # (e.g. FLUX_COSMOS_MODEL_TOURNIQUET). Absent or unset env: base model.
    model_env: str | None = None
    # Names the env var holding the endpoint serving that model. The
    # deployment's NIM has no adapter hooks, so a fine-tune serves from its
    # own port. Absent or unset env: FLUX_COSMOS_URL.
    url_env: str | None = None


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
                    "Small overhand loop in the standing part.",
                    "Form a small overhand loop in the standing part. Leave a long working end.",
                    "a small overhand loop formed in the standing part of the rope",
                ),
                (
                    "Working end up through the loop.",
                    "Bring the working end up through the loop, from underneath.",
                    "the working end comes up through the loop from underneath",
                ),
                (
                    "Behind the standing part.",
                    "Wrap the working end behind the standing part.",
                    "the working end wraps behind the standing part",
                ),
                (
                    "Back down through the loop. Pull tight.",
                    "Pass the working end back down through the loop and pull tight. The loop stays open.",
                    "the working end passes back down through the loop; finished bowline pulled tight",
                ),
            ],
        ),
        _knot(
            "square",
            "Square knot",
            [
                (
                    "Left end over right. Tuck under.",
                    "Cross the left end over the right and tuck it under.",
                    "the left end crosses over the right and tucks under",
                ),
                (
                    "Right end over left. Tuck under.",
                    "Cross the right end over the left and tuck it under.",
                    "the right end crosses over the left and tucks under",
                ),
                (
                    "Pull all four ends tight. Knot lies flat.",
                    "Pull all four ends tight with even tension. The knot lies flat.",
                    "all four ends pulled tight; flat finished square knot",
                ),
            ],
        ),
        _knot(
            "clove",
            "Clove hitch",
            [
                (
                    "Wrap the end over the pole.",
                    "Wrap the end halfway over the pole, front to back.",
                    "the end wraps halfway over the pole",
                ),
                (
                    "Cross over the standing part.",
                    "Cross the running end over the standing part and bring it under the pole.",
                    "the running end crosses over the standing part in front of the pole",
                ),
                (
                    "Wrap over the pole again.",
                    "Wrap the end over the pole a second time, next to the first wrap.",
                    "the end wraps over the pole a second time",
                ),
                (
                    "Slip the end under the last wrap.",
                    "Slip the end under the wrap you just made.",
                    "the end slips under the last wrap",
                ),
                (
                    "Pull both ends tight.",
                    "Pull both ends tight against the pole.",
                    "both ends pulled tight; finished clove hitch on the pole",
                ),
            ],
        ),
        _knot(
            "fig8",
            "Figure-eight knot",
            [
                (
                    "Fold the end back over itself.",
                    "Fold the end of the rope back over itself.",
                    "the end of the rope folded back over itself",
                ),
                (
                    "Twist a loop. End through. Tighten.",
                    "Twist the end over the rope to form a loop, pass the end through the loop, and tighten.",
                    "the end twisted into a loop, passed through, and tightened into a figure-eight",
                ),
            ],
        ),
        _knot(
            "truckers",
            "Trucker's hitch",
            [
                (
                    "Tie off the rope at one end.",
                    "Tie off the rope at one end. The working end stays free.",
                    "the rope tied off at one anchor, working end free",
                ),
                (
                    "Form a loop in the line.",
                    "Form a loop in the line and hold it.",
                    "a loop formed in the line",
                ),
                (
                    "Cinch the slipped loop.",
                    "Pull a fold of rope through the loop and cinch it, so a loop hangs in the line.",
                    "a slipped loop cinched so a loop hangs in the line",
                ),
                (
                    "Working end around the anchor.",
                    "Pass the working end around the tie-off point.",
                    "the working end passes around the anchor point",
                ),
                (
                    "Up through the loop. Haul tight.",
                    "Pass the working end up through the hanging loop and haul it tight. The loop works like a pulley.",
                    "the working end comes up through the hanging loop and is hauled tight",
                ),
                (
                    "Lock off: two half hitches.",
                    "Lock it off with two half hitches.",
                    "the hitch locked off with two half hitches",
                ),
            ],
        ),
        _knot(
            "palomar",
            "Palomar knot",
            [
                (
                    "Thread the line through the hook eye.",
                    "Thread the line through the hook eye.",
                    "the line threads through the hook eye",
                ),
                (
                    "Thread it back. Doubled line.",
                    "Thread the line back through the hook eye, so the line is doubled.",
                    "the line threads back through the eye, leaving a doubled line",
                ),
                (
                    "Loose overhand knot. Hook hangs in the middle.",
                    "Tie a loose overhand knot in the doubled line. The hook hangs from the middle.",
                    "a loose overhand knot in the doubled line with the hook hanging from the middle",
                ),
                (
                    "Pass the hook through the loop.",
                    "Pass the hook through the loop of the doubled line.",
                    "the hook passes through the loop of the doubled line",
                ),
                (
                    "Wet the knot (spit works). Pull tight to the eye.",
                    "Wet the knot with spit or water so the line does not weaken from friction. Then pull it tight against the eye.",
                    "the knot pulled tight against the hook eye",
                ),
                (
                    "Trim the tag end (the short leftover).",
                    "Trim the tag end, the short leftover line.",
                    "the tag end trimmed; finished palomar knot on the hook",
                ),
            ],
        ),
        # Improvised tourniquet (FM 4-25.11 2-20; app tile 1). Cues are the
        # improvised-set step cues benched in docs/training/t3_zeroshot.ipynb
        # and trained into the T3 adapter; the adapter serves under the model
        # id named by FLUX_COSMOS_MODEL_TOURNIQUET, and without that env the
        # base model answers, so the procedure degrades to bench-measured
        # zero-shot behavior rather than breaking.
        CoachKnot(
            id="tourniquet",
            name="Improvised tourniquet",
            classifier_phrase="tourniquet application to stop limb bleeding",
            model_env="FLUX_COSMOS_MODEL_TOURNIQUET",
            url_env="FLUX_COSMOS_URL_TOURNIQUET",
            steps=(
                CoachStepDef(
                    screen="Find the bleed. Expose the limb.",
                    voice=(
                        "Find where the bright red bleeding comes from and expose it. "
                        "A tourniquet is a last resort, for an arm or leg, when a "
                        "pressure dressing has failed to stop the bleeding."
                    ),
                    cue="the bleeding site found and exposed on the limb",
                ),
                CoachStepDef(
                    screen="Band above the wound. Never on a joint.",
                    voice=(
                        "Place a band at least two inches wide around the limb, between "
                        "the wound and the heart. Never directly over a wound, a "
                        "fracture, or a joint."
                    ),
                    cue="a belt or strip of clothing placed around the limb above the wound",
                ),
                CoachStepDef(
                    screen="Half-knot. Stick on top. Full knot over.",
                    voice=(
                        "Tie a half-knot, the first part of tying a shoe lace. Place a "
                        "stick on top of it, and tie a full knot over the stick."
                    ),
                    cue="the band tied or cinched tight around the limb",
                ),
                CoachStepDef(
                    screen="Twist until bright red bleeding stops.",
                    voice=(
                        "Twist the stick until the tourniquet is tight around the limb "
                        "and the bright red bleeding has stopped."
                    ),
                    cue="a screwdriver or rod inserted into the band and twisted to tighten",
                ),
                CoachStepDef(
                    screen="Loop ends over the stick. Tie on the side.",
                    voice=(
                        "Loop the free ends over the ends of the stick, bring them "
                        "around the limb, and tie them together on the side, so the "
                        "stick cannot unwind."
                    ),
                    cue="the rod secured so it cannot unwind",
                ),
                CoachStepDef(
                    screen="Leave in full view. Mark a T and the time.",
                    voice=(
                        "Leave the tourniquet in full view and mark the forehead with a "
                        "T and the time. Once applied, it stays on until medical care "
                        "takes over; loosening it can restart bleeding and lead to shock."
                    ),
                    cue="the wound checked for stopped bleeding",
                ),
            ),
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


def frames_to_content(prompt: str, frames: list[bytes]) -> list[dict]:
    """One user message: the prompt then each frame as a data-URI image."""
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
    return content


@dataclass(frozen=True)
class ClipRead:
    """One clip's classification plus what the model reported seeing.

    step drives the pointer exactly as before; seen and subject_present are
    the transparency half: the app shows them, and a clip whose frames do
    not contain the procedure's materials never advances the pointer.
    """

    step: int | None
    seen: str | None = None
    subject_present: bool | None = None


class StepClassifier(Protocol):
    def classify(self, knot: CoachKnot, frames: list[bytes]) -> ClipRead:
        """The step the frames show, with the model's own observation."""


class CosmosStepClassifier:
    """Full-step-list classification against an OpenAI-compatible VLM."""

    def __init__(self, base_url: str, model: str) -> None:
        self._url = base_url.rstrip("/") + "/v1/chat/completions"
        self._model = model
        # Routes name the model in the inference trace they return.
        self.model = model

    def classify(self, knot: CoachKnot, frames: list[bytes]) -> ClipRead:
        cues = [s.cue for s in knot.steps]
        if knot.classifier_phrase:
            prompt = coach_procedure_prompt(knot.classifier_phrase, cues)
        else:
            prompt = coach_step_prompt(knot.name, cues)
        model = self._model
        if knot.model_env:
            model = os.environ.get(knot.model_env) or self._model
        url = self._url
        if knot.url_env:
            override = os.environ.get(knot.url_env)
            if override:
                url = override.rstrip("/") + "/v1/chat/completions"
        content = frames_to_content(prompt, frames)
        try:
            response = httpx.post(
                url,
                json={
                    "model": model,
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
            return ClipRead(step=None)
        seen, subject_present = _read_extras(text)
        match = re.search(r'"step"\s*:\s*"S(\d+)"', text)
        if match is None:
            return ClipRead(step=None, seen=seen, subject_present=subject_present)
        index = int(match.group(1))
        step = index if 0 <= index < len(knot.steps) else None
        return ClipRead(step=step, seen=seen, subject_present=subject_present)


def _read_extras(text: str) -> tuple[str | None, bool | None]:
    """The seen clause and subject flag, tolerating a step-only reply."""
    seen_match = re.search(r'"seen"\s*:\s*"([^"]*)"', text)
    seen = seen_match.group(1).strip()[:200] if seen_match else None
    present_match = re.search(r'"subject_present"\s*:\s*(true|false)', text)
    present = present_match.group(1) == "true" if present_match else None
    return (seen or None, present)


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
