"""Research queue: topics the chat could not answer from the pack (#193).

The queue is the demand side of the online gather pass: an unsourced chat
answer records its topic here, the box works the list when it has internet,
and fetched material joins the pack. One JSON file under the data dir keeps
the server stateless across restarts, matching the session store. A fresh
queue seeds itself with starter topics so the review surface is never
empty on first open.
"""

import json
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path

SEED_TOPICS = ["growing food", "seed storage"]


def _normalize(topic: str) -> str:
    return " ".join(topic.lower().split())


class ResearchQueue:
    """Deduplicated topic list persisted as one JSON file."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.Lock()
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            self._write([self._entry(topic, question=None) for topic in SEED_TOPICS])

    @staticmethod
    def _entry(topic: str, question: str | None) -> dict:
        return {
            "id": f"topic_{uuid.uuid4().hex[:8]}",
            "topic": topic,
            "question": question,
            "status": "queued",
            "created_at": datetime.now(UTC).isoformat(),
        }

    def _read(self) -> list[dict]:
        return json.loads(self._path.read_text())

    def _write(self, entries: list[dict]) -> None:
        self._path.write_text(json.dumps(entries, indent=2) + "\n")

    def entries(self) -> list[dict]:
        with self._lock:
            return self._read()

    def add(self, topic: str, question: str) -> tuple[dict, bool]:
        """Queue a topic, or return the entry that already covers it.

        Matching is by normalized topic text. The second return value is
        True when this call created the entry.
        """
        with self._lock:
            entries = self._read()
            for entry in entries:
                if _normalize(entry["topic"]) == _normalize(topic):
                    return entry, False
            entry = self._entry(topic, question)
            entries.append(entry)
            self._write(entries)
            return entry, True
