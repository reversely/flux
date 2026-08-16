# Wiring and replicability

Every process, port, config file, and launch command in the running system, and the
rebuild path for everything that is not worth backing up as bytes. The companion script
`scripts/backup_box_state.sh` captures the small set of files that cannot be regenerated;
data, models, and artifacts rebuild from manifests instead.

State as of 2026-08-16. Conventions: `box:` means on the GN100 as `acer01`, `mac:` means
the dev Mac. Paths under `~` resolve on the machine named.

## Access

- `mac:` reaches `box:` by key auth as `acer01@172.16.94.108` (wifi, wlP9s9). Rebuild the
  ControlMaster socket with
  `ssh -M -S ~/.ssh/cm-gn100 -o ControlPersist=yes -fN acer01@172.16.94.108`.
- The `gn100` alias comes from NVIDIA Sync app state and can vanish; never depend on it.
- The MOTD's enP7s7 address (172.16.95.x) refuses key auth; use the wifi address.
- Box DNS reverts to blocked OpenDNS on the wifi link; the fix needs an interactive sudo:
  `sudo resolvectl dns wlP9s9 1.1.1.1`. Until then `~/flux/hosts_override.py` carries a
  getaddrinfo table of Mac-resolved IPs.

## Processes and ports

| Where | Port | Process | Started by |
| --- | --- | --- | --- |
| box | 30081 | Nemotron Nano 9B v2 FP8, vLLM, tool calling | compose service `nvidia-nemotron-nano-9b-v2-fp8-shared-gpu` |
| box | 30082 | Cosmos-Reason2-8B NIM | compose service `cosmos-reason2-8b-shared-gpu` |
| box | 8000 | VSS agent API (blueprint 3.2.1, 11 containers) | compose profiles, see below |
| box | 8100 | Perception service (SpeciesNet, BioCLIP, FungiTastic) | nohup line, see below |
| box | 8110 | Speech service (Parakeet ASR, Kokoro TTS) | nohup line, see below |
| box | 18789 | NemoClaw ops console (`flux-ops` sandbox, consulting only, #48) | OpenClaw gateway; containers set `--restart=no` |
| mac | 8000 | flux-server, the only endpoint the phone talks to | `uv run flux-server --host 0.0.0.0 --port 8000` with the env below |
| mac | 8081 | Metro bundler for the dev client | `npx expo start` in `app/` |

The Mac reaches box model ports over SSH local forwards on the cm-gn100 socket:
30081, 30082, and 18000 to box 8000 (VSS). Perception and speech forward as
18100 to 8100 and 18110 to 8110.

## flux-server environment (mac, demo stack)

```
FLUX_CONTENT_DB=data/demo/content.db
FLUX_DATA_DIR=data/demo/sessions
FLUX_SPECIES_IMAGES=data/demo/species-images
FLUX_TILE_ARCHIVE=data/demo/tiles/wa-dev.pmtiles
FLUX_TILE_ARCHIVE_TERRAIN=data/demo/tiles/wa-terrain.pmtiles
FLUX_FEATURES_DB=data/demo/features-washington.db
FLUX_TRAILS_DB=data/demo/trails-washington.db
FLUX_NEMOTRON_URL=http://localhost:30081/v1
FLUX_COSMOS_URL=http://localhost:30082
VSS_BASE_URL=http://localhost:18000
FLUX_PERCEPTION_URL=http://localhost:18100
FLUX_SPEECH_URL=http://localhost:18110
```

Paths are repo-relative here for legibility; the running process uses absolute paths.
Every unset variable turns its routes into an explanatory 503.

## Box service launch commands

VSS stack, Nemotron, and Cosmos all run from the blueprint checkout at
`~/video-search-and-summarization/deploy/docker`:

```
cd ~/video-search-and-summarization/deploy/docker
docker compose --env-file developer-profiles/dev-profile-base/generated.env up -d
```

Recreate one service after a config change with
`... up -d --force-recreate <service>`; the LLM services are
`nvidia-nemotron-nano-9b-v2-fp8-shared-gpu` and `cosmos-reason2-8b-shared-gpu`. NIM
reload takes 5 to 8 minutes to healthy.

Memory configuration, deliberate and load-bearing (the box runs ~60-80% resident):

- Nemotron: `--gpu-memory-utilization 0.15 --max-model-len 32768`, edited into the
  shared-gpu service block of
  `deploy/docker/services/nim/nvidia-nemotron-nano-9b-v2-fp8/compose.yml`. The context
  cap is required below utilization ~0.3 or vLLM refuses to start.
- Cosmos: `NIM_KVCACHE_PERCENT=0.25` via `~/flux/vss-overrides/cosmos-kv.env`, wired
  through `VLM_ENV_FILE` in `developer-profiles/dev-profile-base/.env` and
  `generated.env`. 0.2 fails startup: BF16 weights need ~22 GB and a 16k context needs
  2.25 GiB of cache. Direct edits to the blueprint's `hw-*.env` files revert within
  minutes (unidentified reconciler, prime suspect vss-agent, which bind-mounts the tree
  read-write); overrides must live outside the tree, which is why `~/flux/vss-overrides`
  exists.
- The active hardware profile is `DGX-SPARK` per `generated.env`; compose runs with
  `--env-file .../generated.env`, so that file wins over `.env`.

Perception, as currently running:

```
. ~/flux/env.sh && cd ~/flux/services/perception && \
BIOCLIP_LABELS=~/flux/data/regions/washington/gbif-checklist/bioclip_labels.txt \
nohup ~/flux/venvs/perception/bin/python main.py > service.log 2>&1 < /dev/null &
```

Speech, same shape from `~/flux/services/speech` with `~/flux/venvs/asr`; it serves
port 8110 and logs to `speech.log`.

`~/flux/env.sh` isolates HF caches to `~/flux/hf` and sources `~/flux/.env` (mode 600,
holds HF/GBIF/NGC credentials). Source it before any box tooling.

Cron: `*/15 * * * * ~/flux-model/data/t3_watch.sh` polls a Dataverse access grant and
starts the Trauma THOMPSON download when it lands.

## Rebuild from nothing

Bytes on the box regenerate from committed manifests and scripts; none of them belong in
a backup.

| What | Rebuild |
| --- | --- |
| Models (`~/flux/models`) | `scp box/models/manifest.tsv box/scripts/fetch_models.sh` to `~/flux/` and run `fetch_models.sh manifest.tsv`; `.done` markers make reruns resume |
| Datasets (`~/flux/data`, `~/flux/corpora`) | `box/scripts/fetch_data.sh` with the universal, regional, and corpora manifests (`DATA_DIR` picks the target) |
| Content pack (`content.db`) | `flux-pipeline parse`, then `walkthrough`, `guide`, `figures` per `contracts/pack-format.md` |
| Water features (`features.db`) | `flux-pipeline features <wa.osm.pbf> <out>` (#222) |
| Trail graph (`trails.db`) | `flux-pipeline trails <wa.osm.pbf> <out>` (#148) |
| Terrain tiles (`wa-terrain.pmtiles`) | `~/flux/build_terrain_pmtiles.py` over the fetched 3DEP tiles (#78) |
| Base map (`wa-dev.pmtiles`) | `pmtiles extract` from the Protomaps daily build (#76) |
| Service venvs | `python3 -m venv` plus each service's documented pip set |

## What the backup captures

`box/scripts/backup_box_state.sh` pulls only what hand-editing created, into a
timestamped tarball under `mac:~/FluxBackups/`:

- `~/flux/.env` (credentials, mode 600 preserved), `env.sh`, `hosts_override.py`
- `~/flux/vss-overrides/`
- `developer-profiles/dev-profile-base/.env` and `generated.env`, plus a
  `git diff` of the blueprint checkout (captures the Nemotron compose edit and any
  other local change)
- `~/flux/services/*/main.py` and the fetch/serve/build scripts in `~/flux`
- the crontab, the NemoClaw `flux_ops_policy.yaml` (also committed in `box/nemoclaw/`),
  and the running-process port map (`ss -tlnp`)

Staged but unused, removable to reclaim ~1.6 GB on the box: `~/flux/pack/` and
`~/flux/services/flux-server/`, copied for a box-hosted server plan that was set aside
on 2026-08-16 in favor of this document.
