#!/usr/bin/env bash
# Bring the whole demo stack up from a cold Mac and certify it.
#
#   bash scripts/demo_up.sh          # bring up + fast certification
#   bash scripts/demo_up.sh --full   # includes the long VSS checks
#
# Box side must already run its services (VSS, NIMs, perception, speech);
# box/nemoclaw/skills/flux-stack-ops/SKILL.md carries that health sweep.
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOX="acer01@172.16.94.108"
SOCK="$HOME/.ssh/cm-gn100"

echo "== ssh socket"
if ! ssh -S "$SOCK" -O check "$BOX" 2>/dev/null; then
  rm -f "$SOCK"
  ssh -M -S "$SOCK" -o ControlPersist=yes -o ConnectTimeout=10 -fN "$BOX"
fi
ssh -S "$SOCK" "$BOX" 'echo "  box: $(free -g | awk "NR==2{print \$3\"/\"\$2\" GB\"}")"'

echo "== forwards"
for spec in 30081:localhost:30081 30082:localhost:30082 30083:localhost:30083 \
            18000:localhost:8000 18100:localhost:8100 18110:localhost:8110; do
  ssh -S "$SOCK" -O forward -L "$spec" "$BOX" 2>/dev/null || true
done

echo "== tourniquet adapter"
# The T3 adapter serves from its own process (the cosmos NIM carries no
# adapter hooks). Start it when the trained adapter exists; export the
# routing env vars only on a healthy probe, so a missing or broken adapter
# leaves the tourniquet coach on the base model.
ssh -S "$SOCK" "$BOX" '
  if [ -d ~/flux-model/train/runs/r1/final ] && ! pgrep -f t3_serve.py >/dev/null; then
    cd ~/flux-model/bench && nohup ~/flux-model/train/venv/bin/python \
      t3_serve.py --adapter ~/flux-model/train/runs/r1/final --port 30083 \
      > t3_serve.log 2>&1 &
    echo "  t3_serve starting (model load takes ~2 min)"
  fi' 2>/dev/null || true
T3_ENV=()
if curl -s -m 5 -o /dev/null -X POST -H Content-Type:application/json \
    -d '{"messages":[{"role":"user","content":[{"type":"text","text":"ping"}]}],"max_tokens":1}' \
    http://localhost:30083/v1/chat/completions; then
  T3_ENV=(FLUX_COSMOS_MODEL_TOURNIQUET="cosmos-reason2-8b-t3"
          FLUX_COSMOS_URL_TOURNIQUET="http://localhost:30083")
  echo "  adapter healthy: tourniquet coach routes to cosmos-reason2-8b-t3"
else
  echo "  adapter not serving: tourniquet coach stays on the base model"
fi

echo "== pack"
cd "$REPO"
if [ ! -f data/demo/content.db ]; then
  uv run flux-pipeline parse FM21-76_SurvivalManual.pdf data/demo/content.db
fi
uv run flux-pipeline walkthrough data/demo/mycomorphbox.tsv data/demo/content.db
uv run flux-pipeline guide pipeline/data/guides/bowline.json data/demo/content.db
if [ ! -d data/demo/figures ]; then
  uv run flux-pipeline figures FM21-76_SurvivalManual.pdf data/demo/content.db data/demo
fi

echo "== flux server"
pkill -f "flux-server --host" 2>/dev/null
sleep 2
FLUX_CONTENT_DB="$REPO/data/demo/content.db" \
FLUX_TILE_ARCHIVE="$REPO/data/demo/tiles/wa-dev.pmtiles" \
FLUX_DATA_DIR="$REPO/data/demo/sessions" \
FLUX_NEMOTRON_URL="http://localhost:30081/v1" \
FLUX_COSMOS_URL="http://localhost:30082" \
VSS_BASE_URL="http://localhost:18000" \
FLUX_PERCEPTION_URL="http://localhost:18100" \
FLUX_SPEECH_URL="http://localhost:18110" \
nohup env ${T3_ENV[@]:+"${T3_ENV[@]}"} \
  uv run flux-server --host 0.0.0.0 --port 8000 > /tmp/flux-server.log 2>&1 &
sleep 6

echo "== expo (LAN, for the phone at exp://$(ipconfig getifaddr en0):8081)"
if ! pgrep -f "expo start" >/dev/null; then
  (cd app && REACT_NATIVE_PACKAGER_HOSTNAME="$(ipconfig getifaddr en0)" \
    nohup npx expo start --port 8081 > /tmp/expo-demo.log 2>&1 &)
  sleep 8
fi

echo "== certification"
if [ "${1:-}" = "--full" ]; then
  uv run python scripts/verify_stack.py
else
  uv run python scripts/verify_stack.py --fast
fi
