from flux_pipeline.lines import Line
from flux_pipeline.parse import parse_lines


def body(text, gap=8.0):
    return Line(text, "body", gap)


def wrapped(text):
    """A continuation line inside the same paragraph."""
    return Line(text, "body", 2.0)


def bold(text, gap=15.0):
    return Line(text, "bold", gap)


def section_heading(text):
    return Line(text, "bold_oblique", 15.0)


def chapter(number, title):
    return bold(f"CHAPTER {number} - {title}")


def test_chapters_split_on_bold_chapter_lines_and_skip_front_matter():
    parsed = parse_lines(
        [
            body("CHAPTER 1 - INTRODUCTION..........5"),  # table of contents, body font
            chapter(1, "INTRODUCTION"),
            body("Intro paragraph."),
            chapter(2, "PSYCHOLOGY OF SURVIVAL"),
            body("Second chapter paragraph."),
        ]
    )
    assert [c.id for c in parsed.chapters] == ["fm21-76-ch01", "fm21-76-ch02"]
    assert parsed.chapters[0].title == "INTRODUCTION"
    assert parsed.chapters[0].priority_order == 1
    assert parsed.chapters[1].fm_number == 2


def test_wrapped_chapter_title_joins():
    parsed = parse_lines(
        [
            bold("CHAPTER 12 - FIELD-EXPEDIENT WEAPONS, TOOLS,"),
            Line("AND EQUIPMENT", "bold", 2.0),
            body("Text."),
        ]
    )
    assert parsed.chapters[0].title == "FIELD-EXPEDIENT WEAPONS, TOOLS, AND EQUIPMENT"


def test_sections_split_on_all_caps_headings_with_intro_section():
    parsed = parse_lines(
        [
            chapter(4, "BASIC SURVIVAL MEDICINE"),
            body("Chapter lead paragraph."),
            section_heading("LIFESAVING STEPS"),
            body("Section paragraph."),
        ]
    )
    assert [s.id for s in parsed.sections] == [
        "fm21-76-ch04-intro",
        "fm21-76-ch04-lifesaving-steps",
    ]
    intro, steps = parsed.sections
    assert intro.fm_heading is None and intro.order == 0
    assert steps.fm_heading == "LIFESAVING STEPS"
    assert steps.title == "Lifesaving Steps"
    assert steps.order == 1


def test_procedures_split_on_bold_title_case_method_names():
    parsed = parse_lines(
        [
            chapter(4, "BASIC SURVIVAL MEDICINE"),
            section_heading("LIFESAVING STEPS"),
            body("You can control bleeding several ways."),
            Line("Direct Pressure", "bold_oblique", 15.0),
            body("Apply pressure directly."),
            body("A second step paragraph."),
        ]
    )
    types = [b.type for b in parsed.blocks]
    assert types == ["principle", "procedure_step", "procedure_step"]
    assert parsed.blocks[1].text == "Direct Pressure\nApply pressure directly."


def test_paragraph_wraps_join_and_gaps_split():
    parsed = parse_lines(
        [
            chapter(1, "INTRODUCTION"),
            body("First sentence"),
            wrapped("continues here."),
            body("A new paragraph."),
        ]
    )
    assert [b.text for b in parsed.blocks] == [
        "First sentence continues here.",
        "A new paragraph.",
    ]


def test_warning_and_caution_lines_become_warning_blocks():
    parsed = parse_lines(
        [
            chapter(4, "BASIC SURVIVAL MEDICINE"),
            bold("WARNING"),
            Line("Never place a tourniquet around the neck.", "bold", 2.0),
            bold("CAUTION"),
            body("Purify the water before drinking it.", gap=2.0),
        ]
    )
    assert [b.type for b in parsed.blocks] == ["warning", "warning"]
    assert parsed.blocks[0].text == "Never place a tourniquet around the neck."


def test_note_lines_become_note_blocks():
    parsed = parse_lines(
        [
            chapter(6, "WATER PROCUREMENT"),
            body("Note: These procedures only clear the water."),
        ]
    )
    assert parsed.blocks[0].type == "note"


def test_bullets_group_into_checklist_and_materials_follows_lead_in():
    parsed = parse_lines(
        [
            chapter(5, "SHELTERS"),
            body("To build it, you will need the following materials--"),
            body("• Two forked branches"),
            wrapped("at least 5 centimeters in diameter."),
            body("• A pole.", gap=2.0),
            body("Site the shelter carefully."),
            body("• First consideration."),
            body("• Second consideration.", gap=2.0),
        ]
    )
    materials, checklist = [
        b for b in parsed.blocks if b.type in ("materials", "checklist")
    ]
    assert materials.type == "materials"
    assert materials.text == (
        "• Two forked branches at least 5 centimeters in diameter.\n• A pole."
    )
    assert checklist.type == "checklist"


def test_mnemonic_headings_type_their_blocks():
    parsed = parse_lines(
        [
            chapter(1, "INTRODUCTION"),
            section_heading("SURVIVAL ACTIONS"),
            bold("S -Size Up the Situation"),
            body("Consider your surroundings."),
        ]
    )
    assert parsed.blocks[0].type == "mnemonic"
    assert parsed.blocks[0].text.startswith("S -Size Up the Situation\n")


def test_military_sentence_marks_block_for_review():
    parsed = parse_lines(
        [
            chapter(5, "SHELTERS"),
            body("Look for a dry, flat site. Stay hidden from enemy patrols."),
            body("Pick a spot near water."),
        ]
    )
    assert parsed.blocks[0].review_status == "needs_review"
    assert parsed.blocks[1].review_status == "auto"


def test_chapters_20_to_22_archive_every_block():
    parsed = parse_lines(
        [
            chapter(21, "CAMOUFLAGE"),
            body("Note: Blend with the terrain."),
            body("Plain paragraph."),
        ]
    )
    assert all(b.type == "military_archive" for b in parsed.blocks)
    assert all(b.review_status == "needs_review" for b in parsed.blocks)
    assert parsed.chapters[0].tile_id is None


def test_figure_references_anchor_figure_records():
    parsed = parse_lines(
        [
            chapter(4, "BASIC SURVIVAL MEDICINE"),
            body("Wrap the bandage (Figure 4-2). Repeat as shown in Figure 4-2."),
        ]
    )
    block = parsed.blocks[0]
    assert block.figure_ref == "4-2"
    assert len(parsed.figures) == 1
    figure = parsed.figures[0]
    assert figure.id == "fm21-76-fig-4-2"
    assert figure.block_id == block.id
    assert figure.source_manual == "FM 21-76"


def test_anchor_ids_derive_from_fm_numbering():
    parsed = parse_lines(
        [
            chapter(7, "FIRECRAFT"),
            section_heading("FIRE SITE"),
            body("First paragraph."),
            body("Second paragraph."),
        ]
    )
    assert [b.id for b in parsed.blocks] == [
        "fm21-76-ch07-fire-site-b001",
        "fm21-76-ch07-fire-site-b002",
    ]


def test_repeated_section_heading_gets_ordinal_suffix():
    parsed = parse_lines(
        [
            chapter(15, "COLD WEATHER SURVIVAL"),
            section_heading("SHELTERS"),
            body("First."),
            section_heading("SHELTERS"),
            body("Second."),
        ]
    )
    assert [s.id for s in parsed.sections] == [
        "fm21-76-ch15-shelters",
        "fm21-76-ch15-shelters-2",
    ]
