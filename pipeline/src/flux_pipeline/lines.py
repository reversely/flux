"""Line-level model of the extracted PDF and its normalization passes."""

from __future__ import annotations

import re
from dataclasses import dataclass, replace

HEADER_PREFIX = "FM 21-76 US ARMY SURVIVAL MANUAL"
FOOTER_RE = re.compile(r"^Page \d+ of \d+$")
BULLET = "•"


@dataclass(frozen=True)
class Line:
    """One visual text line with the layout facts the parser needs.

    font_kind is "bold", "bold_oblique", or "body"; a line counts as a heading
    font only when every word on it uses that font. gap_before is the vertical
    distance to the previous line on the same page, None at a page start.
    """

    text: str
    font_kind: str = "body"
    gap_before: float | None = None
    page: int = 0


def strip_headers_and_footers(lines: list[Line]) -> list[Line]:
    """Drop the repeating page header and the page-number footer."""
    return [
        line
        for line in lines
        if not line.text.startswith(HEADER_PREFIX) and not FOOTER_RE.match(line.text)
    ]


def reattach_bullets(lines: list[Line]) -> list[Line]:
    """Merge a lone bullet glyph into the following line.

    Layout extraction sometimes emits the Symbol-font bullet at a baseline a
    few points off its item text, so it surfaces as its own line. The item
    text is the next line in reading order.
    """
    out: list[Line] = []
    pending_bullet = False
    for line in lines:
        if line.text.strip() == BULLET:
            pending_bullet = True
            continue
        if pending_bullet:
            line = replace(line, text=f"{BULLET} {line.text}")
            pending_bullet = False
        out.append(line)
    return out


def normalize(lines: list[Line]) -> list[Line]:
    """Run both normalization passes in order."""
    return reattach_bullets(strip_headers_and_footers(lines))
