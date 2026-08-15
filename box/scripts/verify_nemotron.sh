#!/usr/bin/env bash
# Verifies the box's chat LLM endpoint (ticket #43): the VSS stack's own
# Nemotron Nano 9B v2 FP8 container, OpenAI-compatible on port 30081.
#
# Why reuse rather than serve: the GN100's 121 GB unified memory already
# carries the VSS stack (Cosmos Reason 2 8B at ~41 GB, Nemotron Nano 9B at
# ~50 GB with its KV cache) plus the perception service (~17 GB). The
# originally planned Nemotron Super 49B FP8 needs ~50 GB for weights alone,
# so it cannot be resident alongside VSS; its mirror was retired (#47). The
# VSS compose (mdx project, ~/video-search-and-summarization/deploy/docker)
# publishes its LLM on 0.0.0.0:30081 with --enable-auto-tool-choice and the
# nemotron_json tool parser, so the flux server reaches it directly:
#
#   FLUX_NEMOTRON_URL=http://<box-ip>:30081/v1
#   model id: nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8
#
# Runs anywhere that can reach the box; on a LAN client BASE defaults to the
# box's address. If the box drops the direct TCP flow, run it on the box over
# the SSH ControlMaster socket instead:
#   ssh -o ControlPath=~/.ssh/cm-gn100 gn100 'BASE=http://localhost:30081/v1 bash -s' < box/scripts/verify_nemotron.sh
set -euo pipefail

BASE="${BASE:-http://172.16.94.108:30081/v1}"
MODEL="nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8"

echo "== models =="
curl -sf -m 15 "$BASE/models" | head -c 300; echo

echo "== chat completion =="
curl -sf -m 120 "$BASE/chat/completions" -H 'Content-Type: application/json' -d '{
  "model": "'"$MODEL"'",
  "messages": [
    {"role": "system", "content": "/no_think"},
    {"role": "user", "content": "In two sentences, how do I make pond water safe to drink in the field?"}
  ],
  "max_tokens": 200, "temperature": 0.2
}'
echo
echo "ok"
