"""Tests for the Nemotron-backed answerer (#44), against a mocked endpoint.

No test here reaches the box: every retriever gets an httpx.MockTransport
client standing in for the vLLM chat-completions endpoint, answering in the
OpenAI shape with native tool calls.
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.nemotron import (
    DEFAULT_CORPUS_PATH,
    UNREACHABLE_TEXT,
    NemotronRetriever,
    build_system_prompt,
)
from flux_server.retrieval import NoPackRetriever, retriever_from_env

MODEL = "nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8"


def message_body(content: str | None, tool_arguments: dict | None = None) -> dict:
    message: dict = {"role": "assistant", "content": content, "tool_calls": []}
    if tool_arguments is not None:
        message["tool_calls"] = [
            {
                "id": "call_1",
                "type": "function",
                "function": {
                    "name": "launch_tool",
                    "arguments": json.dumps(tool_arguments),
                },
            }
        ]
    return {"choices": [{"message": message}]}


def make_retriever(
    replies: list[dict] | None = None,
    status_code: int = 200,
    seen: list[dict] | None = None,
) -> NemotronRetriever:
    """Retriever wired to a mock endpoint; replies are consumed in order."""
    queue = list(replies or [])

    def handle(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(json.loads(request.content))
        if status_code != 200:
            return httpx.Response(status_code, text="boom")
        body = queue.pop(0) if len(queue) > 1 else queue[0]
        return httpx.Response(200, json=body)

    client = httpx.Client(transport=httpx.MockTransport(handle))
    return NemotronRetriever(
        base_url="http://box:30081/v1", model=MODEL, http_client=client
    )


def test_text_and_tool_call_become_the_answer() -> None:
    reply = message_body(
        "Practice the bowline; chapter 12 covers cordage.",
        {"kind": "camera", "prime": "knot-verification", "subject": "bowline"},
    )
    answer = make_retriever([reply]).answer("Is my bowline right?")
    assert "chapter 12" in answer.text
    assert answer.tool is not None
    assert answer.tool.kind == "camera"
    assert answer.tool.prime == "knot-verification"
    assert answer.tool.subject == "bowline"
    # The model omitted the label; the server fills the skill's default.
    assert answer.tool.label == "Check my knot"


def test_plain_reply_carries_no_tool() -> None:
    reply = message_body("Boil water for one minute; chapter 6 has the methods.")
    answer = make_retriever([reply]).answer("How long do I boil water?")
    assert answer.tool is None
    assert "chapter 6" in answer.text


def test_null_content_with_tool_call_retries_for_prose() -> None:
    with_tool = message_body(
        None, {"kind": "camera", "prime": "species-id", "label": "Identify a plant"}
    )
    prose = message_body(
        "Point the camera at the whole plant; chapter 10 lists hazards."
    )
    seen: list[dict] = []
    answer = make_retriever([with_tool, prose], seen=seen).answer("What plant is this?")
    assert answer.tool is not None
    assert answer.tool.prime == "species-id"
    assert "chapter 10" in answer.text
    first, second = seen
    assert "tools" in first
    assert "tools" not in second


def test_argument_echo_content_retries_for_prose() -> None:
    echo = message_body(
        "camera, knot-verification, bowline",
        {"kind": "camera", "prime": "knot-verification", "subject": "bowline"},
    )
    prose = message_body("Load the loop and check it holds; chapter 12 covers knots.")
    answer = make_retriever([echo, prose]).answer("Check my bowline?")
    assert answer.tool is not None
    assert "chapter 12" in answer.text


def test_leaked_think_trace_is_stripped() -> None:
    reply = message_body("<think>the user wants fire</think>Gather tinder.")
    assert make_retriever([reply]).answer("Fire?").text == "Gather tinder."


def test_http_failure_degrades_to_a_plain_answer() -> None:
    answer = make_retriever(status_code=500).answer("How do I splint a leg?")
    assert answer.text == UNREACHABLE_TEXT
    assert answer.tool is None


def test_unknown_prime_is_dropped_but_text_survives() -> None:
    reply = message_body(
        "Check the blade angle.",
        {"kind": "camera", "label": "Check", "prime": "blade-sharpening"},
    )
    answer = make_retriever([reply]).answer("Is my knife sharp?")
    assert answer.text == "Check the blade angle."
    assert answer.tool is None


def test_malformed_tool_arguments_are_dropped() -> None:
    body = message_body("ok")
    body["choices"][0]["message"]["tool_calls"] = [
        {
            "id": "call_1",
            "type": "function",
            "function": {"name": "launch_tool", "arguments": "not json"},
        }
    ]
    answer = make_retriever([body]).answer("q")
    assert answer.tool is None
    assert answer.text == "ok"


def test_reference_tool_without_label_gets_a_chapter_label() -> None:
    reply = message_body("Read the full text.", {"kind": "reference", "chapter": 7})
    answer = make_retriever([reply]).answer("Where do I read about fire?")
    assert answer.tool is not None
    assert answer.tool.label == "Open chapter 7"
    assert answer.tool.chapter == 7


def test_request_carries_corpus_prompt_tools_and_question() -> None:
    seen: list[dict] = []
    make_retriever([message_body("ok")], seen=seen).answer("Which moss is safe?")
    (request,) = seen
    assert request["model"] == MODEL
    assert request["tools"][0]["function"]["name"] == "launch_tool"
    system, user = request["messages"]
    assert system["role"] == "system"
    assert "chapter" in system["content"]
    assert "hazardous" in system["content"]
    assert user == {"role": "user", "content": "Which moss is safe?"}


def test_system_prompt_names_chapters_without_tile_ids() -> None:
    corpus = json.loads(DEFAULT_CORPUS_PATH.read_text())
    prompt = build_system_prompt(corpus)
    for tile in corpus["tiles"]:
        assert f"chapter {tile['chapter']}" in prompt
        assert tile["title"] in prompt
    # A box probe showed the model conflating tile ids with chapter numbers,
    # so the rendering keeps ids out of the prompt.
    assert "Tile 8" not in prompt
    assert "tile 8" not in prompt


def test_route_serializes_tool_and_omits_absent_fields(tmp_path) -> None:
    reply = message_body(
        "Point the camera at the plant.",
        {"kind": "camera", "label": "Identify a plant", "prime": "species-id"},
    )
    app = create_app(data_dir=tmp_path, retriever=make_retriever([reply]))
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
