# flux

Flux builds LifeKit, a digital edition of the US Army Survival Manual FM 21-76 for off-grid
living: a phone app carries the offline content and light models, and an Acer GN100 on the
local network runs VSS and the heavy models. `docs/prd.md` holds the design.

## Layout

- `app/` — Expo (React Native) iPhone app: a connect screen and generic session/upload
  plumbing, with the design-system theme and a compiled dev client ready for camera work.
- `server/` — FastAPI server with bare endpoints: create a session, upload a frame, fetch a
  frame back, fetch results (an empty record list until a model exists), and health.
- `box/` — provisioning for the Acer GN100 that runs VSS and the heavy models: the model
  manifest, the fetch script, and connection notes.
- `contracts/` — the interface descriptions the three parties code against: the flux-server
  OpenAPI export and the pointer to the VSS endpoint map in docs/prd.md section 2.2.

## Run

Server, on the Mac:

```
cd server
uv run flux-server
```

App, one-time native build (Xcode, iPhone in Developer Mode):

```
cd app
npm install
npx expo run:ios --device
```

Daily development needs no Xcode: run `npx expo start` in `app/`, open flux on the phone, and
JS hot-reloads over Wi-Fi. Point the connect screen at `http://<mac-ip>:8000`; the simulator
defaults to `http://localhost:8000`.

Aeonik is a commercial font and stays out of the repo; `npm install` copies it from
`~/Library/Fonts` when present and the app falls back to the system font otherwise.

## Tests

```
uv run pytest server/tests -q
```

Work is ticket-driven: GitHub issues, one per commit (see CLAUDE.md).
