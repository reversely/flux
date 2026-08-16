"""Per-node camera inference (#130): one bounded answer the user confirms.

A walkthrough node whose answer_source admits the camera can take a short
condition clip; the box VLM answers the node's one question with one of the
node's own states or unsure, a confidence, and a short observation naming
the visible evidence. The model never decides: the response is a suggestion
the screen prefills, and the session records nothing until the user confirms
through the existing answer route.
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Protocol

import httpx

from flux_server.coach import frames_to_content

logger = logging.getLogger(__name__)

OBSERVE_TIMEOUT_S = 60.0

OBSERVE_PROMPT = (
    "You are looking at frames from one short clip of a specimen. Answer "
    "exactly one question about one visible attribute.\n"
    "Question: {question}\n"
    "Acceptable answers: {states}, or unsure.\n"
    "If the evidence is not clearly visible in these frames, answer unsure. "
    'Reply with JSON only: {{"answer": "<one acceptable answer>", '
    '"confidence": <0 to 1>, "observation": "<one short sentence naming '
    'the visible evidence>"}}'
)


@dataclass(frozen=True)
class Observation:
    """The bounded suggestion for one node."""

    state: str | None  # None encodes unsure
    confidence: float
    observation: str


class ObserveClassifier(Protocol):
    def observe(
        self, question: str, states: list[str], frames: list[bytes]
    ) -> Observation | None:
        """A bounded answer, or None when the model reply is unusable."""
        ...


class CosmosObserver:
    """Asks the cosmos NIM the node's one question over sampled frames."""

    def __init__(self, base_url: str, model: str) -> None:
        self._url = base_url.rstrip("/") + "/v1/chat/completions"
        self._model = model

    def observe(
        self, question: str, states: list[str], frames: list[bytes]
    ) -> Observation | None:
        prompt = OBSERVE_PROMPT.format(question=question, states=", ".join(states))
        try:
            response = httpx.post(
                self._url,
                json={
                    "model": self._model,
                    "temperature": 0,
                    "max_tokens": 300,
                    "messages": [
                        {"role": "user", "content": frames_to_content(prompt, frames)}
                    ],
                },
                timeout=OBSERVE_TIMEOUT_S,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError) as error:
            logger.warning("observe call failed: %s", error)
            return None
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match is None:
            return None
        try:
            parsed = json.loads(match.group(0))
        except ValueError:
            return None
        answer = str(parsed.get("answer", "unsure")).strip().lower()
        state = answer if answer in {s.lower() for s in states} else None
        try:
            confidence = max(0.0, min(1.0, float(parsed.get("confidence", 0.0))))
        except (TypeError, ValueError):
            confidence = 0.0
        return Observation(
            state=state,
            confidence=confidence,
            observation=str(parsed.get("observation", ""))[:300],
        )


def observer_from_env(base_url: str | None, model: str) -> ObserveClassifier | None:
    if not base_url:
        return None
    return CosmosObserver(base_url, model)
