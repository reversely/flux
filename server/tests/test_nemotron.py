"""Tests for the Nemotron-backed answerer (#44, #53), against a mocked endpoint.

No test here reaches the box: every retriever gets an httpx.MockTransport
client standing in for the vLLM chat-completions endpoint. The mock routes by
request shape: the tiny max_tokens=16 call is the classification (#53), the
large one is the answer.
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.nemotron import (
    CLASSIFY_PROMPT,
    DEFAULT_CORPUS_PATH,
    UNREACHABLE_TEXT,
    NemotronRetriever,
    build_system_prompt,
)
from flux_server.retrieval import NoPackRetriever, retriever_from_env

MODEL = "nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8"

# The 14 hand-labeled questions from the #53 strategy comparison, where the
# classification call scored 14/14. The mock plays the measured category
# back; the assertions cover the category -> ChatTool mapping.
CASES = [
    ("What knots should I learn?", "knot-verification"),
    ("How do I tie a bowline?", "knot-verification"),
    ("My taut-line hitch keeps slipping, what am I doing wrong?", "knot-verification"),
    ("How do I bind two poles together at a right angle?", "knot-verification"),
    ("Can I eat these red berries I found?", "species-id"),
    ("Is this mushroom safe?", "species-id"),
    ("What plants make good cordage fiber?", "species-id"),
    ("A snake just bit my friend, what do I do?", "wildlife-id"),
    ("There are large paw prints near my camp, should I worry?", "wildlife-id"),
    ("How do I start a fire in the rain?", None),
    ("How do I purify pond water?", None),
    ("Which direction is north without a compass?", None),
    ("How cold is too cold to sleep outside?", None),
    ("Where can I read the full chapter on shelters?", "reference"),
]

EXPECTED_SUBJECTS = {
    "How do I tie a bowline?": "bowline",
    "My taut-line hitch keeps slipping, what am I doing wrong?": "taut-line-hitch",
}


def completion(content: str | None) -> dict:
    return {"choices": [{"message": {"role": "assistant", "content": content}}]}


def make_retriever(
    answer_content: str | None = "Some guide prose.",
    category: str | None = "none",
    classify_status: int = 200,
    answer_status: int = 200,
    seen: list[dict] | None = None,
) -> NemotronRetriever:
    """Retriever whose mock endpoint routes by call shape (#53)."""

    def handle(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        if seen is not None:
            seen.append(body)
        if body["max_tokens"] == 16:
            if classify_status != 200:
                return httpx.Response(classify_status, text="boom")
            return httpx.Response(200, json=completion(category))
        if answer_status != 200:
            return httpx.Response(answer_status, text="boom")
        return httpx.Response(200, json=completion(answer_content))

    client = httpx.Client(transport=httpx.MockTransport(handle))
    return NemotronRetriever(
        base_url="http://box:30081/v1", model=MODEL, http_client=client
    )


@pytest.mark.parametrize(("question", "category"), CASES)
def test_measured_case_maps_to_the_right_tool(
    question: str, category: str | None
) -> None:
    answer = make_retriever(
        answer_content="Chapter 5 covers shelters.", category=category or "none"
    ).answer(question)
    if category is None:
        assert answer.tool is None
        return
    assert answer.tool is not None
    if category == "reference":
        assert answer.tool.kind == "reference"
        assert answer.tool.chapter == 5
        assert answer.tool.label == "Open chapter 5"
    else:
        assert answer.tool.kind == "camera"
        assert answer.tool.prime == category
    assert answer.tool.subject == EXPECTED_SUBJECTS.get(question)


def test_two_calls_answer_then_classify() -> None:
    seen: list[dict] = []
    make_retriever(category="none", seen=seen).answer("How do I purify pond water?")
    answer_call, classify_call = seen
    assert "tools" not in answer_call
    assert "tools" not in classify_call
    assert answer_call["max_tokens"] == 1024
    assert classify_call["max_tokens"] == 16
    assert classify_call["temperature"] == 0.0
    assert classify_call["messages"][0]["content"] == CLASSIFY_PROMPT
    assert "chapter" in answer_call["messages"][0]["content"]
    assert "hazardous" in answer_call["messages"][0]["content"]


def test_answer_prompt_carries_no_tool_rules() -> None:
    corpus = json.loads(DEFAULT_CORPUS_PATH.read_text())
    prompt = build_system_prompt(corpus)
    assert "launch_tool" not in prompt
    for tile in corpus["tiles"]:
        assert f"chapter {tile['chapter']}" in prompt
        assert tile["title"] in prompt
    # A box probe showed the model conflating tile ids with chapter numbers,
    # so the rendering keeps ids out of the prompt.
    assert "Tile 8" not in prompt


def test_reference_chapter_comes_from_the_answer_text_first() -> None:
    answer = make_retriever(
        answer_content="Chapter 19 covers signaling.", category="reference"
    ).answer("Where do I read about rescue signals?")
    assert answer.tool is not None
    assert answer.tool.chapter == 19


def test_reference_chapter_falls_back_to_the_tile_map() -> None:
    answer = make_retriever(
        answer_content="The guide covers that in full.", category="reference"
    ).answer("Where can I read the full chapter on shelters?")
    assert answer.tool is not None
    assert answer.tool.chapter == 5
    assert answer.tool.label == "Open chapter 5"


def test_reference_without_any_resolvable_chapter_drops_the_tool() -> None:
    answer = make_retriever(
        answer_content="The guide covers that.", category="reference"
    ).answer("Where can I read more?")
    assert answer.tool is None


def test_unknown_category_token_drops_the_tool() -> None:
    answer = make_retriever(category="blade-sharpening").answer("Is my knife sharp?")
    assert answer.tool is None
    assert answer.text == "Some guide prose."


def test_classification_failure_keeps_the_answer() -> None:
    answer = make_retriever(
        answer_content="Boil it for one minute.", classify_status=500
    ).answer("How do I purify pond water?")
    assert answer.text == "Boil it for one minute."
    assert answer.tool is None


def test_category_token_survives_punctuation_and_think_traces() -> None:
    answer = make_retriever(category="<think>hm</think>species-id.").answer(
        "Is this mushroom safe?"
    )
    assert answer.tool is not None
    assert answer.tool.prime == "species-id"


def test_leaked_think_trace_is_stripped_from_the_answer() -> None:
    answer = make_retriever(
        answer_content="<think>the user wants fire</think>Gather tinder."
    ).answer("Fire?")
    assert answer.text == "Gather tinder."


def test_unreachable_model_uses_the_keyword_floor() -> None:
    answer = make_retriever(answer_status=500).answer("Is this mushroom safe?")
    assert answer.text == UNREACHABLE_TEXT
    assert answer.tool is not None
    assert answer.tool.prime == "species-id"


def test_unreachable_model_without_keywords_has_no_tool() -> None:
    answer = make_retriever(answer_status=500).answer("How do I splint a leg?")
    assert answer.text == UNREACHABLE_TEXT
    assert answer.tool is None


def test_route_serializes_tool_and_omits_absent_fields(tmp_path) -> None:
    retriever = make_retriever(
        answer_content="Point the camera at the plant.", category="species-id"
    )
    app = create_app(data_dir=tmp_path, retriever=retriever)
    body = (
        TestClient(app)
        .post("/v1/chat", json={"question": "What plant is this?"})
        .json()
    )
    assert body["tool"] == {
        "kind": "camera",
        "label": "Identify a plant",
        "prime": "species-id",
    }


def test_env_selects_the_nemotron_retriever(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FLUX_CONTENT_DB", raising=False)
    monkeypatch.setenv("FLUX_NEMOTRON_URL", "http://box:30081/v1")
    assert isinstance(retriever_from_env(), NemotronRetriever)
    monkeypatch.delenv("FLUX_NEMOTRON_URL")
    assert isinstance(retriever_from_env(), NoPackRetriever)
