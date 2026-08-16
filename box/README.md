# box: the GN100

This directory provisions the Acer Veriton GN100 (host `gn100-2854`, NVIDIA GB10
Grace Blackwell, aarch64, 121 GB unified memory). The box runs VSS and the heavy
models and serves the web app on the local network (docs/prd.md, section 2).

## Reaching the box

Connections multiplex over an SSH ControlMaster socket. If the socket is gone,
rebuild it directly; the box accepts the Mac's key as `acer01@172.16.94.108`
(wifi address, also pinned in `scripts/verify_nemotron.sh`):

```
rm -f ~/.ssh/cm-gn100
ssh -M -S ~/.ssh/cm-gn100 -o ControlPersist=yes -fN acer01@172.16.94.108
ssh -S ~/.ssh/cm-gn100 acer01@172.16.94.108
```

The `gn100` alias is NVIDIA Sync convenience config and can vanish with that
app's state; do not depend on it. The MOTD's enP7s7 address (172.16.95.x)
refuses key auth; use the wifi address above. Only the sudo DNS fix
(`sudo resolvectl dns wlP9s9 1.1.1.1`) needs the user in an interactive session.

## Layout on the box

- `~/flux/models/<name>/` holds one downloaded model per manifest row, with a
  `.done` marker on completion and per-model logs in `~/flux/models/_logs/`.
- `~/video-search-and-summarization/` holds the NVIDIA VSS blueprint checkout.

## Fetching models

`models/manifest.tsv` lists every model the PRD names, with its source, license
posture, and status. `scripts/fetch_models.sh` runs on the box, downloads each
row whose status reads `fetch`, and skips rows already marked done, so re-running
it resumes an interrupted wave:

```
scp -o ControlPath=~/.ssh/cm-gn100 box/models/manifest.tsv box/scripts/fetch_models.sh gn100:~/flux/
ssh -o ControlPath=~/.ssh/cm-gn100 gn100 'cd ~/flux && nohup bash fetch_models.sh manifest.tsv > fetch.out 2>&1 &'
```

Rows marked `pending` need their distribution channel verified (Kaggle terms,
checkpoint URLs) before they join a fetch wave.

## Perception service

`services/perception/main.py` runs on the box (port 8100, `~/flux/venvs/perception`,
deployed at `~/flux/services/perception`): POST /identify accepts an image plus an
optional domain and returns SpeciesNet (geofenced, with MegaDetector detections),
BioCLIP zero-shot over taxonomic label strings, and FungiTastic-Mini class scores.
`BIOCLIP_LABELS` names the label file the GBIF checklist build produces; without it a
starter list of Pacific Northwest species applies. `scripts/build_gbif_checklist.py`
turns a GBIF SPECIES_LIST extract into `checklist.tsv` plus that label file.

## Speech service

`services/speech/main.py` runs on the box (port 8110, its own venv with
`nemo_toolkit[asr]`, `faster-whisper`, `kokoro`, `fastapi`): the ASR and TTS
behind the voice loop (#74/#77; flux-server relays it, #80). POST /asr
transcribes one utterance (`engine=parakeet` default, `engine=whisper` second
opinion), WS /asr/stream takes 16 kHz s16le PCM frames and emits partial then
final transcripts, POST /tts synthesizes Kokoro-82M narration as WAV. Every
response carries engine, model, and latency_ms for the app's traces tab.
`bench/bench_speech.py` produces the ticket numbers: Kokoro time-to-first-audio
and real-time factor per phrase, per-engine utterance latency, the answer
vocabulary round-trip, and streaming partial cadence:

```
python box/bench/bench_speech.py http://localhost:8110
```

Measured 2026-08-15 on the GN100 (deployed at `~/flux/services/speech`, run
from the `~/flux/venvs/asr` venv, 8.2 GB RSS total beside the two NIMs and
VSS): Kokoro on CUDA synthesizes a node question in 25 to 55 ms warm (first
call 1.0 s), real-time factor 0.02 to 0.03. Parakeet on CUDA transcribes a
command utterance in about 50 ms warm (first call 360 ms) and round-trips
the six-word answer vocabulary 6/6. Streaming emits its first partial 860 ms
into the utterance, one partial per second after, and the final about 200 ms
after end-of-audio. Whisper's CUDA load fails under ctranslate2 on this
machine, so it falls back to CPU int8 at about 5 s per utterance: usable as
the second opinion, not the live path. Loading the speech models OOM-killed
the two NIM containers once (Docker restarted them); at the edge, start this
service before or between the heavy stacks, not while they are loading.

## Nemotron chat endpoint

The chat LLM the flux server calls is the VSS stack's own Nemotron Nano 9B v2
FP8 container, OpenAI-compatible on box port 30081 with native tool calling
enabled (model id `nvidia/NVIDIA-Nemotron-Nano-9B-v2-FP8`). The flux server
reaches it as `FLUX_NEMOTRON_URL=http://<box-ip>:30081/v1`.

The originally planned Nemotron Super 49B FP8 was retired (#47): its ~50 GB
of weights cannot be resident next to the VSS stack and the perception
service inside the GN100's 121 GB unified memory, so its mirror was deleted
from the box and its manifest row removed. `scripts/verify_nemotron.sh`
records the endpoint facts and round-trips a chat completion against it:

```
bash box/scripts/verify_nemotron.sh
```

## Terrain archive

`scripts/build_terrain_pmtiles.py` (the `~/flux/venvs/terrain` venv: rasterio,
rio-rgbify's stack without GDAL binaries) encodes the staged 3DEP GeoTIFFs as
one terrain-RGB PMTiles archive; `~/flux/bin/pmtiles` converts the MBTiles
output. Built 2026-08-16 from the 36 Washington DEMs (14 GB): zooms 5 to 12,
9,318 tiles in 224 s, 638 MB as `wa-terrain.pmtiles`, decode spot-checked
against Mount Rainier (4,309 m at z8). The flux server serves it on the
terrain layer of the per-layer tile route (#75) via
`FLUX_TILE_ARCHIVE_TERRAIN`; MapLibre reads it as a raster-dem source for
hillshade, and the same archive later backs the PRD 5.2 altitude grid.

## Fetching data and corpora

Pack data divides into universal content that ships in every pack
(`data/universal.tsv`) and region-specific content the box fetches from the
internet per configured region (`data/regions/<region>.tsv`); each row's name
carries its path, so `~/flux/data` mirrors the split. Training corpora for the
coach live in `corpora/manifest.tsv` and download to `~/flux/corpora`.
`scripts/fetch_data.sh` serves all three, with the target directory set by
`DATA_DIR`:

```
ssh -o ControlPath=~/.ssh/cm-gn100 -f gn100 'cd ~/flux && DATA_DIR=~/flux/corpora nohup bash fetch_data.sh corpora-manifest.tsv > fetch_corpora.out 2>&1 < /dev/null &'
```
