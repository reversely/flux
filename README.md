# flux

Flux pairs a phone client with a LAN inference server. The previous concept was purged; the
repo carries the bare skeleton while the next concept takes shape.

## Layout

- `app/` — Expo (React Native) iPhone app: a connect screen and generic session/upload
  plumbing, with the design-system theme and a compiled dev client ready for camera work.
- `server/` — FastAPI server with bare endpoints: create a session, upload a frame, fetch a
  frame back, fetch results (an empty record list until a model exists), and health.

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
