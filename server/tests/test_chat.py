"""Tests for POST /v1/chat: wire shape and the no-pack stub behavior."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from flux_server.main import create_app
from flux_server.retrieval import NoPackRetriever, retriever_from_env


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.delenv("FLUX_CONTENT_DB", raising=False)
    return TestClient(create_app(data_dir=tmp_path))


def ask(client: TestClient, question: str = "How do I purify water?") -> dict:
    response = client.post("/v1/chat", json={"question": question})
    assert response.status_code == 200
    return response.json()


def test_answer_carries_exactly_the_chat_answer_keys(client: TestClient) -> None:
    # Optional fields stay absent on the wire, not null: the no-pack answer
    # carries no tool, so only the required keys appear.
    body = ask(client)
    assert set(body) == {"answer_id", "text"}
    assert isinstance(body["answer_id"], str)
    assert isinstance(body["text"], str)


def test_no_pack_answer_admits_it_and_offers_no_tool(client: TestClient) -> None:
    body = ask(client)
    assert "no content pack" in body["text"].lower()
    assert "tool" not in body


def test_answer_ids_are_unique_per_answer(client: TestClient) -> None:
    ids = {ask(client)["answer_id"] for _ in range(3)}
    assert len(ids) == 3


def test_missing_question_is_rejected(client: TestClient) -> None:
    assert client.post("/v1/chat", json={}).status_code == 422


def test_chat_schema_matches_the_frontend_mirror(client: TestClient) -> None:
    # The app codes against ChatTool/ChatAnswer in app/src/api/types.ts; these
    # names are the wire contract and must not drift.
    schemas = client.get("/openapi.json").json()["components"]["schemas"]
    assert "Citation" not in schemas

    answer = schemas["ChatAnswer"]
    assert set(answer["properties"]) == {"answer_id", "text", "tool"}
    assert set(answer["required"]) == {"answer_id", "text"}

    tool = schemas["ChatTool"]
    assert set(tool["properties"]) == {
        "kind",
        "label",
        "prime",
        "subject",
        "question",
        "chapter",
    }
    assert set(tool["required"]) == {"kind", "label"}
    kind = tool["properties"]["kind"]
    assert kind["enum"] == ["camera", "chat", "reference"]


def test_retriever_from_env_without_pack_is_the_no_pack_stub(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("FLUX_CONTENT_DB", raising=False)
    assert isinstance(retriever_from_env(), NoPackRetriever)
    monkeypatch.setenv("FLUX_CONTENT_DB", str(tmp_path / "absent.sqlite"))
    assert isinstance(retriever_from_env(), NoPackRetriever)


def test_retriever_from_env_refuses_an_unreadable_configured_pack(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    pack = tmp_path / "pack.sqlite"
    pack.write_bytes(b"")
    monkeypatch.setenv("FLUX_CONTENT_DB", str(pack))
    with pytest.raises(NotImplementedError):
        retriever_from_env()
