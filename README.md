# flux

Flux builds LifeKit, an offline survival assistant built on the US Army Survival Manual
FM 21-76. A chat-first Expo app on the phone answers survival questions and launches camera
skills, the flux FastAPI server on the local network carries sessions and chat, and an Acer
GN100 box runs NVIDIA VSS with Nemotron Nano 9B for the chat answers plus the perception
stack (SpeciesNet, BioCLIP, FungiTastic) for identification.

## Layout

- `app/`: the Expo (React Native) iPhone app, with the chat home screen, the encyclopedia
  and reference (FM 21-76 PDF) screens, the capture flow, and the session/upload plumbing.
- `server/`: the FastAPI server, with sessions, frame and video upload, `POST /v1/chat`
  answered through the Nemotron retriever or a no-pack notice, and the VSS video handoff
  on session finish.
- `box/`: provisioning for the GN100, with model and data manifests, fetch scripts, the
  VSS bring-up notes, and the perception service behind `POST /identify`.
- `pipeline/`: `flux-pipeline parse <pdf> <out.db>` parses the FM 21-76 PDF into the
  content database that becomes the app's content pack.
- `contracts/`: the flux-server OpenAPI export, the pack-format description, and the
  pointer to the VSS endpoint map the three parties code against.

## Run

One-time setup from a fresh clone:

```
uv sync --all-packages
```

Server, on the Mac:

```
cd server
uv run flux-server
```

`FLUX_NEMOTRON_URL` points chat at the box's OpenAI-compatible endpoint; without it the
chat route reports that no content pack is loaded. `FLUX_CONTENT_DB` names the anchored
content pack for the retrieval seam once the pack reader exists.

App, daily development:

```
cd app
npm install
npx expo start
```

Open the app on the phone (Expo Go, or the compiled dev client for camera work via
`npx expo run:ios --device`) and point the connect screen at `http://<mac-ip>:8000`.
`npm install` runs the sync scripts: they copy the Aeonik fonts from `~/Library/Fonts`
when present, and copy `FM21-76_SurvivalManual.pdf` from the repo root into the app's
assets so the reference screen can render it. Both degrade to an explanation in the app
when the source file is missing.

## Tests

```
uv run pytest server/tests -q
```

## Tickets

Work runs through GitHub issues in `reversely/flux`, one issue per commit to `main` (see
CLAUDE.md). Pinned issue #20 maps the four parallel workstreams to directory boundaries.
