from flux_pipeline.lines import (
    Line,
    normalize,
    reattach_bullets,
    strip_headers_and_footers,
)


def test_strips_repeating_header_and_page_footer():
    lines = [
        Line(
            "FM 21-76 US ARMY SURVIVAL MANUAL Reprinted as permitted by U.S. Department of the Army"
        ),
        Line("Body text stays."),
        Line("Page 23 of 233"),
    ]
    assert [l.text for l in strip_headers_and_footers(lines)] == ["Body text stays."]


def test_reattaches_detached_bullet_glyph():
    lines = [
        Line("•"),
        Line("Venous. Blood returning to the heart."),
        Line("• Capillary. Already attached."),
    ]
    out = reattach_bullets(lines)
    assert out[0].text == "• Venous. Blood returning to the heart."
    assert out[1].text == "• Capillary. Already attached."


def test_normalize_runs_both_passes():
    lines = [
        Line("FM 21-76 US ARMY SURVIVAL MANUAL Reprinted"),
        Line("•"),
        Line("Item text."),
        Line("Page 1 of 233"),
    ]
    assert [l.text for l in normalize(lines)] == ["• Item text."]
