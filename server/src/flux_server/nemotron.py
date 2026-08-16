"""Nemotron-backed answerer behind POST /v1/chat (ticket #44).

NemotronRetriever calls the box's OpenAI-compatible chat-completions endpoint
(the VSS stack's Nemotron Nano 9B v2 FP8 container, ticket #43, reached via
FLUX_NEMOTRON_URL) with a system prompt built from the committed guide corpus
(app/src/data/guide-corpus.json). The model answers survival questions in the
guide's voice and names chapters in prose so the client can hyperlink
"chapter N" mentions.

The tool decision is a second, tiny chat completion (ticket #53): a
classification prompt sorts the question into one of the skill categories,
which maps deterministically onto the ChatTool wire shape. On 14 hand-labeled
questions this scored 14/14, against 9/14 for the #50 keyword floor, 4/14 for
prompt-forced tool calling, and 3/14 for tool_choice "required" (the model
never auto-calls a declared function under this serving template, and forced
calls are junk). The keyword floor survives only for the model-unreachable
path, where no classification is possible. Any model failure degrades to a
plain answer; the route never errors because the box is down.
"""

import json
import logging
import re
import sqlite3
import time
import uuid
from pathlib import Path

import httpx

from flux_server.content import ContentStore
from flux_server.library import ResearchQueue
from flux_server.models import (
    ChatAnswer,
    ChatQueueNote,
    ChatSource,
    ChatTool,
    InferenceTrace,
)
from flux_server.prompts import chat_system_prompt

logger = logging.getLogger(__name__)

CHAT_TIMEOUT_S = 120.0

# Two-tier retrieval (#185): how many pack blocks a question pulls into the
# prompt, and how much of each block's text rides along. Five slots, because
# the ranked list mixes species lists with the governing rule blocks and a
# three-slot window dropped the rule ("eat only plants you can positively
# identify") behind the lists, leaving the model to declare non-coverage.
PASSAGE_LIMIT = 5
PASSAGE_CHARS = 800

PASSAGES_HEADER = (
    "\n\nPack passages matching the question (quote these for the technical "
    "parts and cite their chapters):\n"
)

# Topic naming for the research queue (#193): the same tiny-completion
# pattern as CLASSIFY_PROMPT. max_tokens also routes the test mock, so the
# three call sizes (answer, classify 16, topic 24) stay distinct.
TOPIC_MAX_TOKENS = 24
TOPIC_PROMPT = (
    "/no_think\n"
    "The user asked a question the field guide's library does not cover. "
    "Name the library topic that would cover it, in two to four plain "
    'words, for example "seed storage" or "growing food". Reply with only '
    "the topic. Reply none when the message is a greeting, small talk, or "
    "not a request for information."
)
DEFAULT_CORPUS_PATH = (
    Path(__file__).resolve().parents[3] / "app" / "src" / "data" / "guide-corpus.json"
)

UNREACHABLE_TEXT = (
    "The assistant model is not reachable right now, so no answer can be "
    "generated. The field guide itself still works offline: open the tile "
    "closest to your question and read its chapter."
)

# The camera skills the tool field may launch (ticket #44).
KNOWN_PRIMES = {"knot-verification", "species-id", "wildlife-id"}

DEFAULT_LABELS = {
    "knot-verification": "Check my knot",
    "species-id": "Identify a plant",
    "wildlife-id": "Identify an animal",
}

# Keyword floor (#50), now only for the model-unreachable path: the camera
# skills run without the LLM, so the question's keywords still attach one.
# Exactly the shipped frontend mock's map (app/src/api/chat.ts history).
KEYWORD_TOOLS = [
    (("knot", "rope", "lash", "cord"), "knot-verification"),
    (("eat", "food", "plant", "berry", "edib", "mushroom"), "species-id"),
    (("snake", "bite", "animal", "bear", "sting"), "wildlife-id"),
]

# The six knots the guide teaches, as they appear in questions -> subject.
KNOT_SUBJECTS = {
    "bowline": "bowline",
    "taut-line hitch": "taut-line-hitch",
    "taut line hitch": "taut-line-hitch",
    "clove hitch": "clove-hitch",
    "trucker's hitch": "truckers-hitch",
    "truckers hitch": "truckers-hitch",
    "figure-eight": "figure-eight",
    "figure eight": "figure-eight",
    "square knot": "square-knot",
}

# The measured classification prompt (#53); wording matches the probe run
# that scored 14/14, so a rewording is a re-measurement.
CLASSIFY_PROMPT = (
    "/no_think\n"
    "Classify the user's question into exactly one category. Reply with only "
    "the category token, nothing else.\n"
    "- knot-verification: tying, checking, or fixing knots and lashings\n"
    "- species-id: identifying or judging plants, berries, fungi, mushrooms\n"
    "- wildlife-id: identifying animals, snakes, tracks, scat, or animal signs\n"
    "- reference: asking to read a chapter or the manual itself\n"
    "- none: anything else (fire, water, shelter, weather, navigation, general "
    "survival procedure)"
)

CATEGORIES = KNOWN_PRIMES | {"reference"}


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


def build_system_prompt(corpus: dict) -> str:
    return chat_system_prompt(_render_corpus(corpus))


def _strip_think(content: str) -> str:
    return re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()


# A sourced answer opening with a non-coverage claim contradicts its own
# passages: the model keeps producing "The guide does not cover berries"
# ahead of a well-grounded answer even when the prompt forbids the phrase,
# so the server drops those leading sentences instead. Only the opening is
# scrubbed; a caveat later in a grounded answer stands.
_NON_COVERAGE_SENTENCE = re.compile(
    r"((?:does|do) not (?:directly )?(?:cover|address)"
    r"|not (?:covered|addressed)|outside the scope|review log)",
    re.IGNORECASE,
)


def _drop_false_non_coverage(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    kept = 0
    while kept < len(sentences) and _NON_COVERAGE_SENTENCE.search(sentences[kept]):
        kept += 1
    remainder = " ".join(sentences[kept:]).strip()
    return remainder or text


def _parse_category(content: str) -> str | None:
    words = _strip_think(content).split()
    if not words:
        return None
    token = words[0].strip(".,:").lower()
    return token if token in CATEGORIES else None


def _knot_subject(question: str) -> str | None:
    lowered = question.lower()
    return next(
        (kebab for name, kebab in KNOT_SUBJECTS.items() if name in lowered), None
    )


def _first_chapter_mention(text: str) -> int | None:
    match = re.search(r"\bchapter\s+(\d+)", text, flags=re.IGNORECASE)
    return int(match.group(1)) if match else None


def _tool_from_question(question: str) -> ChatTool | None:
    """The unreachable-path floor: derive a camera tool from question keywords.

    A named knot triggers knot-verification on its own: the map's keywords
    miss "How do I tie a bowline?", the exact question that motivated #50.
    """
    lowered = question.lower()
    subject = _knot_subject(question)
    prime = next(
        (
            prime
            for keywords, prime in KEYWORD_TOOLS
            if any(keyword in lowered for keyword in keywords)
        ),
        None,
    )
    if subject is not None:
        prime = "knot-verification"
    if prime is None:
        return None
    return ChatTool(
        kind="camera",
        label=DEFAULT_LABELS[prime],
        prime=prime,
        subject=subject if prime == "knot-verification" else None,
    )


class NemotronRetriever:
    """Answers through the box's OpenAI-compatible Nemotron endpoint."""

    def __init__(
        self,
        base_url: str,
        model: str,
        corpus_path: Path = DEFAULT_CORPUS_PATH,
        http_client: httpx.Client | None = None,
        content: ContentStore | None = None,
        research_queue: ResearchQueue | None = None,
        options: dict[str, tuple[str, str]] | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        # Named alternatives (#237): option name -> (base_url, model). The
        # request's option serves the answer completion; the small
        # classification and topic-naming completions stay on the default,
        # which keeps their measured prompts on the model they were
        # measured against.
        self._options = options or {}
        self._turn_tokens_in = 0
        self._turn_tokens_out = 0
        corpus = json.loads(Path(corpus_path).read_text())
        self.system_prompt = build_system_prompt(corpus)
        self._tiles = [
            (tile["title"], tile["chapter"]) for tile in corpus.get("tiles", [])
        ]
        self._client = http_client or httpx.Client(timeout=CHAT_TIMEOUT_S)
        self._content = content
        self._research_queue = research_queue

    def answer(self, question: str, option: str | None = None) -> ChatAnswer:
        answer_id = f"ans_{uuid.uuid4().hex[:8]}"
        started = time.monotonic()
        # Unknown option names resolve to the default pair; the trace below
        # names whichever model actually answered.
        answer_url, answer_model = self._options.get(
            option or "", (self.base_url, self.model)
        )
        # Per-answer token totals across every completion this turn
        # makes (answer, tool classification, topic naming). Single request
        # at a time in practice; a concurrent chat would blur the counts,
        # not corrupt them.
        self._turn_tokens_in = 0
        self._turn_tokens_out = 0
        sources, passages = self._retrieve(question)
        try:
            content = self._answer_text(
                question + passages, base_url=answer_url, model=answer_model
            )
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as error:
            logger.error("Nemotron chat completion failed: %s", error)
            return ChatAnswer(
                answer_id=answer_id,
                text=UNREACHABLE_TEXT,
                tool=_tool_from_question(question),
            )
        text = _strip_think(content) or UNREACHABLE_TEXT
        # The demand-side signal reads the model's own verdict before the
        # scrub touches it: passages that only loosely bore on the question
        # make the model declare non-coverage, and that topic belongs in
        # the queue exactly like a sourceless one.
        declared_non_coverage = _NON_COVERAGE_SENTENCE.search(text) is not None
        if sources:
            text = _drop_false_non_coverage(text)
        tool = self._decide_tool(question, text)
        covered = bool(sources) and not declared_non_coverage
        queued = None if covered else self._queue_topic(question)
        # One trace covers the model calls: the answer completion, the tool
        # classification, and the topic naming on unsourced answers.
        return ChatAnswer(
            answer_id=answer_id,
            text=text,
            tool=tool,
            sources=sources or None,
            queued=queued,
            trace=InferenceTrace(
                model=answer_model,
                latency_ms=int((time.monotonic() - started) * 1000),
                tokens_in=self._turn_tokens_in or None,
                tokens_out=self._turn_tokens_out or None,
            ),
        )

    def _queue_topic(self, question: str) -> ChatQueueNote | None:
        """Record an unsourced question's topic in the research queue (#193).

        A tiny completion names the topic; "none" (greetings, small talk)
        and any model or queue failure skip queueing rather than guessing.
        """
        if self._research_queue is None:
            return None
        try:
            message = self._complete(
                system=TOPIC_PROMPT,
                question=question,
                temperature=0.0,
                max_tokens=TOPIC_MAX_TOKENS,
            )
            raw = _strip_think(message.get("content") or "")
            first_line = raw.splitlines()[0] if raw else ""
            topic = " ".join(first_line.split()).strip('."“”').lower()
            if not topic or topic == "none" or len(topic) > 60:
                return None
            _, added = self._research_queue.add(topic, question)
            return ChatQueueNote(topic=topic, state="added" if added else "queued")
        except (httpx.HTTPError, KeyError, IndexError, TypeError, OSError) as error:
            logger.error("research-queue topic naming failed: %s", error)
            return None

    def _retrieve(self, question: str) -> tuple[list[ChatSource], str]:
        """Pack passages for the question: the sources for the wire and the
        prompt block carrying their text. No pack, no hits, and any search
        failure all mean a plain model answer (#185)."""
        if self._content is None:
            return [], ""
        try:
            hits = self._content.search_any(question, PASSAGE_LIMIT)
            lines = []
            for hit in hits:
                block = self._content.block(hit["block_id"]) or {}
                text = (block.get("text") or "")[:PASSAGE_CHARS]
                section = self._content.section(hit["section_id"]) or {}
                chapter = self._content.chapter(hit["chapter_id"]) or {}
                label = f"chapter {chapter.get('fm_number', '?')}"
                if section.get("title"):
                    label += f", {section['title']}"
                lines.append(f"- [{label}] {text}")
        except sqlite3.Error as error:
            logger.error("pack retrieval failed: %s", error)
            return [], ""
        if not lines:
            return [], ""
        sources = [
            ChatSource(
                block_id=hit["block_id"],
                section_id=hit["section_id"],
                chapter_id=hit["chapter_id"],
                snippet=hit["snippet"],
            )
            for hit in hits
        ]
        return sources, PASSAGES_HEADER + "\n".join(lines)

    def _decide_tool(self, question: str, answer_text: str) -> ChatTool | None:
        """Classify the question and map the category onto a ChatTool.

        A classification failure drops the tool, never the answer.
        """
        try:
            category = _parse_category(self._classify(question))
        except (httpx.HTTPError, KeyError, IndexError, TypeError) as error:
            logger.error("Nemotron classification failed: %s", error)
            return None
        if category in KNOWN_PRIMES:
            subject = (
                _knot_subject(question) if category == "knot-verification" else None
            )
            return ChatTool(
                kind="camera",
                label=DEFAULT_LABELS[category],
                prime=category,
                subject=subject,
            )
        if category == "reference":
            chapter = self._resolve_chapter(question, answer_text)
            if chapter is None:
                return None
            return ChatTool(
                kind="reference", label=f"Open chapter {chapter}", chapter=chapter
            )
        return None

    def _resolve_chapter(self, question: str, answer_text: str) -> int | None:
        """The answer's first chapter mention wins; the tile map covers the
        rest by matching a tile-title word in the question."""
        mentioned = _first_chapter_mention(answer_text)
        if mentioned is not None:
            return mentioned
        lowered = question.lower()
        for title, chapter in self._tiles:
            words = [
                word for word in re.findall(r"[a-z]+", title.lower()) if len(word) > 3
            ]
            if any(word in lowered for word in words):
                return chapter
        return None

    def _answer_text(
        self, question: str, base_url: str | None = None, model: str | None = None
    ) -> str:
        message = self._complete(
            system=self.system_prompt,
            question=question,
            temperature=0.2,
            max_tokens=1024,
            base_url=base_url,
            model=model,
        )
        return message.get("content") or ""

    def _classify(self, question: str) -> str:
        message = self._complete(
            system=CLASSIFY_PROMPT, question=question, temperature=0.0, max_tokens=16
        )
        return message.get("content") or ""

    def _complete(
        self,
        system: str,
        question: str,
        temperature: float,
        max_tokens: int,
        base_url: str | None = None,
        model: str | None = None,
    ) -> dict:
        response = self._client.post(
            f"{(base_url or self.base_url).rstrip('/')}/chat/completions",
            json={
                "model": model or self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": question},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        response.raise_for_status()
        payload = response.json()
        message = payload["choices"][0]["message"]
        if not isinstance(message, dict):
            raise TypeError("chat completion message is not an object")
        usage = payload.get("usage") or {}
        self._turn_tokens_in += usage.get("prompt_tokens") or 0
        self._turn_tokens_out += usage.get("completion_tokens") or 0
        return message
