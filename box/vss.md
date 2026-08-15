# VSS on the GN100

The working bring-up, verified 2026-08-15 with a real clip summarized end to end.

## Topology

VSS blueprint 3.2.1 (`~/video-search-and-summarization`), Docker Compose developer
profile `base` with hardware profile `DGX-SPARK`. Spark supports the `base` and
`alerts` profiles; `lvs` and `search` require other hardware in this release.

```
. ~/flux/env.sh && export NGC_CLI_API_KEY="$NGC_API_KEY"
cd ~/video-search-and-summarization
./deploy/docker/scripts/dev-profile.sh up \
  --profile base --hardware-profile DGX-SPARK \
  --llm nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8 \
  --vlm nvidia/cosmos-reason2-8b
```

Model choices the hardware forces: the FP8 Nemotron Nano is the one LLM NIM with a
DGX-SPARK env file, and `cosmos-reason2-8b` replaces the default `cosmos3-reasoner`,
whose NIM 400s on its NGC model manifest (`cosmos3-nano-reasoner/bf16-final`)
while the same key downloads every other model fine.

## Ports

| Port | Surface |
| --- | --- |
| 7777 | haproxy public entry: the blueprint UI at `/`, agent routes under `/api`, `/chat`, VST storage under `/vst/` |
| 8000 | agent API direct: `/docs`, `/generate`, `/v1/chat/completions`, `/api/v1/videos` |
| 30081 | Nemotron NIM, OpenAI-compatible |
| 30082 | Cosmos-Reason2 NIM, OpenAI-compatible |
| 30888 | VST |

## Verified video flow

1. `POST :8000/api/v1/videos {"filename": "<name>.mp4"}` returns the storage URL.
2. `POST` the bytes multipart (`file=@...`) to that URL (`/vst/api/v1/storage/file`); the response carries `id` and `sensorId`.
3. `POST :8000/generate {"input_message": "..."}` runs the agent loop (`vst_video_list`, `video_understanding`) and returns `{"value": "<agent-think>...</agent-think> answer"}`; the final answer follows the last `</agent-think>`.

This differs from the VSS 2.x `/files` + `/summarize` shape the server handoff client
implements; the adaptation is ticketed on the server swath.

## Operations

- Bring-up logs land in `~/flux/vss_up*.log`; `dev-profile.sh down` tears down project `mdx`.
- The stack shares the GPU with the flux perception service on port 8100.
- Image pulls compete with corpus downloads for bandwidth; pause `hf download`
  processes when a pull needs to sprint.
