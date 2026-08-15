"""PDF boundary: turn the manual PDF into Line records."""

from __future__ import annotations

from pathlib import Path

from flux_pipeline.lines import Line

# Words whose tops differ by no more than this many points sit on one line.
LINE_TOLERANCE = 3.0


def _font_kind(fontnames: set[str]) -> str:
    stripped = {name.split("+")[-1] for name in fontnames}
    if stripped == {"Helvetica-Bold"}:
        return "bold"
    if stripped == {"Helvetica-BoldOblique"}:
        return "bold_oblique"
    return "body"


def extract_lines(pdf_path: Path) -> list[Line]:
    """Extract every page's text as Line records in reading order."""
    import pdfplumber  # heavy import, deferred to the extraction path

    lines: list[Line] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            words = page.extract_words(extra_attrs=["fontname"])
            words.sort(key=lambda w: (w["top"], w["x0"]))
            clusters: list[list[dict]] = []
            for word in words:
                if (
                    clusters
                    and abs(word["top"] - clusters[-1][0]["top"]) <= LINE_TOLERANCE
                ):
                    clusters[-1].append(word)
                else:
                    clusters.append([word])
            prev_bottom: float | None = None
            for cluster in clusters:
                cluster.sort(key=lambda w: w["x0"])
                top = min(w["top"] for w in cluster)
                bottom = max(w["bottom"] for w in cluster)
                lines.append(
                    Line(
                        text=" ".join(w["text"] for w in cluster),
                        font_kind=_font_kind({w["fontname"] for w in cluster}),
                        gap_before=None if prev_bottom is None else top - prev_bottom,
                        page=page_number,
                    )
                )
                prev_bottom = bottom
    return lines
