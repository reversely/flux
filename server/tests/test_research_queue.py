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
