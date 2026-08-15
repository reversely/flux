#!/usr/bin/env bash
# Curl walkthrough against a running stub. Run from server/: bash scripts/smoke.sh [base-url]
set -euo pipefail
BASE="${1:-http://localhost:8000}"

curl -fsS "$BASE/healthz"
echo
SESSION=$(curl -fsS -X POST "$BASE/v1/sessions" |
  uv run python -c 'import json,sys; print(json.load(sys.stdin)["session_id"])')
echo "session: $SESSION"

TMP=$(mktemp -d)
uv run python - "$TMP/frame.jpg" <<'PY'
import sys

from PIL import Image

Image.new("RGB", (1280, 960), (30, 90, 60)).save(sys.argv[1], "JPEG")
PY

for _ in 1 2 3; do
  curl -fsS -X POST "$BASE/v1/sessions/$SESSION/frames" \
    -F "frame=@$TMP/frame.jpg;type=image/jpeg" \
    -F "captured_at=$(date -u +%FT%TZ)"
  echo
done

curl -fsS "$BASE/v1/sessions/$SESSION/results"
echo
curl -fsS -o "$TMP/frame_001.jpg" "$BASE/v1/sessions/$SESSION/frames/frame_001"
echo "served frame saved to $TMP/frame_001.jpg"
