#!/usr/bin/env python3
"""The box librarian: the NemoClaw-operated personal-sync agent (#242).

Runs on the GN100 and works the *station's* research queue — the topics the
user's own questions put there — so the sync is personalized by
construction. For each queued topic it searches Wikipedia's REST API,
fetches page PDFs (HTTP/2 required; rest.php 403s h1 clients), stages them
with sha256 + .meta provenance under the box's data area, and reports every
step back to the station's library feed, where the app shows it live.

Deployed at ~/flux/librarian/librarian.py with its own venv
(httpx[http2]); scheduled by cron (see SKILL.md in
box/nemoclaw/skills/flux-librarian/); operated through the NemoClaw
console, which on the current model tier consults rather than executes
(box/nemoclaw/README.md).
"""

import fcntl
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

STATION = os.environ.get("FLUX_STATION_URL", "http://172.16.95.92:8000")
STAGED_ROOT = Path(
    os.environ.get(
        "FLUX_LIBRARIAN_STAGED",
        os.path.expanduser("~/flux/data/universal/library-staged"),
    )
)
LOCK_PATH = "/tmp/flux_librarian.lock"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
)
WIKI_SEARCH = "https://en.wikipedia.org/w/rest.php/v1/search/page"
WIKI_PDF = "https://en.wikipedia.org/api/rest_v1/page/pdf/"
MAX_PULLS_PER_TOPIC = 2
MAX_FILE_BYTES = 30_000_000
PACE_SECONDS = 2.0
AGENT_TAG = "flux-librarian on the box"


def slug(topic: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-") or "topic"


def main() -> int:
    with open(LOCK_PATH, "w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 0  # another pass is running
        return run()


def run() -> int:
    web = httpx.Client(
        http2=True,
        headers={"User-Agent": USER_AGENT},
        timeout=45.0,
        follow_redirects=True,
    )
    station = httpx.Client(base_url=STATION, timeout=15.0)

    def report(topic: str, kind: str, line: str, detail: str | None = None) -> None:
        try:
            station.post(
                "/v1/library/feed",
                json={"topic": topic, "kind": kind, "line": line, "detail": detail},
            )
        except httpx.HTTPError:
            pass  # the pass continues; the station will see the next event

    try:
        queue = station.get("/v1/library/queue").json()
    except (httpx.HTTPError, ValueError) as error:
        print(f"station unreachable: {error}", file=sys.stderr)
        return 1

    total_staged = 0
    for entry in queue:
        if entry.get("status") != "queued":
            continue
        topic = entry["topic"]
        report(topic, "search", f'searching for "{topic}" — Wikipedia', AGENT_TAG)
        try:
            found = web.get(WIKI_SEARCH, params={"q": topic, "limit": 3})
            pages = found.json().get("pages", []) if found.status_code == 200 else []
        except (httpx.HTTPError, ValueError):
            pages = []
        staged = 0
        dest = STAGED_ROOT / slug(topic)
        for page in pages:
            if staged >= MAX_PULLS_PER_TOPIC:
                break
            title = page.get("title", "")
            if not title:
                continue
            time.sleep(PACE_SECONDS)
            try:
                response = web.get(WIKI_PDF + title.replace(" ", "_"))
            except httpx.HTTPError as error:
                report(
                    topic,
                    "search",
                    f'Wikipedia "{title}": unreachable ({error})',
                    AGENT_TAG,
                )
                continue
            body = response.content
            if (
                response.status_code != 200
                or "pdf" not in response.headers.get("content-type", "")
                or not body
                or len(body) > MAX_FILE_BYTES
            ):
                report(
                    topic,
                    "search",
                    f'Wikipedia "{title}": skipped ({response.status_code})',
                    AGENT_TAG,
                )
                continue
            digest = hashlib.sha256(body).hexdigest()
            dest.mkdir(parents=True, exist_ok=True)
            path = dest / f"wikipedia-{slug(title)}.pdf"
            path.write_bytes(body)
            path.with_suffix(".pdf.meta").write_text(
                f"{WIKI_PDF + title.replace(' ', '_')}\n"
                f'Wikipedia "{title}"\nCC BY-SA 4.0\nsha256 {digest}\n'
            )
            staged += 1
            report(
                topic,
                "pull",
                f'pulled: Wikipedia "{title}" · {len(body) // 1024} KB · CC BY-SA 4.0',
                f"{AGENT_TAG} · sha256 {digest[:12]}",
            )
        if staged > 0:
            report(
                topic,
                "done",
                f"{staged} staged on the box · library-staged/{slug(topic)}/",
                AGENT_TAG,
            )
            try:
                station.post(
                    "/v1/library/queue/status",
                    json={"topic": topic, "status": "gathered"},
                )
            except httpx.HTTPError:
                pass
            total_staged += staged
        else:
            report(
                topic,
                "done",
                "nothing fetched — topic stays queued for the next pass",
                AGENT_TAG,
            )
    print(json.dumps({"staged": total_staged}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
