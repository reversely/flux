"""Turn normalized lines into anchored chapter, section, block, and figure records."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from flux_pipeline.lines import BULLET, Line

SOURCE_MANUAL = "FM 21-76"
ANCHOR_PREFIX = "fm21-76"

CHAPTER_RE = re.compile(r"^CHAPTER (\d+)\s*-\s*(.*)$")
MNEMONIC_RE = re.compile(r"^[A-Z]\s*-\s*\S")
NOTE_RE = re.compile(r"^Notes?\s*:")
REFERENCE_RE = re.compile(r"^(See|Refer to)\b")
FIGURE_RE = re.compile(r"Figure (\d+-\d+)")
SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
# Clauses with these terms need an editor to confirm civilian transfer
# (PRD 8.1). "soldier" stays off the list; this edition addresses the reader
# as a soldier in nearly every paragraph, so it separates nothing.
MILITARY_RE = re.compile(
    r"\b(enem(?:y|ies)|hostile|combat|camouflag\w*|evasion|evade|captiv\w*|captor"
    r"|prisoner|interrogat\w*|battlefield|ambush|sentry|patrol|weapon\w*|military"
    r"|POW|friendly (?:lines|forces)|firearm\w*|rifle\w*|grenade\w*)\b",
    re.IGNORECASE,
)

# Vertical gap that separates paragraphs; in-paragraph line spacing runs 1-2 pt.
PARAGRAPH_GAP = 4.0
# Gap under which a second heading-font line continues a wrapped heading.
HEADING_WRAP_GAP = 6.0

MILITARY_ARCHIVE_CHAPTERS = frozenset({20, 21, 22})
# PRD 1.3 tile table: FM chapter -> encyclopedia tile. Chapters 1-3 frame the
# app and chapters 20-22 archive; both carry no tile.
TILE_BY_CHAPTER = {
    4: 1,
    5: 2,
    7: 3,
    6: 4,
    17: 4,
    8: 5,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    18: 9,
    19: 10,
    13: 11,
    14: 11,
    15: 11,
    16: 11,
    23: 12,
}

HEADING_FONTS = ("bold", "bold_oblique")


@dataclass
class Chapter:
    id: str
    tile_id: int | None
    fm_number: int
    title: str
    priority_order: int


@dataclass
class Section:
    id: str
    chapter_id: str
    fm_heading: str | None
    title: str
    order: int


@dataclass
class Block:
    id: str
    section_id: str
    order: int
    type: str
    text: str
    figure_ref: str | None
    source: str
    review_status: str


@dataclass
class Figure:
    id: str
    block_id: str
    fm_figure_ref: str
    image_path: str | None
    source_manual: str
    license: str
    # source-url and author for the attached image file, URL-style per the
    # app's attribution line; None until pack assembly attaches one (#137).
    attribution: str | None = None


@dataclass
class ParsedManual:
    chapters: list[Chapter] = field(default_factory=list)
    sections: list[Section] = field(default_factory=list)
    blocks: list[Block] = field(default_factory=list)
    figures: list[Figure] = field(default_factory=list)


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def is_all_caps(text: str) -> bool:
    return text.upper() == text and any(ch.isalpha() for ch in text)


def is_method_name(text: str) -> bool:
    """A bold title-case procedure name: short, no sentence punctuation."""
    return (
        len(text) <= 60
        and len(text.split()) <= 8
        and text[:1].isupper()
        and not text.endswith((".", ":", ";", "!", "?"))
    )


def has_military_clause(text: str) -> bool:
    return any(MILITARY_RE.search(s) for s in SENTENCE_SPLIT_RE.split(text))


def _starts_new_paragraph(line: Line, previous_text: str) -> bool:
    if line.gap_before is None:
        # Page break: the gap is unknown, so continue only when the previous
        # line reads as unfinished.
        return previous_text.endswith((".", ":", ";", "!", "?", '"'))
    return line.gap_before >= PARAGRAPH_GAP


class _Parser:
    def __init__(self) -> None:
        self.result = ParsedManual()
        self.chapter: Chapter | None = None
        self.section: Section | None = None
        self.section_count = 0
        self.block_count = 0
        self.subheading: str | None = None
        self.subheading_kind: str | None = None  # "procedure" or "mnemonic"
        self.section_ids: set[str] = set()
        self.figure_ids: set[str] = set()

    # -- structure ---------------------------------------------------------

    def start_chapter(self, number: int, title: str) -> None:
        self.chapter = Chapter(
            id=f"{ANCHOR_PREFIX}-ch{number:02d}",
            tile_id=TILE_BY_CHAPTER.get(number),
            fm_number=number,
            title=title,
            priority_order=number,
        )
        self.result.chapters.append(self.chapter)
        self.section = None
        self.section_count = 0
        self.subheading = None
        self.subheading_kind = None

    def start_section(self, fm_heading: str | None) -> None:
        assert self.chapter is not None
        if fm_heading is None:
            slug, title, order = "intro", "Introduction", 0
        else:
            self.section_count += 1
            slug = slugify(fm_heading)
            title = fm_heading.title()
            order = self.section_count
        section_id = f"{self.chapter.id}-{slug}"
        # Repeated headings inside one chapter get an ordinal suffix so the
        # anchor stays unique and derivation stays deterministic.
        candidate, bump = section_id, 2
        while candidate in self.section_ids:
            candidate = f"{section_id}-{bump}"
            bump += 1
        self.section_ids.add(candidate)
        self.section = Section(
            id=candidate,
            chapter_id=self.chapter.id,
            fm_heading=fm_heading,
            title=title,
            order=order,
        )
        self.result.sections.append(self.section)
        self.block_count = 0
        self.subheading = None
        self.subheading_kind = None

    # -- blocks ------------------------------------------------------------

    def add_block(self, text: str, block_type: str) -> None:
        if self.section is None:
            self.start_section(None)
        assert self.chapter is not None and self.section is not None
        # Only a plain paragraph joins a pending method or mnemonic heading;
        # a warning, note, checklist, or reference keeps its own type.
        if block_type == "principle" and self.subheading_kind is not None:
            block_type = (
                "procedure_step" if self.subheading_kind == "procedure" else "mnemonic"
            )
            if self.subheading is not None:
                text = f"{self.subheading}\n{text}"
                self.subheading = None
        archived = self.chapter.fm_number in MILITARY_ARCHIVE_CHAPTERS
        if archived:
            block_type = "military_archive"
        review_status = (
            "needs_review" if archived or has_military_clause(text) else "auto"
        )
        refs = list(dict.fromkeys(FIGURE_RE.findall(text)))
        self.block_count += 1
        block = Block(
            id=f"{self.section.id}-b{self.block_count:03d}",
            section_id=self.section.id,
            order=self.block_count,
            type=block_type,
            text=text,
            figure_ref=",".join(refs) or None,
            source=SOURCE_MANUAL,
            review_status=review_status,
        )
        self.result.blocks.append(block)
        for ref in refs:
            figure_id = f"{ANCHOR_PREFIX}-fig-{ref}"
            if figure_id in self.figure_ids:
                continue
            self.figure_ids.add(figure_id)
            self.result.figures.append(
                Figure(
                    id=figure_id,
                    block_id=block.id,
                    fm_figure_ref=ref,
                    image_path=None,
                    source_manual=SOURCE_MANUAL,
                    license="public-domain",
                )
            )

    def classify_paragraph(self, text: str) -> str:
        if NOTE_RE.match(text):
            return "note"
        if REFERENCE_RE.match(text) and len(text) < 200:
            return "reference"
        return "principle"

    def classify_checklist(self) -> str:
        blocks = self.result.blocks
        if (
            self.section is not None
            and blocks
            and blocks[-1].section_id == self.section.id
            and blocks[-1].text.endswith((":", "-"))
            and "material" in blocks[-1].text.lower()
        ):
            return "materials"
        return "checklist"


def _take_paragraph(
    lines: list[Line], i: int, allow_heading_fonts: bool = False
) -> tuple[str, int]:
    parts = [lines[i].text]
    i += 1
    while i < len(lines):
        line = lines[i]
        if line.text.startswith(BULLET):
            break
        if line.font_kind in HEADING_FONTS and not allow_heading_fonts:
            break
        if _starts_new_paragraph(line, parts[-1]):
            break
        parts.append(line.text)
        i += 1
    return " ".join(parts), i


def _take_checklist(lines: list[Line], i: int) -> tuple[str, int]:
    items: list[list[str]] = []
    while i < len(lines):
        line = lines[i]
        if line.text.startswith(BULLET):
            items.append([line.text])
        elif (
            items
            and line.font_kind not in HEADING_FONTS
            and not _starts_new_paragraph(line, items[-1][-1])
        ):
            items[-1].append(line.text)
        else:
            break
        i += 1
    return "\n".join(" ".join(item) for item in items), i


def _take_wrapped_heading(
    lines: list[Line], i: int, all_caps_only: bool
) -> tuple[str, int]:
    parts = [lines[i].text]
    i += 1
    while i < len(lines):
        line = lines[i]
        if (
            line.font_kind not in HEADING_FONTS
            or CHAPTER_RE.match(line.text)
            or line.text in ("WARNING", "CAUTION")
            or (all_caps_only and not is_all_caps(line.text))
            or line.gap_before is None
            or line.gap_before > HEADING_WRAP_GAP
        ):
            break
        parts.append(line.text)
        i += 1
    return " ".join(parts), i


def parse_lines(lines: list[Line]) -> ParsedManual:
    """Build the anchored record set from normalized lines.

    Lines before the first bold chapter heading (cover and table of contents)
    drop; the table of contents repeats chapter titles in body font, so the
    bold requirement is what keeps it out.
    """
    parser = _Parser()
    i = 0
    while i < len(lines):
        line = lines[i]
        chapter_match = (
            CHAPTER_RE.match(line.text) if line.font_kind == "bold" else None
        )
        if chapter_match:
            title, i = _take_wrapped_heading(lines, i, all_caps_only=True)
            _, _, tail = title.partition(" - ")
            parser.start_chapter(int(chapter_match.group(1)), tail.strip())
            continue
        if parser.chapter is None:
            i += 1
            continue
        if line.text in ("WARNING", "CAUTION"):
            text, i = _take_paragraph(lines, i + 1, allow_heading_fonts=True)
            parser.add_block(text, "warning")
            continue
        if line.font_kind in HEADING_FONTS:
            if is_all_caps(line.text):
                heading, i = _take_wrapped_heading(lines, i, all_caps_only=True)
                parser.start_section(heading)
                continue
            if MNEMONIC_RE.match(line.text):
                parser.subheading = line.text
                parser.subheading_kind = "mnemonic"
                i += 1
                continue
            if is_method_name(line.text):
                heading, i = _take_wrapped_heading(lines, i, all_caps_only=False)
                parser.subheading = heading
                parser.subheading_kind = "procedure"
                continue
            # Bold emphasis inside running text: treat as an ordinary paragraph.
            text, i = _take_paragraph(lines, i, allow_heading_fonts=True)
            parser.add_block(text, parser.classify_paragraph(text))
            continue
        if line.text.startswith(BULLET):
            text, i = _take_checklist(lines, i)
            parser.add_block(text, parser.classify_checklist())
            continue
        text, i = _take_paragraph(lines, i)
        parser.add_block(text, parser.classify_paragraph(text))
    return parser.result
