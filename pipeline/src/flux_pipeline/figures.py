"""Extract the manual's figure images into the pack (#137).

The FM 21-76 PDF embeds each figure as one image object with an exact
bounding box, so extraction is coordinate arithmetic, not detection: find
which page cites each figure ref, pair the page's images top-down with the
refs in caption order, render the page once, and crop. image_path lands on
the figure row; a ref that cannot be paired stays NULL and is reported,
never guessed.
"""

from __future__ import annotations

import re
import sqlite3
import subprocess
import tempfile
from pathlib import Path

import pdfplumber
from PIL import Image

CAPTION_OCR_RE = re.compile(r"Figure\s+(\d+[-—]\d+)")


def ocr_caption(crop: Image.Image, tmp: Path) -> str | None:
    """The figure number from the caption baked into the crop's bottom strip."""
    strip = crop.crop((0, int(crop.height * 0.82), crop.width, crop.height))
    strip_path = tmp / "strip.png"
    strip.save(strip_path)
    result = subprocess.run(
        ["tesseract", str(strip_path), "stdout", "--psm", "6"],
        capture_output=True,
        text=True,
        check=False,
    )
    match = CAPTION_OCR_RE.search(result.stdout)
    return match.group(1).replace("—", "-") if match else None


RENDER_DPI = 150
SCALE = RENDER_DPI / 72.0
# Tiny inset so the scan's frame line stays out of the crop.
INSET_PT = 2.0

# Images smaller than this are ornaments (chapter icons), not figures.
MIN_SIDE_PT = 60
# Chapter emblems sit on a chapter's first page and are narrower than the
# text column; real figures span close to its full width.
MIN_FIGURE_WIDTH_PT = 200

# First PDF page of each chapter, from the scan's own headings (the same
# table the app's reference screen uses). Figure captions are baked into
# the scanned images, so pairing goes by order instead: within a chapter's
# page range, embedded images appear in the same order as its figure
# numbers.
CHAPTER_PAGES = {
    1: 5,
    2: 8,
    3: 14,
    4: 16,
    5: 38,
    6: 53,
    7: 63,
    8: 72,
    9: 99,
    10: 109,
    11: 112,
    12: 120,
    13: 131,
    14: 139,
    15: 146,
    16: 162,
    17: 185,
    18: 194,
    19: 200,
    20: 209,
    21: 215,
    22: 219,
    23: 221,
}
LAST_PAGE = 233


def write_figures(pdf_path: Path, db_path: Path, out_dir: Path) -> str:
    out_dir.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        wanted = {
            ref: figure_id
            for figure_id, ref in conn.execute("SELECT id, fm_figure_ref FROM figure")
        }

    def chapter_of(ref: str) -> int:
        return int(ref.split("-")[0])

    by_chapter: dict[int, list[str]] = {}
    for ref in wanted:
        by_chapter.setdefault(chapter_of(ref), []).append(ref)
    for refs in by_chapter.values():
        refs.sort(key=lambda r: int(r.split("-")[1]))

    attached: dict[str, str] = {}
    mismatched: list[int] = []
    (out_dir / "figures").mkdir(exist_ok=True)
    with pdfplumber.open(pdf_path) as pdf, tempfile.TemporaryDirectory() as tmp:
        for chapter, refs in sorted(by_chapter.items()):
            first = CHAPTER_PAGES[chapter]
            last = min(
                CHAPTER_PAGES.get(chapter + 1, LAST_PAGE + 1) - 1, len(pdf.pages)
            )
            spots = []
            for page_number in range(first, last + 1):
                page = pdf.pages[page_number - 1]
                for im in sorted(page.images, key=lambda i: i["top"]):
                    wide = im["x1"] - im["x0"]
                    tall = im["bottom"] - im["top"]
                    if wide < MIN_SIDE_PT or tall < MIN_SIDE_PT:
                        continue
                    if page_number == first and wide < MIN_FIGURE_WIDTH_PT:
                        continue  # chapter emblem
                    spots.append((page_number, im))
            # Crop every candidate, read the caption baked into its bottom
            # strip, and let the caption assign the ref. Order pairing is
            # only the fallback for the crops OCR cannot read, and applies
            # only when the counts already agree.
            crops: list[tuple[str | None, Image.Image]] = []
            for page_number, im in spots:
                page_png = Path(tmp) / f"p{page_number}.png"
                if not page_png.exists():
                    subprocess.run(
                        [
                            "pdftoppm",
                            "-f",
                            str(page_number),
                            "-l",
                            str(page_number),
                            "-r",
                            str(RENDER_DPI),
                            "-png",
                            "-singlefile",
                            str(pdf_path),
                            str(page_png.with_suffix("")),
                        ],
                        check=True,
                        capture_output=True,
                    )
                rendered = Image.open(page_png)
                box = (
                    max(0, int((im["x0"] + INSET_PT) * SCALE)),
                    max(0, int((im["top"] + INSET_PT) * SCALE)),
                    min(rendered.width, int((im["x1"] - INSET_PT) * SCALE)),
                    min(rendered.height, int((im["bottom"] - INSET_PT) * SCALE)),
                )
                crop = rendered.crop(box).convert("RGB")
                crops.append((ocr_caption(crop, Path(tmp)), crop))

            assigned: dict[str, Image.Image] = {}
            unread = []
            for caption_ref, crop in crops:
                if caption_ref in refs and caption_ref not in assigned:
                    assigned[caption_ref] = crop
                else:
                    unread.append(crop)
            leftover_refs = [r for r in refs if r not in assigned]
            if len(unread) == len(leftover_refs):
                assigned.update(zip(leftover_refs, unread))
            else:
                mismatched.append(chapter)
            for ref, crop in assigned.items():
                name = f"figures/fig-{ref}.png"
                crop.save(out_dir / name, optimize=True)
                attached[ref] = name

    with sqlite3.connect(db_path) as conn:
        for ref, name in attached.items():
            conn.execute(
                "UPDATE figure SET image_path = ? WHERE fm_figure_ref = ?",
                (name, ref),
            )

    return f"figures: {len(attached)}/{len(wanted)} attached -> {out_dir}/figures" + (
        f"; count-mismatched chapters left NULL: {mismatched}" if mismatched else ""
    )
