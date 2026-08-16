"""Sky reading (#171-adjacent, pitch scene three): clip plus climate memory.

A short sky clip goes to the cosmos NIM for what is actually visible: cloud
forms, coverage, motion, light. The server folds that observation into the
region's climate normals (bundled NOAA monthly normals for SeaTac, public
domain) and answers implication first. The reply is an outlook grounded in
what the sky shows plus what this month usually does; it says so plainly
rather than posing as a forecast feed.
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Protocol

import httpx

from flux_server.coach import frames_to_content

logger = logging.getLogger(__name__)

READ_TIMEOUT_S = 90.0

# NOAA 1991-2020 U.S. Climate Normals, Seattle-Tacoma International Airport
# (USW00024233): mean days with >= 0.01 in precipitation and mean daily high,
# by month. Public domain (NOAA NCEI).
SEATAC_NORMALS = {
    1: {"rain_days": 19, "high_f": 48},
    2: {"rain_days": 15, "high_f": 50},
    3: {"rain_days": 17, "high_f": 54},
    4: {"rain_days": 15, "high_f": 59},
    5: {"rain_days": 11, "high_f": 66},
    6: {"rain_days": 9, "high_f": 70},
    7: {"rain_days": 4, "high_f": 77},
    8: {"rain_days": 5, "high_f": 77},
    9: {"rain_days": 8, "high_f": 71},
    10: {"rain_days": 14, "high_f": 60},
    11: {"rain_days": 19, "high_f": 52},
    12: {"rain_days": 18, "high_f": 47},
}

SKY_PROMPT = (
    "These frames are one continuous look at the sky. Describe only what is "
    "visible: cloud forms (cumulus, stratus, cirrus, cumulonimbus and so on), "
    "how much of the sky they cover, their darkness, any motion or haze, and "
    "the light. "
    'Reply with JSON only: {{"clouds": "<forms and coverage>", '
    '"signs": "<what these skies typically precede>", '
    '"visibility": "<clear/hazy/obscured>"}}'
)

OUTLOOK_PROMPT = (
    "You are a survival guide's weather sense, working offline from two "
    "inputs. The sky right now: {clouds}. Typical of these skies: {signs}. "
    "Climate memory for this area in month {month}: about {rain_days} days "
    "with rain and daily highs near {high_f} F. "
    "Give the outlook for the next day or two, implication first in one "
    "sentence (what to prepare for), then the reasoning from the sky and the "
    "season in one or two more. Plain calm language. This is an outlook from "
    "observation and climate memory, not a forecast feed, and say nothing "
    "you cannot ground in those two inputs."
)


@dataclass(frozen=True)
class SkyReading:
    outlook: str
    clouds: str
    month: int
    rain_days: int
    high_f: int


class SkyReader(Protocol):
    def read(self, frames: list[bytes], month: int) -> SkyReading | None:
        """An outlook, or None when a model reply is unusable."""
        ...


class CosmosNemotronSky:
    """Cosmos reads the sky; Nemotron writes the outlook over the normals."""

    def __init__(self, cosmos_url: str, cosmos_model: str, nemotron_url: str) -> None:
        self._cosmos = cosmos_url.rstrip("/") + "/v1/chat/completions"
        self._cosmos_model = cosmos_model
        self._nemotron = nemotron_url.rstrip("/") + "/chat/completions"

    def read(self, frames: list[bytes], month: int) -> SkyReading | None:
        try:
            response = httpx.post(
                self._cosmos,
                json={
                    "model": self._cosmos_model,
                    "temperature": 0,
                    "max_tokens": 300,
                    "messages": [
                        {
                            "role": "user",
                            "content": frames_to_content(SKY_PROMPT, frames),
                        }
                    ],
                },
                timeout=READ_TIMEOUT_S,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError) as error:
            logger.warning("sky read failed: %s", error)
            return None
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match is None:
            return None
        try:
            seen = json.loads(match.group(0))
        except ValueError:
            return None
        normals = SEATAC_NORMALS[month]
        prompt = OUTLOOK_PROMPT.format(
            clouds=seen.get("clouds", "unclear sky"),
            signs=seen.get("signs", "no strong signal"),
            month=month,
            rain_days=normals["rain_days"],
            high_f=normals["high_f"],
        )
        try:
            response = httpx.post(
                self._nemotron,
                json={
                    "model": "nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8",
                    "temperature": 0.2,
                    "max_tokens": 400,
                    "messages": [{"role": "user", "content": "/no_think\n" + prompt}],
                },
                timeout=READ_TIMEOUT_S,
            )
            response.raise_for_status()
            outlook = response.json()["choices"][0]["message"]["content"].strip()
        except (httpx.HTTPError, KeyError, IndexError) as error:
            logger.warning("outlook write failed: %s", error)
            return None
        return SkyReading(
            outlook=outlook,
            clouds=str(seen.get("clouds", "")),
            month=month,
            rain_days=normals["rain_days"],
            high_f=normals["high_f"],
        )


def sky_reader_from_env(
    cosmos_url: str | None, cosmos_model: str, nemotron_url: str | None
) -> SkyReader | None:
    if not cosmos_url or not nemotron_url:
        return None
    return CosmosNemotronSky(cosmos_url, cosmos_model, nemotron_url)
