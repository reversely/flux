"""Build the sess_sample session so the review viewer runs with zero capture.

The frames are synthetic: a drawn board with solder blobs at the canned box
positions. They stand in until real macro captures replace them (issue #6's
debug capture is the natural source).
"""

import json
import random
import shutil
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageDraw

from flux_server.canned import CANNED_FINDINGS

SAMPLE_SESSION_ID = "sess_sample"
FRAME_COUNT = 4
WIDTH, HEIGHT = 1280, 960

_BOARD_GREEN = (24, 84, 52)
_TRACE_GREEN = (44, 120, 76)
_PAD_GOLD = (196, 160, 70)
_SOLDER_GRAY = (206, 210, 214)


def _draw_frame(jitter: random.Random) -> Image.Image:
    """Draw one board frame; tiny per-frame offsets mimic a moving camera."""
    image = Image.new("RGB", (WIDTH, HEIGHT), _BOARD_GREEN)
    draw = ImageDraw.Draw(image)
    shift_x = jitter.randint(-6, 6)
    shift_y = jitter.randint(-6, 6)

    grid = random.Random(7)
    for _ in range(24):
        x = grid.randint(0, WIDTH) + shift_x
        y = grid.randint(0, HEIGHT) + shift_y
        draw.line(
            [(x, y), (x + grid.randint(-260, 260), y + grid.randint(-140, 140))],
            fill=_TRACE_GREEN,
            width=6,
        )

    for _, (fx1, fy1, fx2, fy2), _, _ in CANNED_FINDINGS:
        x1 = round(fx1 * WIDTH) + shift_x
        y1 = round(fy1 * HEIGHT) + shift_y
        x2 = round(fx2 * WIDTH) + shift_x
        y2 = round(fy2 * HEIGHT) + shift_y
        draw.rectangle((x1, y1, x2, y2), fill=_PAD_GOLD)
        pad_w = x2 - x1
        pad_h = y2 - y1
        draw.ellipse(
            (
                x1 + pad_w * 0.15,
                y1 + pad_h * 0.15,
                x2 - pad_w * 0.15,
                y2 - pad_h * 0.15,
            ),
            fill=_SOLDER_GRAY,
        )
    return image


def seed_session(data_dir: Path) -> str:
    """Write the sample session's frames and metadata; replaces any prior copy."""
    directory = data_dir / SAMPLE_SESSION_ID
    if directory.exists():
        shutil.rmtree(directory)
    directory.mkdir(parents=True)

    jitter = random.Random(0)
    for index in range(1, FRAME_COUNT + 1):
        frame_id = f"frame_{index:03d}"
        _draw_frame(jitter).save(directory / f"{frame_id}.jpg", "JPEG", quality=90)
        metadata = {
            "frame_id": frame_id,
            "captured_at": "seed",
            "received_at": datetime.now(UTC).isoformat(),
        }
        (directory / f"{frame_id}.json").write_text(json.dumps(metadata))
    return SAMPLE_SESSION_ID
