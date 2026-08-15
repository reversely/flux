# box: the GN100

This directory provisions the Acer Veriton GN100 (host `gn100-2854`, NVIDIA GB10
Grace Blackwell, aarch64, 121 GB unified memory). The box runs VSS and the heavy
models and serves the web app on the local network (docs/prd.md, section 2).

## Reaching the box

The box drops new TCP flows, so every connection multiplexes over the existing
SSH ControlMaster socket:

```
ssh -o ControlPath=~/.ssh/cm-gn100 gn100
```

If the socket is gone, re-establish it from an interactive login session first.

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
