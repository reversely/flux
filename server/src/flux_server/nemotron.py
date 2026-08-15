"""Nemotron-backed answerer behind POST /v1/chat (ticket #44).

NemotronRetriever calls the box's OpenAI-compatible chat-completions endpoint
(the VSS stack's Nemotron Nano 9B v2 FP8 container, ticket #43, reached via
FLUX_NEMOTRON_URL) with a system prompt built from the committed guide corpus
(app/src/data/guide-corpus.json). The model answers survival questions in the
guide's voice and names chapters in prose so the client can hyperlink
"chapter N" mentions. Tool launches ride the endpoint's native tool-calling:
the request declares one launch_tool function mirroring the ChatTool wire
shape, and a returned call becomes the answer's tool field after validation.
Any model failure degrades to a plain answer with no tool; the route never
errors because the box is down.
"""

import json
import logging
import re
import uuid
from pathlib import Path

import httpx
from pydantic import ValidationError

from flux_server.models import ChatAnswer, ChatTool

logger = logging.getLogger(__name__)

CHAT_TIMEOUT_S = 120.0
DEFAULT_CORPUS_PATH = (
    Path(__file__).resolve().parents[3] / "app" / "src" / "data" / "guide-corpus.json"
)

UNREACHABLE_TEXT = (
    "The assistant model is not reachable right now, so no answer can be "
    "generated. The field guide itself still works offline: open the tile "
    "closest to your question and read its chapter."
)

# The camera skills the tool field may launch (ticket #44); anything else the
# model invents is dropped rather than sent to a client that cannot render it.
KNOWN_PRIMES = {"knot-verification", "species-id", "wildlife-id"}

# The model often calls the tool without a label; the button still needs one.
DEFAULT_LABELS = {
    "knot-verification": "Check my knot",
    "species-id": "Identify a plant",
    "wildlife-id": "Identify wildlife",
}

# /no_think switches Nemotron out of its reasoning-trace mode; the raw trace
# would otherwise land in the answer text.
_RULES = """\
/no_think

You are the voice of this survival field guide. Answer questions the way the
guide entries below are written: calm, concrete, imperative, and brief. Give
the steps that matter, in order, and nothing decorative.

Rules:
- Answer only from the guide entries below. When they cover the question,
  ground your answer in them and name the relevant chapter in plain prose,
  for example "chapter 7 covers fire lays". Write chapter references exactly
  as the word "chapter" followed by the number; the client turns those
  mentions into links. Never invent a chapter number that is not listed.
- When the entries do not contain the procedure, your whole answer is one or
  two sentences naming the tile and the chapter to read, and nothing more.
  Never supply steps, doses, or specifics from outside the entries; medical
  actions in particular come only from the reviewed protocols in the guide,
  so an unlisted medical procedure gets the chapter pointer, not improvised
  instructions.
- Safety: identification of plants, fungi, and animals is never certain from
  a description or a photo. Treat uncertain specimens as hazardous by
  default. When you are unsure, say so plainly and point to the chapter.
- You are offline support for a wilderness situation: no links, no "consult
  a professional" filler when no professional is reachable, though you should
  say when something needs evacuation or rescue.

"""

_TOOL_RULES = """\
Call the launch_tool function only when the question directly maps to a
skill, and still answer in text alongside the call. The text is always full
sentences spoken to the user; never repeat the tool call's arguments as the
text:
- Checking a tied knot or lashing by camera: kind "camera", prime
  "knot-verification", subject naming the knot in kebab-case if known.
- Identifying a plant or fungus by camera: kind "camera", prime "species-id".
- Identifying an animal, track, or scat by camera: kind "camera", prime
  "wildlife-id".
- Pointing to a chapter to read in full: kind "reference" with the chapter
  number.
Do not call it for a question that none of these fit.\
"""

LAUNCH_TOOL = {
    "type": "function",
    "function": {
        "name": "launch_tool",
        "description": "Open a skill widget under the answer",
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": ["camera", "chat", "reference"]},
                "label": {"type": "string"},
                "prime": {"type": "string"},
                "subject": {"type": "string"},
                "question": {"type": "string"},
                "chapter": {"type": "integer"},
            },
            "required": ["kind"],
        },
    },
}


def _render_corpus(corpus: dict) -> str:
    """Flatten the guide corpus into prompt text the model can quote from.

    Tile ids stay out of the rendering: a probe against the box showed the
    model conflating tile id with chapter number, and the client only links
    chapter mentions.
    """
    lines: list[str] = []
    title = corpus.get("reference", {}).get("title", "the field guide")
    lines.append(f"The guide is built on {title}. Its tiles map to chapters:")
    for tile in corpus.get("tiles", []):
        lines.append(f"- {tile['title']}: chapter {tile['chapter']}")
    tiles_by_id = {tile["id"]: tile for tile in corpus.get("tiles", [])}
    for guide in corpus.get("guides", []):
        tile = tiles_by_id.get(guide.get("tileId"), {})
        lines.append("")
        lines.append(
            f"Guide entries for {tile.get('title', 'a tile')} "
            f"(chapter {tile.get('chapter', '?')}):"
        )
        if guide.get("intro"):
            lines.append(guide["intro"])
        for group in guide.get("groups", []):
            for item in group.get("items", []):
                lines.append(f"- {item['title']}: {item['blurb']}")
    return "\n".join(lines)


def build_system_prompt(corpus: dict, include_tools: bool = True) -> str:
    """Prompt for the chat request; the text-only retry drops the tool rules
    so their vocabulary cannot leak into the prose."""
    parts = [_RULES]
    if include_tools:
        parts.append(_TOOL_RULES)
    parts.append(_render_corpus(corpus))
    return "\n\n".join(parts)


def _strip_think(content: str) -> str:
    return re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()


def _parse_tool(message: dict) -> ChatTool | None:
    """Turn the message's first launch_tool call into a validated ChatTool.

    Anything malformed, and any prime outside the known skills, is dropped:
    a bad tool must never cost the user the text answer.
    """
    calls = message.get("tool_calls") or []
    for call in calls:
        function = call.get("function") or {}
        if function.get("name") != "launch_tool":
            continue
        try:
            arguments = json.loads(function.get("arguments") or "")
        except json.JSONDecodeError:
            return None
        if not isinstance(arguments, dict):
            return None
        if not arguments.get("label"):
            arguments["label"] = _default_label(arguments)
        if not arguments.get("label"):
            return None
        try:
            tool = ChatTool.model_validate(arguments)
        except ValidationError:
            return None
        if tool.prime is not None and tool.prime not in KNOWN_PRIMES:
            return None
        if tool.kind == "camera" and tool.prime is None:
            return None
        return tool
    return None


def _default_label(arguments: dict) -> str | None:
    if arguments.get("prime") in DEFAULT_LABELS:
        return DEFAULT_LABELS[arguments["prime"]]
    if arguments.get("kind") == "reference" and arguments.get("chapter"):
        return f"Open chapter {arguments['chapter']}"
    return None


def _degenerate(text: str, tool: ChatTool | None) -> bool:
    """True when the text is not an answer a user should read.

    Live runs showed the model sometimes echoing the tool arguments as its
    content ("camera, knot-verification, bowline"); a prime leaking into the
    text marks that failure mode.
    """
    if not text:
        return True
    return tool is not None and tool.prime is not None and tool.prime in text


class NemotronRetriever:
    """Answers through the box's OpenAI-compatible Nemotron endpoint."""

    def __init__(
        self,
        base_url: str,
        model: str,
        corpus_path: Path = DEFAULT_CORPUS_PATH,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        corpus = json.loads(Path(corpus_path).read_text())
        self.system_prompt = build_system_prompt(corpus)
        self.text_only_prompt = build_system_prompt(corpus, include_tools=False)
        self._client = http_client or httpx.Client(timeout=CHAT_TIMEOUT_S)

    def answer(self, question: str) -> ChatAnswer:
        answer_id = f"ans_{uuid.uuid4().hex[:8]}"
        try:
            message = self._complete(question, with_tools=True)
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as error:
            logger.error("Nemotron chat completion failed: %s", error)
            return ChatAnswer(answer_id=answer_id, text=UNREACHABLE_TEXT)
        tool = _parse_tool(message)
        text = _strip_think(message.get("content") or "")
        if _degenerate(text, tool):
            # The model answered with only a tool call, or echoed the call's
            # arguments as its text; ask again without tools for the prose
            # the user reads. A failure here still ships the tool under a
            # minimal line rather than erroring.
            text = self._text_only(question, tool)
        return ChatAnswer(answer_id=answer_id, text=text, tool=tool)

    def _text_only(self, question: str, tool: ChatTool | None) -> str:
        try:
            message = self._complete(question, with_tools=False)
            text = _strip_think(message.get("content") or "")
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as error:
            logger.error("Nemotron text-only retry failed: %s", error)
            text = ""
        if text:
            return text
        if tool is not None:
            return f"Use the tool below: {tool.label}."
        return UNREACHABLE_TEXT

    def _complete(self, question: str, with_tools: bool) -> dict:
        prompt = self.system_prompt if with_tools else self.text_only_prompt
        body: dict = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": question},
            ],
            "temperature": 0.2,
            "max_tokens": 1024,
        }
        if with_tools:
            body["tools"] = [LAUNCH_TOOL]
            body["tool_choice"] = "auto"
        response = self._client.post(f"{self.base_url}/chat/completions", json=body)
        response.raise_for_status()
        message = response.json()["choices"][0]["message"]
        if not isinstance(message, dict):
            raise TypeError("chat completion message is not an object")
        return message
