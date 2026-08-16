"""Perception relay: uploaded frames identify against the box service (#105).

The box perception service (box/services/perception, port 8100) answers POST
/identify with three model families over one JPEG: SpeciesNet (a single
prediction with detector boxes), BioCLIP retrieval top-k, and FungiTastic
class scores. The relay flattens those into IdentificationRecord rows the
app can rank: one row per candidate, tagged with the model that produced it.

Same honest gating as the VSS handoff: without FLUX_PERCEPTION_URL there is
no fabricated record, the results simply stay empty.
"""

import logging
import os
from typing import Protocol

import httpx

logger = logging.getLogger(__name__)

IDENTIFY_TIMEOUT_S = 60.0


class PerceptionClient(Protocol):
    def identify(self, image: bytes) -> list[dict] | None:
        """Candidate records for one frame, or None when unconfigured."""
        ...


class NotConfiguredPerception:
    """No perception endpoint: frames store, results stay honestly empty."""

    def identify(self, image: bytes) -> list[dict] | None:
        logger.warning(
            "FLUX_PERCEPTION_URL not configured: frame stored without records"
        )
        return None


def _speciesnet_label(prediction: str) -> str:
    """The taxon path's most specific non-empty segment, human readable."""
    parts = [p for p in prediction.split(";")[1:] if p]
    return parts[-1] if parts else prediction


class HttpPerception:
    """Forwards frames to the box /identify and flattens the reply."""

    def __init__(self, base_url: str, http_client: httpx.Client | None = None) -> None:
        self._url = base_url.rstrip("/") + "/identify"
        self._client = http_client or httpx.Client(timeout=IDENTIFY_TIMEOUT_S)

    def identify(self, image: bytes) -> list[dict] | None:
        try:
            response = self._client.post(
                self._url, files={"file": ("frame.jpg", image, "image/jpeg")}
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as error:
            logger.error("perception identify failed: %s", error)
            return []
        records: list[dict] = []
        speciesnet = payload.get("speciesnet")
        if isinstance(speciesnet, dict) and speciesnet.get("prediction"):
            records.append(
                {
                    "source": "speciesnet",
                    "label": _speciesnet_label(speciesnet["prediction"]),
                    "score": float(speciesnet.get("score") or 0.0),
                }
            )
        for row in payload.get("bioclip") or []:
            records.append(
                {
                    "source": "bioclip",
                    "label": str(row.get("label", "")),
                    "score": float(row.get("score") or 0.0),
                }
            )
        for row in payload.get("fungitastic") or []:
            records.append(
                {
                    "source": "fungitastic",
                    "label": str(row.get("class_index", "")),
                    "score": float(row.get("score") or 0.0),
                }
            )
        records.sort(key=lambda r: r["score"], reverse=True)
        return records


def perception_from_env() -> PerceptionClient:
    """A real relay when FLUX_PERCEPTION_URL names the box, else unconfigured."""
    base_url = os.environ.get("FLUX_PERCEPTION_URL")
    if not base_url:
        return NotConfiguredPerception()
    return HttpPerception(base_url)
