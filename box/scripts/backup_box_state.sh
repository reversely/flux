#!/usr/bin/env bash
# Pull the GN100's hand-edited state to the Mac: configs, overrides, service
# code, and the blueprint diff. Data, models, and artifacts rebuild from
# manifests (box/wiring.md) and stay out. Run from the repo root on the Mac.
#
#   bash box/scripts/backup_box_state.sh
#
# Produces ~/FluxBackups/box-state-<UTC timestamp>.tar.gz (mode 600: the
# archive carries ~/flux/.env, the box credentials file).
set -euo pipefail

SOCK="$HOME/.ssh/cm-gn100"
BOX="acer01@172.16.94.108"
OUT_DIR="$HOME/FluxBackups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$OUT_DIR/box-state-$STAMP.tar.gz"

mkdir -p "$OUT_DIR"

ssh -S "$SOCK" "$BOX" 'set -euo pipefail
  STAGE=$(mktemp -d)
  trap "rm -rf $STAGE" EXIT
  mkdir -p "$STAGE/flux" "$STAGE/blueprint" "$STAGE/meta"

  # Hand-edited flux state; secrets copied opaquely with permissions kept.
  cp -p ~/flux/.env "$STAGE/flux/" 2>/dev/null || true
  cp -p ~/flux/env.sh ~/flux/hosts_override.py "$STAGE/flux/" 2>/dev/null || true
  cp -pr ~/flux/vss-overrides "$STAGE/flux/" 2>/dev/null || true
  cp -p ~/flux/*.sh ~/flux/*.py "$STAGE/flux/" 2>/dev/null || true
  mkdir -p "$STAGE/flux/services"
  for svc in perception speech; do
    mkdir -p "$STAGE/flux/services/$svc"
    cp -p ~/flux/services/$svc/*.py "$STAGE/flux/services/$svc/" 2>/dev/null || true
  done

  # Blueprint checkout: the profile env files and every local edit as a diff.
  BP=~/video-search-and-summarization
  cp -p "$BP/deploy/docker/developer-profiles/dev-profile-base/.env" \
        "$BP/deploy/docker/developer-profiles/dev-profile-base/generated.env" \
        "$STAGE/blueprint/" 2>/dev/null || true
  git -C "$BP" diff > "$STAGE/blueprint/local-edits.diff" 2>/dev/null || true
  git -C "$BP" status --short > "$STAGE/blueprint/status.txt" 2>/dev/null || true

  # Runtime facts a restore wants to compare against.
  crontab -l > "$STAGE/meta/crontab.txt" 2>/dev/null || true
  ss -tlnp > "$STAGE/meta/listening-ports.txt" 2>/dev/null || true
  docker ps --format "{{.Names}}\t{{.Image}}" > "$STAGE/meta/containers.txt" 2>/dev/null || true
  ~/flux/venvs/tools/bin/pip freeze > "$STAGE/meta/venv-tools.txt" 2>/dev/null || true

  tar -C "$STAGE" -czf - .' > "$OUT"

chmod 600 "$OUT"
echo "$OUT ($(du -h "$OUT" | cut -f1))"
