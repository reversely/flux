"""Walkthrough sessions: deterministic traversal of the pack's walk_ tables.

A session is nothing but its transcript of confirmed answers, stored as one
JSON file. Every response recomputes the candidate set from the pack tables
plus the transcript, so the same answers always produce the same state and a
replayed transcript reproduces the session exactly (#86). The filter rule is
the pack-format contract's: an answer eliminates a species only when the
species records that character and no recorded state matches. The danger
subset of the surviving candidates is computed on every step, never only at
the end.
"""

import json
import sqlite3
import threading
import uuid
from pathlib import Path

# Below this many survivors the response carries the full candidate list;
# above it only counts, so early steps stay small on the wire.
LIST_CANDIDATES_AT = 25


def entry_states(entry: dict) -> set[str]:
    """A transcript entry's selected states. Entries written before the
    multiselect change carry a scalar `state`; both shapes stay readable
    because sessions persist on disk across deploys."""
    if entry.get("states") is not None:
        return set(entry["states"])
    if entry.get("state") is not None:
        return {entry["state"]}
    return set()


class WalkthroughStore:
    """In-memory mirror of the walk_ tables plus on-disk session transcripts."""

    def __init__(self, db_path: Path, sessions_dir: Path) -> None:
        self._sessions_dir = sessions_dir
        self._sessions_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        with sqlite3.connect(f"file:{db_path}?mode=ro", uri=True) as conn:
            conn.row_factory = sqlite3.Row
            self.questions = [
                dict(row)
                for row in conn.execute(
                    "SELECT character, ask_order, question, citation"
                    " FROM walk_question ORDER BY ask_order"
                )
            ]
            self.states: dict[str, list[str]] = {}
            for row in conn.execute(
                "SELECT character, state FROM walk_state ORDER BY character, state"
            ):
                self.states.setdefault(row["character"], []).append(row["state"])
            self.species = {
                row["species"]: dict(row)
                for row in conn.execute(
                    "SELECT species, edibility, edibility_raw,"
                    " source_title, source_revid FROM walk_species"
                )
            }
            self.traits: dict[str, dict[str, set[str]]] = {}
            for row in conn.execute("SELECT species, character, state FROM walk_trait"):
                self.traits.setdefault(row["species"], {}).setdefault(
                    row["character"], set()
                ).add(row["state"])

    # -- transcript persistence ------------------------------------------

    def _path(self, session_id: str) -> Path:
        return self._sessions_dir / f"{session_id}.json"

    def create(self) -> str:
        session_id = uuid.uuid4().hex
        self._write(session_id, [])
        return session_id

    def transcript(self, session_id: str) -> list[dict] | None:
        path = self._path(session_id)
        if not path.exists():
            return None
        with self._lock:
            return json.loads(path.read_text())

    def _write(self, session_id: str, transcript: list[dict]) -> None:
        with self._lock:
            self._path(session_id).write_text(json.dumps(transcript))

    def record(self, session_id: str, entry: dict) -> list[dict]:
        """Replace semantics: re-answering a character supersedes the prior
        entry, so a multiselect form can toggle states freely."""
        transcript = self.transcript(session_id) or []
        transcript = [e for e in transcript if e["character"] != entry["character"]]
        transcript.append(entry)
        self._write(session_id, transcript)
        return transcript

    def undo(self, session_id: str) -> list[dict]:
        transcript = self.transcript(session_id) or []
        transcript = transcript[:-1]
        self._write(session_id, transcript)
        return transcript

    # -- deterministic state ---------------------------------------------

    def candidates(self, transcript: list[dict]) -> list[str]:
        answers = {
            e["character"]: states for e in transcript if (states := entry_states(e))
        }
        return [
            species
            for species, chars in self.traits.items()
            if all(
                character not in chars or not chars[character].isdisjoint(states)
                for character, states in answers.items()
            )
        ]

    def catalog(self) -> list[dict]:
        """Every species card with its trait states, for the static browser."""
        return [
            {
                **card,
                "traits": {
                    character: sorted(states)
                    for character, states in self.traits.get(name, {}).items()
                },
            }
            for name, card in sorted(self.species.items())
        ]

    def next_question(self, transcript: list[dict]) -> dict | None:
        answered = {e["character"] for e in transcript}
        for question in self.questions:
            if question["character"] not in answered:
                return question
        return None

    def state(self, session_id: str, transcript: list[dict]) -> dict:
        survivors = self.candidates(transcript)
        danger = [s for s in survivors if self.species[s]["edibility"] == "danger"]
        question = self.next_question(transcript)
        complete = question is None
        result: dict = {
            "session_id": session_id,
            "answers": transcript,
            "questions": [
                {**q, "states": self.states.get(q["character"], [])}
                for q in self.questions
            ],
            "candidate_count": len(survivors),
            "danger_count": len(danger),
            "danger_species": [self.species[s] for s in sorted(danger)]
            if len(danger) <= LIST_CANDIDATES_AT or complete
            else None,
            "candidates": [self.species[s] for s in sorted(survivors)]
            if len(survivors) <= LIST_CANDIDATES_AT or complete
            else None,
            "complete": complete,
        }
        if question is not None:
            result["question"] = {
                **question,
                "states": self.states.get(question["character"], []),
            }
        return result


def walkthrough_store_from_env(data_dir: Path) -> "WalkthroughStore | None":
    """The walkthrough serves only when FLUX_CONTENT_DB names a pack that
    carries walk_ tables; anything else answers 503 like a missing pack."""
    import os

    db_path = os.environ.get("FLUX_CONTENT_DB")
    if not db_path:
        return None
    try:
        return WalkthroughStore(Path(db_path), data_dir / "walkthroughs")
    except sqlite3.OperationalError:
        return None
