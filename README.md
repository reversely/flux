# flux

Flux inspects solder joints live through a phone camera: the app scans the solder side of a
circuit board and a server-side model labels each visible joint. The PRD lives at
`docs/prd.md`; the active plan at `docs/plans/mvp-roadmap-milestone-1.md`.

## Layout

- `app/` — Expo (React Native) iPhone app: capture with live quality guidance, frame upload,
  and the review viewer.
- `server/` — FastAPI stub that returns canned PRD-schema results; the GN100 inference
  pipeline replaces it in a later phase behind the same API.

## Run

Server, on the Mac:

```
cd server
uv run flux-server --seed
```

`--seed` writes a synthetic sample session (`sess_sample`) so the review viewer works with
zero capture.

App, one-time native build (Xcode, iPhone in Developer Mode):

```
cd app
npm install
npx expo run:ios --device
```

Daily development needs no Xcode: run `npx expo start` in `app/`, open flux on the phone, and
JS hot-reloads over Wi-Fi. Point the connect screen at `http://<mac-ip>:8000`; the simulator
defaults to `http://localhost:8000`. Without a camera (the simulator) the scan screen runs in
sample mode on bundled frames.

Aeonik is a commercial font and stays out of the repo; `npm install` copies it from
`~/Library/Fonts` when present and the app falls back to the system font otherwise.

## Tests

```
uv run pytest server/tests -q
cd app && npx jest
```

Work is ticket-driven: GitHub issues, one per commit (see CLAUDE.md).
