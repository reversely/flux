"""Walkthrough sessions: deterministic traversal of the pack's walk_ tables.

A session is nothing but its transcript of confirmed answers, stored as one
JSON file. Every response recomputes the candidate set from the pack tables
plus the transcript, so the same answers always produce the same state and a
replayed transcript reproduces the session exactly (#86). The filter rule is
the pack-format contract's: an answer eliminates a species only when the
species records that character and no recorded state matches. The danger
subset of the surviving candidates is computed on every step, never only at
the end.

A #65 pack carries many identification guides in the walk_ tables, and a
session names the guide it walks (#129). A session created without a guide,
and every transcript written before guides existed, walks fungi-edibility,
so pre-#129 clients keep their exact behavior.
"""

import csv
import json
import sqlite3
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path

# Below this many survivors the response carries the full candidate list;
# above it only counts, so early steps stay small on the wire.
LIST_CANDIDATES_AT = 25

DEFAULT_GUIDE_ID = "fungi-edibility"


def entry_states(entry: dict) -> set[str]:
    """A transcript entry's selected states. Entries written before the
    multiselect change carry a scalar `state`; both shapes stay readable
    because sessions persist on disk across deploys."""
    if entry.get("states") is not None:
        return set(entry["states"])
    if entry.get("state") is not None:
        return {entry["state"]}
    return set()


@dataclass
class GuideView:
    """One identification guide's slice of the walk_ tables."""

    guide_id: str
    title: str
    source: str
    tile_id: int | None
    questions: list[dict] = field(default_factory=list)
    states: dict[str, list[str]] = field(default_factory=dict)
    species: dict[str, dict] = field(default_factory=dict)
    traits: dict[str, dict[str, set[str]]] = field(default_factory=dict)


class WalkthroughStore:
    """In-memory mirror of the walk_ tables plus on-disk session transcripts."""

    def __init__(
        self, db_path: Path, sessions_dir: Path, images_dir: Path | None = None
    ) -> None:
        self._sessions_dir = sessions_dir
        self.images_dir = images_dir
        # species -> {artist, license}; empty without an images directory.
        self.image_meta: dict[str, dict[str, str]] = {}
        manifest = images_dir / "manifest.tsv" if images_dir else None
        if manifest is not None and manifest.exists():
            with manifest.open(newline="") as f:
                for row in csv.DictReader(f, delimiter="\t"):
                    self.image_meta[row["species"]] = {
                        "artist": row["artist"],
                        "license": row["license"],
                    }
        self._sessions_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.guides: dict[str, GuideView] = {}
        with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as conn:
            conn.row_factory = sqlite3.Row
            # A #65 pack carries many guides in these tables; a pre-#65 pack
            # has no guide_id column and exactly the mushroom walk.
            columns = {
                row["name"] for row in conn.execute("PRAGMA table_info(walk_question)")
            }
            has_guides = "guide_id" in columns
            if has_guides:
                try:
                    for row in conn.execute(
                        "SELECT id, title, source, tile_id FROM guide"
                        " WHERE kind = 'identification'"
                    ):
                        self.guides[row["id"]] = GuideView(
                            row["id"], row["title"], row["source"], row["tile_id"]
                        )
                except sqlite3.OperationalError:
                    pass
            if not self.guides:
                self.guides[DEFAULT_GUIDE_ID] = GuideView(
                    DEFAULT_GUIDE_ID, "Fungi edibility", "", 6
                )
            node_cols = (
                ", answer_source, capture_condition, evidence_kind"
                if "answer_source" in columns
                else ""
            )
            guide_col = ", guide_id" if has_guides else ""
            species_cols = {
                row["name"] for row in conn.execute("PRAGMA table_info(walk_species)")
            }
            common_col = ", common_name" if "common_name" in species_cols else ""

            def view_of(row: sqlite3.Row) -> GuideView | None:
                gid = row["guide_id"] if has_guides else DEFAULT_GUIDE_ID
                return self.guides.get(gid)

            for row in conn.execute(
                "SELECT character, ask_order, question, citation"
                + node_cols
                + guide_col
                + " FROM walk_question ORDER BY ask_order"
            ):
                if (view := view_of(row)) is not None:
                    question = dict(row)
                    question.pop("guide_id", None)
                    view.questions.append(question)
            for row in conn.execute(
                "SELECT character, state"
                + guide_col
                + " FROM walk_state ORDER BY character, state"
            ):
                if (view := view_of(row)) is not None:
                    view.states.setdefault(row["character"], []).append(row["state"])
            for row in conn.execute(
                "SELECT species, edibility, edibility_raw,"
                " source_title, source_revid"
                + common_col
                + guide_col
                + " FROM walk_species"
            ):
                if (view := view_of(row)) is not None:
                    card = dict(row)
                    card.pop("guide_id", None)
                    view.species[row["species"]] = card
            for row in conn.execute(
                "SELECT species, character, state" + guide_col + " FROM walk_trait"
            ):
                if (view := view_of(row)) is not None:
                    view.traits.setdefault(row["species"], {}).setdefault(
                        row["character"], set()
                    ).add(row["state"])

    # -- the default guide's slices, for pre-#129 callers ------------------

    @property
    def _default(self) -> GuideView:
        return self.guides[DEFAULT_GUIDE_ID]

    @property
    def questions(self) -> list[dict]:
        return self._default.questions

    @property
    def states(self) -> dict[str, list[str]]:
        return self._default.states

    @property
    def species(self) -> dict[str, dict]:
        return self._default.species

    @property
    def traits(self) -> dict[str, dict[str, set[str]]]:
        return self._default.traits

    # -- transcript persistence ------------------------------------------

    def _path(self, session_id: str) -> Path:
        return self._sessions_dir / f"{session_id}.json"

    def create(self, guide_id: str = DEFAULT_GUIDE_ID) -> str:
        session_id = uuid.uuid4().hex
        self._write(session_id, guide_id, [])
        return session_id

    def _read(self, session_id: str) -> tuple[str, list[dict]] | None:
        """A pre-#129 transcript file is a bare entry list and means fungi;
        a guide session wraps its entries with the guide id."""
        path = self._path(session_id)
        if not path.exists():
            return None
        with self._lock:
            raw = json.loads(path.read_text())
        if isinstance(raw, dict):
            return raw.get("guide_id", DEFAULT_GUIDE_ID), raw.get("entries", [])
        return DEFAULT_GUIDE_ID, raw

    def transcript(self, session_id: str) -> list[dict] | None:
        read = self._read(session_id)
        return None if read is None else read[1]

    def guide_of(self, session_id: str) -> str | None:
        read = self._read(session_id)
        return None if read is None else read[0]

    def view_for(self, session_id: str) -> GuideView | None:
        guide_id = self.guide_of(session_id)
        return None if guide_id is None else self.guides.get(guide_id)

    def _write(self, session_id: str, guide_id: str, transcript: list[dict]) -> None:
        # The default guide keeps the pre-#129 bare-list file shape, so a
        # rollback of this server still reads every fungi session.
        payload: list | dict = transcript
        if guide_id != DEFAULT_GUIDE_ID:
            payload = {"guide_id": guide_id, "entries": transcript}
        with self._lock:
            self._path(session_id).write_text(json.dumps(payload))

    def record(self, session_id: str, entry: dict) -> list[dict]:
        """Replace semantics: re-answering a character supersedes the prior
        entry, so a multiselect form can toggle states freely."""
        guide_id, transcript = self._read(session_id) or (DEFAULT_GUIDE_ID, [])
        transcript = [e for e in transcript if e["character"] != entry["character"]]
        transcript.append(entry)
        self._write(session_id, guide_id, transcript)
        return transcript

    def undo(self, session_id: str) -> list[dict]:
        guide_id, transcript = self._read(session_id) or (DEFAULT_GUIDE_ID, [])
        transcript = transcript[:-1]
        self._write(session_id, guide_id, transcript)
        return transcript

    # -- deterministic state ---------------------------------------------

    def candidates(
        self, transcript: list[dict], guide_id: str = DEFAULT_GUIDE_ID
    ) -> list[str]:
        answers = {
            e["character"]: states for e in transcript if (states := entry_states(e))
        }
        view = self.guides[guide_id]
        return [
            species
            for species, chars in view.traits.items()
            if all(
                character not in chars or not chars[character].isdisjoint(states)
                for character, states in answers.items()
            )
        ]

    def image_path(self, species: str) -> Path | None:
        if self.images_dir is None:
            return None
        path = self.images_dir / "images" / f"{species.replace(' ', '_')}.jpg"
        return path if path.exists() else None

    def catalog(self, guide_id: str = DEFAULT_GUIDE_ID) -> list[dict]:
        """Every species card with its trait states, for the static browser."""
        view = self.guides[guide_id]
        return [
            {
                **card,
                "traits": {
                    character: sorted(states)
                    for character, states in view.traits.get(name, {}).items()
                },
                "image": name in self.image_meta,
                "image_artist": self.image_meta.get(name, {}).get("artist"),
                "image_license": self.image_meta.get(name, {}).get("license"),
            }
            for name, card in sorted(view.species.items())
        ]

    def next_question(
        self, transcript: list[dict], guide_id: str = DEFAULT_GUIDE_ID
    ) -> dict | None:
        answered = {e["character"] for e in transcript}
        for question in self.guides[guide_id].questions:
            if question["character"] not in answered:
                return question
        return None

    def state(self, session_id: str, transcript: list[dict]) -> dict:
        guide_id = self.guide_of(session_id) or DEFAULT_GUIDE_ID
        view = self.guides[guide_id]
        survivors = self.candidates(transcript, guide_id)
        danger = [s for s in survivors if view.species[s]["edibility"] == "danger"]
        question = self.next_question(transcript, guide_id)
        complete = question is None
        result: dict = {
            "session_id": session_id,
            "answers": transcript,
            "questions": [
                {**q, "states": view.states.get(q["character"], [])}
                for q in view.questions
            ],
            "candidate_count": len(survivors),
            "danger_count": len(danger),
            # The danger subset ships on every step (#136): showing which
            # species could kill you is the safety affordance the walk
            # exists for, so it is never gated on the count.
            "danger_species": [view.species[s] for s in sorted(danger)],
            "candidates": [view.species[s] for s in sorted(survivors)]
            if len(survivors) <= LIST_CANDIDATES_AT or complete
            else None,
            "complete": complete,
        }
        # Sessions on the default guide keep their pre-#129 response shape;
        # a guide session names its guide so the client can title the walk.
        if guide_id != DEFAULT_GUIDE_ID:
            result["guide_id"] = guide_id
            result["guide_title"] = view.title
        if question is not None:
            result["question"] = {
                **question,
                "states": view.states.get(question["character"], []),
            }
        return result


def walkthrough_store_from_env(data_dir: Path) -> "WalkthroughStore | None":
    """The walkthrough serves only when FLUX_CONTENT_DB names a pack that
    carries walk_ tables; anything else answers 503 like a missing pack."""
    import os

    db_path = os.environ.get("FLUX_CONTENT_DB")
    if not db_path:
        return None
    images = os.environ.get("FLUX_SPECIES_IMAGES")
    try:
        return WalkthroughStore(
            Path(db_path),
            data_dir / "walkthroughs",
            Path(images) if images else None,
        )
    except sqlite3.OperationalError:
        return None
