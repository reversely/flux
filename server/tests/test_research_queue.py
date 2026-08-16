"""Research queue (#193): unsourced answers record their topic.

The mock routes by max_tokens: 16 is the tool classification, 24 the topic
naming, anything larger the answer completion.
"""

import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from flux_server.library import SEED_TOPICS, ResearchQueue
from flux_server.main import create_app
from flux_server.nemotron import NemotronRetriever

MODEL = "nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8"


def make_retriever(
    queue: ResearchQueue | None, topic_reply: str = "seed starting"
) -> NemotronRetriever:
    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        replies = {16: "none", 24: topic_reply}
        content = replies.get(payload["max_tokens"], "From what I know, plant early.")
        return httpx.Response(
            200,
            json={"choices": [{"message": {"role": "assistant", "content": content}}]},
        )

    return NemotronRetriever(
        base_url="http://box:30081/v1",
        model=MODEL,
        http_client=httpx.Client(transport=httpx.MockTransport(handler)),
        research_queue=queue,
    )


@pytest.fixture()
def queue(tmp_path: Path) -> ResearchQueue:
    return ResearchQueue(tmp_path / "research-queue.json")


def test_fresh_queue_carries_the_seed_topics(queue: ResearchQueue) -> None:
    assert [entry["topic"] for entry in queue.entries()] == SEED_TOPICS


def test_unsourced_answer_queues_its_topic(queue: ResearchQueue) -> None:
    answer = make_retriever(queue).answer("When do I start seeds indoors?")
    assert answer.queued is not None
    assert answer.queued.topic == "seed starting"
    assert answer.queued.state == "added"
    entry = queue.entries()[-1]
    assert entry["topic"] == "seed starting"
    assert entry["question"] == "When do I start seeds indoors?"


def test_an_already_queued_topic_reports_queued(queue: ResearchQueue) -> None:
    retriever = make_retriever(queue, topic_reply="Seed Storage")
    answer = retriever.answer("How long do carrot seeds keep?")
    assert answer.queued is not None
    assert answer.queued.topic == "seed storage"
    assert answer.queued.state == "queued"
    assert len(queue.entries()) == len(SEED_TOPICS)


def test_small_talk_never_queues(queue: ResearchQueue) -> None:
    answer = make_retriever(queue, topic_reply="none").answer("hi there")
    assert answer.queued is None
    assert len(queue.entries()) == len(SEED_TOPICS)


def test_no_queue_configured_skips_the_topic_call() -> None:
    answer = make_retriever(None).answer("When do I start seeds indoors?")
    assert answer.queued is None


def test_route_lists_the_queue(tmp_path: Path) -> None:
    app = create_app(
        data_dir=tmp_path,
        retriever=make_retriever(None),
        content=None,
        tile_archive=None,
        terrain_archive=None,
    )
    with TestClient(app) as client:
        body = client.get("/v1/library/queue").json()
    assert [entry["topic"] for entry in body] == SEED_TOPICS
    assert all(entry["status"] == "queued" for entry in body)


def test_feed_previews_a_gather_for_plant_topics(tmp_path):
    from flux_server.library import PREVIEW_NOTE, LibraryFeed

    feed = LibraryFeed(tmp_path / "feed.json", delays=())
    feed.preview_gather("vegetable planting in seattle")
    events = feed.events()
    kinds = [e["kind"] for e in reversed(events)]
    assert kinds == ["queued", "search", "pull", "pull", "done"]
    # Staged events are marked as the preview they are.
    assert all(e["detail"] == PREVIEW_NOTE for e in events if e["kind"] != "queued")
    assert "WSU Extension" in events[2]["line"] or "PNW 548" in events[2]["line"]


def test_feed_without_matching_sources_stays_queued(tmp_path):
    from flux_server.library import LibraryFeed

    feed = LibraryFeed(tmp_path / "feed.json", delays=())
    feed.preview_gather("celestial navigation drills")
    kinds = [e["kind"] for e in reversed(feed.events())]
    assert kinds == ["queued", "search", "done"]
    assert "stays queued" in feed.events()[0]["line"]


def make_fake_fetch(pages=None, pdfs=None):
    """A fetch callable serving canned Wikipedia search and PDF bodies."""
    import json as _json

    pages = pages if pages is not None else ["Vegetable farming"]
    pdfs = pdfs or {}

    def fetch(url):
        if "rest.php/v1/search" in url:
            body = _json.dumps({"pages": [{"title": t} for t in pages]}).encode()
            return 200, "application/json", body
        if "page/pdf/" in url:
            name = url.rsplit("/", 1)[1]
            return 200, "application/pdf", pdfs.get(name, b"%PDF-1.4 fake body")
        if url.endswith(".pdf"):
            return 200, "application/pdf", pdfs.get(url, b"%PDF-1.4 catalog body")
        return 404, "text/html", b""

    return fetch


def test_gather_stages_files_and_reports_on_the_feed(tmp_path, monkeypatch):
    from flux_server import gather as gather_module
    from flux_server.gather import Gatherer

    monkeypatch.setattr(
        gather_module,
        "CATALOG",
        [
            {
                "keywords": ("grow", "food"),
                "title": "Test catalog pub",
                "url": "https://example.org/pub.pdf",
                "filename": "pub.pdf",
                "license": "public domain",
            }
        ],
    )
    gatherer = Gatherer(tmp_path, fetch=make_fake_fetch(), pace_s=0)
    gatherer.queue.add("growing food", "what plants should i grow?")
    staged = gatherer.gather_topic("growing food")
    assert staged == 2  # catalog entry + first wikipedia page
    events = gatherer.queue.entries()
    assert [e["status"] for e in events if e["topic"] == "growing food"] == ["gathered"]
    feed = gatherer.feed.events()
    kinds = [e["kind"] for e in reversed(feed)]
    assert kinds == ["search", "pull", "pull", "done"]
    # Real events carry the provenance, not the preview note.
    pull = next(e for e in feed if e["kind"] == "pull")
    assert "sha256" in (pull["detail"] or "")
    staged_dir = tmp_path / "library" / "staged" / "growing-food"
    files = sorted(p.name for p in staged_dir.iterdir())
    assert "pub.pdf" in files
    assert any(name.endswith(".meta") for name in files)


def test_gather_with_nothing_fetchable_keeps_topic_queued(tmp_path):
    from flux_server.gather import Gatherer

    def dead_fetch(url):
        return 404, "text/html", b""

    gatherer = Gatherer(tmp_path, fetch=dead_fetch, pace_s=0)
    gatherer.queue.add("celestial navigation drills", None)
    assert gatherer.gather_topic("celestial navigation drills") == 0
    entry = next(
        e
        for e in gatherer.queue.entries()
        if e["topic"] == "celestial navigation drills"
    )
    assert entry["status"] == "queued"
    assert "stays queued" in gatherer.feed.events()[0]["line"]
