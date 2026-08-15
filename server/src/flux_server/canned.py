"""Canned findings the stub returns; the trained model replaces this module."""

from flux_server.models import JointRecord

# (classification, fractional box x1 y1 x2 y2, confidence, severity)
CANNED_FINDINGS: list[tuple[str, tuple[float, float, float, float], float, str]] = [
    ("solder_bridge", (0.42, 0.55, 0.52, 0.68), 0.88, "critical"),
    ("insufficient_solder", (0.30, 0.15, 0.38, 0.27), 0.81, "review"),
    ("excessive_solder", (0.55, 0.12, 0.63, 0.24), 0.77, "review"),
    ("shifted_joint", (0.68, 0.60, 0.76, 0.72), 0.64, "review"),
    ("unable_to_assess", (0.15, 0.70, 0.23, 0.82), 0.35, "review"),
    ("acceptable", (0.08, 0.10, 0.16, 0.22), 0.93, "ok"),
]

MIN_FRAMES_FOR_RESULTS = 3


def canned_joints(width: int, height: int, frame_ids: list[str]) -> list[JointRecord]:
    """Scale the canned findings to one frame's pixel size.

    The two most recent frames become every joint's supporting frames, so the
    app always links to imagery the phone actually uploaded.
    """
    supporting = frame_ids[-2:]
    return [
        JointRecord(
            joint_id=f"joint_{index:03d}",
            bounding_box=(
                round(fx1 * width),
                round(fy1 * height),
                round(fx2 * width),
                round(fy2 * height),
            ),
            classification=classification,
            confidence=confidence,
            severity=severity,
            supporting_frames=supporting,
            capture_quality="acceptable",
        )
        for index, (
            classification,
            (fx1, fy1, fx2, fy2),
            confidence,
            severity,
        ) in enumerate(CANNED_FINDINGS, start=1)
    ]
