"""The online gather pass: the supply side of the research queue (#193).

The queue records what the pack could not answer; this worker fetches real
material for those topics when the station has internet. Two strategies,
in order: a curated catalog of known public documents keyed by topic
keywords, then Wikipedia's REST search with the page-PDF export as the
generic fallback. Every fetch is content-type checked, size capped, and
sha256-hashed; files land under data_dir/library/staged/<topic-slug>/ for
review — nothing joins the pack without it. Progress is written to the
same library feed the app polls, so the front end shows a real pull the
same way it showed the preview.

Run it as a CLI (`python -m flux_server.gather --once`), or let the chat
route kick a single-topic gather in a background thread when
FLUX_GATHER_ONLINE is set.
"""

import argparse
import hashlib
import logging
import os
import re
import time
from pathlib import Path

import httpx

from flux_server.library import LibraryFeed, ResearchQueue

logger = logging.getLogger(__name__)

# Browser-style UA, the same lesson the box's T3 downloader learned: both
# Wikipedia's rest.php and the extension catalogs answer 403 or bounce to
# HTML for unfamiliar agents, and a PDF behind a UA gate is still public.
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/151.0 Safari/537.36"
)
FETCH_TIMEOUT_S = 45.0
MAX_FILE_BYTES = 30_000_000
# At most this many documents per topic per pass; the review step is human.
MAX_PULLS_PER_TOPIC = 2
# Pause between fetches: Wikipedia's PDF renderer answers 429 to a fast
# pass, and a library builder has no hurry.
PACE_SECONDS = 2.0
WIKI_SEARCH = "https://en.wikipedia.org/w/rest.php/v1/search/page"
WIKI_PDF = "https://en.wikipedia.org/api/rest_v1/page/pdf/"

# Known public documents keyed by topic keywords. Entries are probed at
# fetch time (status and content type), never trusted blindly; a dead link
# reports on the feed and the Wikipedia fallback still runs. Empty until an
# entry verifies live: the extension-catalog and EPA PDFs probed on
# 2026-08-16 all gate or redirect to HTML, so shipping them would only log
# skips every pass.
CATALOG: list[dict] = []


def topic_slug(topic: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-") or "topic"


def default_fetch(url: str) -> tuple[int, str, bytes]:
    """(status, content_type, body); body empty past the size cap.

    HTTP/2 is load-bearing, not an optimization: Wikipedia's rest.php
    answers 403 to HTTP/1.1 clients regardless of headers (measured
    2026-08-16), and curl succeeds only because it defaults to h2.
    """
    with (
        httpx.Client(
            http2=True,
            headers={"User-Agent": USER_AGENT},
            timeout=FETCH_TIMEOUT_S,
            follow_redirects=True,
        ) as client,
        client.stream("GET", url) as response,
    ):
        content_type = response.headers.get("content-type", "")
        chunks: list[bytes] = []
        total = 0
        for chunk in response.iter_bytes():
            total += len(chunk)
            if total > MAX_FILE_BYTES:
                return response.status_code, content_type, b""
            chunks.append(chunk)
        return response.status_code, content_type, b"".join(chunks)


class Gatherer:
    """One data_dir's gather pass; fetch is injectable for tests."""

    def __init__(
        self, data_dir: Path, fetch=default_fetch, pace_s: float = PACE_SECONDS
    ) -> None:
        self._data_dir = data_dir
        self._fetch = fetch
        self._pace_s = pace_s
        self.feed = LibraryFeed(data_dir / "library-feed.json")
        self.queue = ResearchQueue(data_dir / "research-queue.json")
        self._staged_root = data_dir / "library" / "staged"

    # -- sources -----------------------------------------------------------

    def _catalog_sources(self, topic: str) -> list[dict]:
        lowered = topic.lower()
        return [
            entry
            for entry in CATALOG
            if any(keyword in lowered for keyword in entry["keywords"])
        ]

    def _wikipedia_sources(self, topic: str) -> list[dict]:
        import json as _json

        status, _, body = self._fetch(
            f"{WIKI_SEARCH}?q={httpx.QueryParams({'q': topic})['q']}&limit=3"
        )
        if status != 200 or not body:
            return []
        try:
            pages = _json.loads(body)["pages"]
        except (ValueError, KeyError):
            return []
        sources = []
        for page in pages:
            title = page.get("title", "")
            if not title:
                continue
            sources.append(
                {
                    "title": f'Wikipedia "{title}"',
                    "url": WIKI_PDF + title.replace(" ", "_"),
                    "filename": f"wikipedia-{topic_slug(title)}.pdf",
                    "license": "CC BY-SA 4.0",
                }
            )
        return sources

    # -- the pass ----------------------------------------------------------

    def gather_topic(self, topic: str) -> int:
        """Fetch and stage sources for one topic; the count staged."""
        self.feed.record(
            topic,
            "search",
            f'searching for "{topic}" — curated catalog, then Wikipedia',
        )
        sources = self._catalog_sources(topic) + self._wikipedia_sources(topic)
        staged = 0
        dest = self._staged_root / topic_slug(topic)
        for source in sources:
            if staged >= MAX_PULLS_PER_TOPIC:
                break
            if self._pace_s > 0:
                time.sleep(self._pace_s)
            try:
                status, content_type, body = self._fetch(source["url"])
            except httpx.HTTPError as error:
                self.feed.record(
                    topic, "search", f"{source['title']}: unreachable ({error})"
                )
                continue
            if status != 200 or not body or "pdf" not in content_type:
                self.feed.record(
                    topic,
                    "search",
                    f"{source['title']}: skipped ({status}, {content_type.split(';')[0] or 'no body'})",
                )
                continue
            digest = hashlib.sha256(body).hexdigest()
            dest.mkdir(parents=True, exist_ok=True)
            path = dest / source["filename"]
            path.write_bytes(body)
            (path.with_suffix(path.suffix + ".meta")).write_text(
                f"{source['url']}\n{source['title']}\n{source['license']}\nsha256 {digest}\n"
            )
            staged += 1
            self.feed.record(
                topic,
                "pull",
                f"pulled: {source['title']} · {len(body) // 1024} KB · {source['license']}",
                detail=f"{source['url']} · sha256 {digest[:12]}",
            )
        if staged > 0:
            self.feed.record(
                topic,
                "done",
                f"{staged} staged for review · library/staged/{topic_slug(topic)}/",
            )
            self.queue.set_status_by_topic(topic, "gathered")
        else:
            self.feed.record(
                topic, "done", "nothing fetched — topic stays queued for the next pass"
            )
        return staged

    def gather_once(self) -> int:
        """Work every queued topic once; total files staged."""
        total = 0
        for entry in self.queue.entries():
            if entry.get("status") == "queued":
                total += self.gather_topic(entry["topic"])
        return total


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the library gather pass.")
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path(os.environ.get("FLUX_DATA_DIR", "data/sessions")),
    )
    parser.add_argument("--topic", help="gather one topic instead of the queue")
    parser.add_argument(
        "--watch", type=int, metavar="SECONDS", help="repeat the pass on an interval"
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    gatherer = Gatherer(args.data_dir)
    while True:
        if args.topic:
            staged = gatherer.gather_topic(args.topic)
        else:
            staged = gatherer.gather_once()
        print(f"gather pass complete: {staged} file(s) staged")
        if args.watch is None:
            break
        time.sleep(args.watch)


if __name__ == "__main__":
    main()
