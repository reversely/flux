# flux

Flux builds LifeKit, an offline survival assistant built on the US Army Survival Manual
FM 21-76. A chat-first Expo app on the phone answers survival questions, reads the manual
as a twelve-tile encyclopedia, renders an offline terrain map, and records camera sessions;
the flux FastAPI server on the local network carries sessions, chat, pack content, and map
tiles; an Acer GN100 box runs NVIDIA VSS with Nemotron Nano 9B for the chat answers plus
the perception stack (SpeciesNet, BioCLIP, FungiTastic) for identification.

## Features

- **Chat home**: asks the server, cites FM chapters, and launches primed tools (camera,
  reference pages) from answers.
- **Encyclopedia**: the PRD's twelve tiles over the parsed manual; a tile opens its
  chapters' sections, and a section renders typed blocks with warnings on an
  uncollapsible red card. Serves from `/v1/content`, with a labeled built-in sample when
  no server answers.
- **Map**: MapLibre GL in a WebView, styled light and minimal from the app's own tokens,
  with subtle hillshade relief. Vector tiles stream as byte ranges from the server's
  PMTiles archive; labels render from bundled glyphs, so the map needs no third-party
  host.
- **Reference**: the bundled FM 21-76 PDF with per-chapter deep links.
- **Capture**: records low-rate video clips into an upload queue tied to a server
  session; the coach that consumes them (step tracking, demo overlay, narration, voice
  control) is in progress across #64-#66, #72-#74, #77, and #80.

## Layout

- `app/`: the Expo (React Native) iPhone app carrying the screens above and the
  session/upload plumbing.
- `server/`: the FastAPI server, with sessions, frame and video upload, `POST /v1/chat`
  answered through the Nemotron retriever or a no-pack notice, the `/v1/content` pack
  API with full-text search, the `/v1/tiles/archive` byte-range route, and the VSS video
  handoff on session finish.
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
chat route answers that it waits on the model endpoint. `FLUX_CONTENT_DB` names the
content pack (built by `flux-pipeline parse`) that `/v1/content` serves. `FLUX_TILE_ARCHIVE`
names the PMTiles archive behind `/v1/tiles/archive`; each unset variable turns its routes
into an explanatory 503 rather than a crash.

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
