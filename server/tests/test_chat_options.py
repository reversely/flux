"""Chat model options (#237): the request's option picks the answer model."""

import httpx
from flux_server.nemotron import NemotronRetriever
from flux_server.retrieval import chat_options_from_env


def _client_recording(calls: list[dict]) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        body = request.read()
        calls.append({"url": str(request.url), "body": body})
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"role": "assistant", "content": "none"}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1},
            },
        )

    return httpx.Client(transport=httpx.MockTransport(handler))


def _retriever(calls: list[dict]) -> NemotronRetriever:
    return NemotronRetriever(
        base_url="http://nano/v1",
        model="nano-model",
        http_client=_client_recording(calls),
        options={"lightning": ("http://lightning/v1", "lightning-model")},
    )


def test_option_routes_answer_completion() -> None:
    calls: list[dict] = []
    answer = _retriever(calls).answer("how do I purify water", option="lightning")
    answer_calls = [c for c in calls if b"lightning-model" in c["body"]]
    assert answer_calls, "the answer completion should use the option model"
    assert all(c["url"].startswith("http://lightning/") for c in answer_calls)
    assert answer.trace is not None and answer.trace.model == "lightning-model"
    # The small completions (tool classification, topic naming) stay on the
    # default model.
    other = [c for c in calls if b"lightning-model" not in c["body"]]
    assert all(c["url"].startswith("http://nano/") for c in other)


def test_unknown_option_uses_default() -> None:
    calls: list[dict] = []
    answer = _retriever(calls).answer("how do I purify water", option="nope")
    assert all(c["url"].startswith("http://nano/") for c in calls)
    assert answer.trace is not None and answer.trace.model == "nano-model"


def test_options_parse_from_env(monkeypatch) -> None:
    monkeypatch.setenv("FLUX_CHAT_OPTION_LIGHTNING", "http://box:30084/v1|the-model")
    monkeypatch.setenv("FLUX_CHAT_OPTION_BROKEN", "no-separator")
    options = chat_options_from_env()
    assert options["lightning"] == ("http://box:30084/v1", "the-model")
    assert "broken" not in options
