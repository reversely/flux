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

    def set_status_by_topic(self, topic: str, status: str) -> None:
        """Mark a topic's entry (e.g. gathered); unknown topics are a no-op."""
        with self._lock:
            entries = self._read()
            for entry in entries:
                if _normalize(entry["topic"]) == _normalize(topic):
                    entry["status"] = status
            self._write(entries)


# ---------------------------------------------------------------------------
# Library feed (#TICKET): the visible half of the gather pass.
#
# The online gather worker is not built yet; the feed previews its planned
# pipeline so the front end can show what a pull looks like: topic queued,
# sources matched, files pulled, material staged for review. Events are
# staged on timers after a topic lands, clearly marked as a preview in
# their detail, and the store is one JSON file like the queue.
# ---------------------------------------------------------------------------

# Keyword-routed source lists for the preview. Real, public documents: the
# gather pass will fetch from catalogs like these; the preview names them.
PREVIEW_SOURCES: list[tuple[tuple[str, ...], list[str]]] = [
    (
        ("plant", "grow", "garden", "vegetable", "crop", "seed"),
        [
            'pulling: WSU Extension EM057E "Home Vegetable Gardening in Washington" · pdf',
            'pulling: PNW 548 "Fall and Winter Vegetable Gardening in the Pacific Northwest" · pdf',
        ],
    ),
    (
        ("water", "purif", "filter"),
        ['pulling: EPA "Emergency Disinfection of Drinking Water" · pdf'],
    ),
]

PREVIEW_NOTE = (
    "gather preview: the online pass is not built yet; this event shows "
    "the planned pipeline for this topic"
)


class LibraryFeed:
    """Append-only event feed persisted as one JSON file."""

    def __init__(self, path: Path, delays: tuple[float, ...] = (2.0, 5.0, 4.0)) -> None:
        self._path = path
        self._lock = threading.Lock()
        # Seconds between staged events: search, then each pull, then done.
        self._delays = delays
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            self._write([])

    def _read(self) -> list[dict]:
        return json.loads(self._path.read_text())

    def _write(self, events: list[dict]) -> None:
        self._path.write_text(json.dumps(events, indent=2) + "\n")

    def events(self) -> list[dict]:
        """Newest first, capped so the feed stays a feed."""
        with self._lock:
            return list(reversed(self._read()))[:100]

    def record(
        self, topic: str, kind: str, line: str, detail: str | None = None
    ) -> dict:
        event = {
            "id": f"feed_{uuid.uuid4().hex[:8]}",
            "at": datetime.now(UTC).isoformat(),
            "topic": topic,
            "kind": kind,
            "line": line,
            "detail": detail,
        }
        with self._lock:
            events = self._read()
            events.append(event)
            self._write(events)
        return event

    def preview_gather(self, topic: str) -> None:
        """Queued now; search, pulls, and done follow on staged timers."""
        self.record(topic, "queued", f'queued: "{topic}"')
        pulls = None
        lowered = topic.lower()
        for keywords, lines in PREVIEW_SOURCES:
            if any(k in lowered for k in keywords):
                pulls = lines
                break
        search_line = (
            f'matching sources for "{topic}" — extension catalogs, public archives'
        )
        steps: list[tuple[str, str]] = [("search", search_line)]
        if pulls is None:
            steps.append(
                (
                    "done",
                    "no sources staged in this preview — stays queued for the online pass",
                )
            )
        else:
            steps.extend(("pull", line) for line in pulls)
            steps.append(("done", "verified · staged for pack review"))
        elapsed = 0.0
        for index, (kind, line) in enumerate(steps):
            delay = (
                self._delays[min(index, len(self._delays) - 1)] if self._delays else 0.0
            )
            elapsed += delay
            if elapsed <= 0:
                self.record(topic, kind, line, PREVIEW_NOTE)
                continue
            timer = threading.Timer(
                elapsed, self.record, args=(topic, kind, line, PREVIEW_NOTE)
            )
            timer.daemon = True
            timer.start()
