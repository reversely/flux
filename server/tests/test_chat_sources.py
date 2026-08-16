"""Two-tier chat answers (#185): pack quotes when retrieval hits.

The retriever gets a real ContentStore over a fixture pack and a mocked
chat-completions endpoint. A question whose terms match a block puts the
passage in the prompt and the citation on the wire; a question with no
match answers from the model alone and omits the sources field.
"""

import json
import sqlite3
from pathlib import Path

import httpx
import pytest
from flux_server.content import ContentStore
from flux_server.nemotron import PASSAGES_HEADER, NemotronRetriever

MODEL = "nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8"

SCHEMA_AND_ROWS = """
CREATE TABLE chapter (
    id TEXT PRIMARY KEY,
    tile_id INTEGER,
    fm_number INTEGER UNIQUE,
    title TEXT,
    priority_order INTEGER
);
CREATE TABLE section (
    id TEXT PRIMARY KEY,
    chapter_id TEXT REFERENCES chapter(id),
    fm_heading TEXT,
    title TEXT,
    "order" INTEGER
);
CREATE TABLE block (
    id TEXT PRIMARY KEY,
    section_id TEXT REFERENCES section(id),
    "order" INTEGER,
    type TEXT,
    text TEXT,
    figure_ref TEXT,
    source TEXT,
    review_status TEXT
);
INSERT INTO chapter VALUES ('fm21-76-ch06', 3, 6, 'WATER PROCUREMENT', 6);
INSERT INTO section VALUES
    ('fm21-76-ch06-water-sources', 'fm21-76-ch06', 'WATER SOURCES',
     'Water Sources', 1);
INSERT INTO block VALUES
    ('fm21-76-ch06-water-sources-b001', 'fm21-76-ch06-water-sources',
     1, 'principle', 'Purify all water from standing sources before drinking.',
     NULL, 'FM 21-76', 'auto');
"""


@pytest.fixture()
def content(tmp_path: Path) -> ContentStore:
    db_path = tmp_path / "content.db"
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_AND_ROWS)
    conn.close()
    return ContentStore(db_path)


def make_retriever(content: ContentStore | None) -> tuple[NemotronRetriever, list]:
    requests: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        requests.append(payload)
        content_text = "none" if payload["max_tokens"] == 16 else "Boil it first."
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"role": "assistant", "content": content_text}}]
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    retriever = NemotronRetriever(
        base_url="http://box:30081/v1",
        model=MODEL,
        http_client=client,
        content=content,
    )
    return retriever, requests


def test_matching_question_carries_passage_and_sources(content) -> None:
    retriever, requests = make_retriever(content)
    answer = retriever.answer("How do I purify water before drinking it?")
    assert answer.sources is not None
    source = answer.sources[0]
    assert source.block_id == "fm21-76-ch06-water-sources-b001"
    assert source.section_id == "fm21-76-ch06-water-sources"
    assert source.chapter_id == "fm21-76-ch06"
    user_message = requests[0]["messages"][1]["content"]
    assert PASSAGES_HEADER in user_message
    assert "Purify all water from standing sources" in user_message
    assert "chapter 6, Water Sources" in user_message


def test_no_match_answers_plainly_without_sources(content) -> None:
    retriever, requests = make_retriever(content)
    answer = retriever.answer("Which direction sets the evening wind?")
    assert answer.sources is None
    assert (
        requests[0]["messages"][1]["content"]
        == "Which direction sets the evening wind?"
    )


def test_no_content_store_behaves_as_before() -> None:
    retriever, _ = make_retriever(None)
    answer = retriever.answer("How do I purify water before drinking it?")
    assert answer.sources is None
    assert answer.text == "Boil it first."


def test_search_failure_degrades_to_a_plain_answer(content) -> None:
    retriever, _ = make_retriever(content)
    content._conn.close()
    answer = retriever.answer("How do I purify water before drinking it?")
    assert answer.sources is None
    assert answer.text == "Boil it first."
