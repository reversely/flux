# NemoClaw ops console on the GN100 (#48 spike)

Chat-driven administration of the box for an operator without an SSH
session. Stood up 2026-08-16 against the blueprint installer at
`~/video-search-and-summarization/deploy/docker/scripts/nemoclaw`.

## Working setup

- Sandbox `flux-ops`, created with `init_nemoclaw.sh` in provider mode
  `custom` against the running Nemotron NIM
  (`http://host.openshell.internal:30081/v1`, model
  `nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8`). No cloud provider; the console
  works with the box offline.
- Console UI: `http://127.0.0.1:18789/#token=<printed at init>` on the box;
  reachable from a laptop through an SSH forward of 18789.
- Policy: the blueprint's `vss_nemoclaw_policy.yaml` stays unused (it opens
  Anthropic, GitHub, Discord, Slack, npm, and PyPI origins). The applied
  policy is `flux_ops_policy.yaml` here: host-local service ports only
  (8000, 30888, 30081, 30082, 8100, 8110, 8001), and the balanced-tier
  internet presets (brew, huggingface, npm, pypi, openclaw-pricing) were
  removed. `policy-list` shows exactly one user preset.
- Lifecycle is explicit: both sandbox containers are set `--restart=no`
  (the blueprint default `unless-stopped` is how the previous owner's
  sandbox kept resurrecting itself). The stale `my-assistant` sandbox is
  stopped; its vLLM endpoint no longer exists.
- Skill `flux-stack-ops` (this directory) carries the health sweep, the
  verified bring-up and teardown from `box/vss.md`, and the memory
  sequencing rule.
- Memory headroom: the sandbox container itself is a node process, no
  model weights; it coexists with both NIMs, VSS, perception, and speech
  without moving the 121 GB budget.

## The spike's finding: chat cannot act on this model tier

The Nemotron Nano NIM's serving template rejects tool calls in streaming
mode (`Tool calling is not supported in streaming mode!`), and OpenClaw
streams every agent turn with no config switch to disable it
(`models[].compat` has `supportsTools` but no streaming toggle). With
`supportsTools: false` the chat round-trip works, but the model then has
no way to execute anything and readily fabricates health reports; the
skill now instructs it to hand the operator command blocks instead of
pretending. Reasoning traces also leak into replies (the same template
quirk `nemotron.py` strips server-side with `/no_think`, which OpenClaw
does not send).

Follow-ups if the console should truly act, in preference order:

1. A tool-capable serving template or model on the box (needs ~48 GB free
   during any swap, so something else stops first).
2. An OpenClaw release with a non-streaming completion mode.
3. Keep the console as a command-consulting surface over the dashboard UI,
   which already serves the "no SSH session" operator with correct,
   verified command blocks.
