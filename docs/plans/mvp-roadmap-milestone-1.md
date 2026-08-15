# Flux: MVP roadmap and milestone 1 (camera-first frontend)

## Context

The repo holds one artifact: `prd_0.md`, the PRD for Live Solder Inspection, an app where a phone
scans the solder side of a circuit board and a server-side vision model labels each joint. No code
exists yet. The user chose to build the camera-and-frontend path first, against a stub server, and
to defer model training and NVIDIA VSS to later phases. This plan lays out the full MVP roadmap at
phase level and plans milestone 1 to executable detail.

Decisions already made with the user:

- React Native via Expo with a custom dev build, using react-native-vision-camera.
- Monorepo: `app/` (RN, TypeScript) and `server/` (Python) in this repo.
- First test device: a physical iPhone (development happens on macOS).
- Ticket-driven development: GitHub issues on `reversely/flux`, one commit per ticket.
- GN100 GPU server: reachable on the LAN, nothing installed. VSS deployment becomes its own phase.

## Roadmap

- **Phase 0: bootstrap.** Run the startup-skill bootstrap (CLAUDE.md, pre-commit, uv), move the PRD
  to `docs/prd.md`, create labels and milestone-1 tickets on `reversely/flux`.
- **Phase 1 (this milestone): camera frontend end-to-end against a stub.** Expo dev build on an
  iPhone captures video, runs live capture-quality guidance, uploads frames to a FastAPI stub on
  the dev Mac, and renders canned PRD-schema results as live overlays and in the review viewer.
- **Phase 2: GN100 environment and VSS.** Install drivers and a container runtime on the GN100,
  deploy NVIDIA Video Search and Summarization, and move the frame-ingest endpoint from the stub
  to the GN100.
- **Phase 3: datasets and model.** Send the PCBSPDefect access request at the start of this phase
  (long maintainer lead time), audit SolDef_AI and the Ülger set, build the training pipeline per
  PRD section 7, and train the baseline joint detector. Load the `gpu-training-runs` skill before
  the first training run.
- **Phase 4: integration.** Serve the trained detector behind the PRD section 8 API, wire VSS frame
  selection and cross-frame aggregation, and build the before/after rescan flow.
- **Phase 5: validation.** Build the deliberately varied physical test board and measure the PRD
  section 9 acceptance criteria, reporting precision and recall per defect class.

Phases 2 and 3 can run in parallel once milestone 1 ships. Each later phase gets its own plan doc
when it starts; this document plans phases 0 and 1 only.

## Phase 0: bootstrap

Following the `startup` skill, with these answers already gathered:

- Ticket-driven development: yes. Repo slug `reversely/flux`. Proposed `area:*` labels, to confirm
  at bootstrap: `area:app`, `area:server`, `area:model`, `area:infra`, `area:docs`.
- One-line description: "Live solder-joint inspection from a phone camera."
- Python: 3.13 (assumption; cheap to change at bootstrap).

Steps:

1. Copy `CLAUDE.md.template` → `CLAUDE.md`, `.pre-commit-config.yaml`, and merge
   `.gitignore.template` into the existing Python `.gitignore` (add Node/Expo entries:
   `node_modules/`, `.expo/`, `ios/`/`android/` build products from prebuild).
2. Fill the Tickets section with the slug and labels; fill the description; check pinned hook
   revisions against current releases.
3. `uv init` at the repo root for dev tooling only, `uv python pin 3.13`, `uv add --dev
   pre-commit detect-secrets`, `uv run pre-commit install`, secrets baseline scan. The server
   becomes its own uv package (`uv init server --python 3.13 --package`, src layout) in
   milestone-1 ticket 2; the RN app under `app/` keeps its own npm tooling.
4. Move `prd_0.md` to `docs/prd.md` and commit it (`docs: add the live solder inspection PRD`).
5. Create the GitHub labels and file the milestone-1 tickets listed below.

## Design language (per the light-enterprise-ui skill)

The app's screens count as application surfaces, so the app-screens reference governs them. The
basic decisions, made now so every milestone-1 ticket builds inside them:

- **Tokens as a TS module.** `app/src/theme/tokens.ts` mirrors `assets/tokens.css`: paper
  `#F2F4F5`, card `#FFFFFF`, ink `#1C2B36` / `#51626E` / `#74858F`, line `#DFE5E9`, signature
  `#35576B` (the configurable slot; steel default until flux has a brand colour), annotate gold
  `#B07A10` reserved for evidence callouts, plus the steel scale and role-based grays. React
  Native has no CSS variables, so the module is the single source and components import it.
- **Typography.** Aeonik Light/Regular/Medium loaded via expo-font, with the app-screens role
  table: page title 24px Medium, body 15px Regular, table/list body 14px, tags 12px Medium,
  focal stat 32px Light. Aeonik is commercial and this GitHub repo is public, so
  `app/assets/fonts/` gets gitignored, a setup note documents copying the weights from
  `~/Library/Fonts/`, and the app falls back to the system font when the files are absent so a
  clone without the font still builds.
- **Copy register (user decision, 2026-08-14).** Data surfaces carry bare labels and tags,
  never sentences: overlay labels, list rows, counts, and severity tags all read as
  `bridge 84%`-style annotations (the user supplied a reference frame with this exact style).
  Sentences appear only where they instruct: the PRD's capture-guidance prompts ("Please move
  closer to the board."), an error state naming the fix, an empty state printing its reason,
  and rework guidance in the joint detail. Standard short labels for standard actions: Connect,
  Start scan, Finish scan, Scan again.
- **Capture screen.** The live camera view is the field; chrome keeps to one guidance line and
  one focal action. Overlay boxes follow the majority-quiet rule: every detected joint gets a
  box, suspicious joints carry colour and a mono 11px label (`<classification> <confidence%>`,
  the technical-annotation role), acceptable joints render as thin quiet outlines with labels
  off by default (one tunable constant flips them on during calibration).
- **Review viewer (user decisions, 2026-08-14).** Results stay on the imagery: a row list of
  joint ids fails because a joint's only identity is its position on the board. The user
  supplied an annotation-platform screenshot as the model, and the review screen follows it at
  viewer-core scope: frame canvas with boxes and bare labels, a filmstrip of finding-bearing
  frames ordered worst-first, an objects sheet with per-joint show/hide, class-count filter
  tags, and an overlay opacity slider. Full spec in Phase 1. Severity tags follow the
  tables.md tag system, exact hues resolved at implementation under its six-colour rule. The
  gold annotation marks the selected joint; nothing else uses gold.
- **Motion and states.** Motion fires once per data change (rows re-enter staggered after a
  rescan, one decaying highlight on a live update); upload/processing shows a scoped progress
  indicator; no ambient loops. Empty states print their reason and next step ("No joints
  detected yet. Please scan the solder side slowly.").
- **Review.** Milestone-1 UI tickets get checked against the app-screens checklist (grayscale
  test, signature under 5%, 2× relation test), with screenshots captured via the progress-shots
  skill as the work proceeds.

## Phase 1: milestone 1, camera frontend against a stub server

Goal: an Expo dev build on a physical iPhone captures live video of a board, runs local
capture-quality guidance, uploads frames to a FastAPI stub on the dev Mac, and renders the
stub's canned PRD-schema findings as live overlays and in the review viewer. When the GN100
comes online, only the server URL changes.

### Verified stack (researched 2026-08-14; ecosystem moved past my training data)

- **Expo SDK 57** (React Native 0.86), `expo-dev-client`, built locally with
  `npx expo run:ios --device` (no EAS; a free Apple ID signs the dev build).
- **react-native-vision-camera 5.2.2**: v5 is a rewrite on Nitro Modules. `useFrameOutput`
  replaces `useFrameProcessor`; peers are `react-native-nitro-modules`,
  `react-native-nitro-image`, `react-native-vision-camera-worklets`, and Software Mansion's
  `react-native-worklets` (Expo pins 0.10.1). v5 has no Expo config plugin: camera permission
  goes in `app.json` `ios.infoPlist`, then `expo prebuild` + `expo run:ios`.
- **react-native-svg 15.15.4** (Expo-pinned) for bounding-box overlays; **zustand** for the one
  global store. Pin the camera cluster exactly (no `^`).
- **Server**: FastAPI (`fastapi[standard]`) + Pillow under uv, Python 3.13, in `server/` as its
  own package.
- **Known risk**: an open VisionCamera issue (#3997) reports an iOS build failure combining
  `react-native-vision-camera-worklets` with `expo-dev-launcher`. Mitigations in order: the
  thread's patch-package podspec fix; fall back to Expo SDK 56 (RN 0.85, VisionCamera's tested
  version); last resort the v4 API line. Camera imports stay quarantined in three files so a
  swap stays cheap.

### Development workflow: on the phone the entire time

Development happens on the physical iPhone throughout; Xcode acts as the compiler, never the
workspace, and the simulator sits outside the human dev loop.

- One-time setup: install Xcode, enable Developer Mode on the iPhone, run
  `npx expo run:ios --device` once. That compiles the dev client (the native shell) onto the
  phone.
- Daily loop: `npx expo start`; the phone connects to Metro over Wi-Fi and every file save
  hot-reloads on the device in about a second, with Xcode closed.
- Xcode returns only when a native dependency or `app.json` native config changes (rebuild),
  and for signing renewal: a free Apple ID's provisioning expires after 7 days, so the phone
  needs a rebuild roughly weekly; a paid Apple Developer account extends that to a year.
- Agent-side verification: sample-scan mode plus the seeded stub session let me boot the app
  in a simulator to check screens and capture progress screenshots when the phone is not on my
  side of the keyboard. That is the simulator's only role.

### UX flow

- **Connect (`index`).** One server-URL field (persisted, pre-filled) and one Connect action
  running the health check; a bare `connected` / `unreachable` tag shows the outcome, and Start
  scan appears as the focal action once connected. The unreachable state carries one sentence
  naming the fix (server running, same Wi-Fi). Later launches health-check the stored URL
  silently and land ready.
- **Scan.** The preview opens on entry and requests camera permission (a denied state shows one
  sentence and an Open Settings action). Guidance runs before the session starts so the user
  can position the board. Start scan (the 40px focal action) creates the session and starts the
  quality-gated upload loop; the button becomes Finish scan. Chrome during scan: one guidance
  line, bare status tags (`frames 12`, `joints 6`), a torch toggle, portrait lock. Finish scan
  stops the loop and opens the review viewer. Leaving mid-scan stops uploading; the server
  session stays.
- **Review viewer.** Specified below; joint detail is a selection state inside it rather than a
  separate screen.

### The review viewer (built first)

Modeled on the user's reference screenshot at viewer-core scope, adapted to phone width, and
read-only over the session's frames and findings:

- **Frame canvas:** the selected captured frame with pinch-zoom and double-tap fit; boxes with
  bare mono labels (`bridge 84%`).
- **Filmstrip:** horizontal thumbnails of finding-bearing frames ordered worst-first. The
  client derives the order by inverting the joints' `supporting_frames` references.
- **Objects sheet:** a bottom sheet listing the visible frame's joints as rows (joint id,
  classification tag, confidence, severity tag) with a per-row show/hide toggle from the icon
  set. Tapping a row or its box selects the joint: the canvas zooms to it, the gold annotation
  marks it, and the sheet shows its tags plus canned per-classification rework guidance.
- **Overlay controls:** an opacity slider for the box layer and class-count filter tags
  (`bridge 2`, `acceptable 14`) toggling which classes render.
- **Details and states:** bare metadata rows in the sheet header (frame id, resolution,
  captured time). An empty scan shows its reason as one sentence plus Scan again.

The viewer reads the same results and frame endpoints the scan flow populates, so against the
seeded stub session it is buildable and demoable before any camera code exists. This is the
first product surface built, per the user's direction.

### App architecture (`app/`)

expo-router routes: `index` (connect, start session), `scan` (capture + guidance + live
overlay), `review` (the viewer; the later rescan-comparison phase extends this screen). Source
layout:

- `src/theme/tokens.ts`: the design-language tokens (see Design language above).
- `src/quality/`: pure metrics (`metrics.ts`), guidance state machine (`guidance.ts`), every
  tunable constant in `thresholds.ts`, VisionCamera worklet wiring in `useCaptureQuality.ts`.
  Only the last file touches the camera API.
- `src/api/`: `types.ts` (TS mirror of PRD section 8), `client.ts`, `uploadQueue.ts` (serial
  multipart upload with retry; the capture loop fires ~every 1.5s only while scanning AND the
  quality verdict passes, which implements the PRD's "withhold results while quality fails").
- `src/store/session.ts`: one zustand store (serverUrl, sessionId, phase, latestQuality,
  results, uploadStats).
- `src/capture/`: the `CaptureSource` interface (`start(onFrame)`, `stop()`) with
  `CameraCaptureSource` (the capturePhoto loop) and `SampleCaptureSource` (bundled board JPEGs
  at the same cadence), so the full flow runs without a camera. Sample mode reports a fixed
  passing quality verdict and shows a bare `sample` tag in the banner.
- `src/lib/coords.ts`: frame-space to view-space box mapping (unit-tested).

Upload path: `capturePhoto()` per tick (AF-settled, hardware JPEG) rather than encoding frames
from the frame output. Frames go as multipart POST JPEGs over plain LAN HTTP; each upload
response returns cumulative results, so the live overlay needs no polling loop.

### Capture-quality module

Signals computed on a ~640x360 luma plane at ~3 Hz inside a `useFrameOutput` worklet:

| signal | metric | prompt |
|---|---|---|
| focus | Laplacian variance below threshold | "Please hold the camera steady until the image sharpens." |
| glare | clipped-highlight fraction above threshold | "Please tilt the phone to reduce the glare on the board." |
| distance far | `lensPosition` high while sharp | "Please move closer to the board." |
| distance near | `lensPosition` low and focus failing | "Please move back slightly from the board." |
| motion | 8x8 mean-luma grid delta above threshold | "Please move the camera slowly across the board." |

One prompt at a time (priority glare > distance > focus > motion), 600ms to surface and 1s to
clear so guidance never flickers. Metrics and the state machine are pure functions with jest
tests on synthetic luma arrays. Thresholds need on-device calibration with the real macro
attachment, so they live in one file behind a dev-only metrics overlay. The camera selects the
wide-angle device explicitly so iPhone auto-macro cannot switch lenses behind the clip-on
attachment. Board-coverage tracking is out of milestone-1 scope: it needs joint identity, which
arrives with VSS in phase 2.

### Stub server (`server/`)

Pydantic models mirror PRD section 8 exactly; they are the contract the real GN100 pipeline
must later satisfy. Endpoints under `/v1`: `POST /sessions`, `POST /sessions/{id}/frames`
(multipart JPEG; returns cumulative results, empty until 3 frames arrive), `GET
/sessions/{id}/results`, `GET /sessions/{id}/frames/{frame_id}` (serves the stored JPEG so the
joint-detail view shows a frame the phone actually captured), `GET /healthz`. Canned findings
cover all six PRD classifications with fractional boxes scaled to the uploaded frame's real
size. Uploaded frames land in `server/data/sessions/` (gitignored). A `--seed` flag builds a
finished session from bundled sample-board frames plus the canned findings at startup, so the
review viewer develops and demos with zero capture.

Open decision recorded here: the PRD shows `"severity": "review"` without enumerating the
vocabulary. The stub defines an ordered set (`critical` > `review` > `ok`) as a Literal type in
`models.py`, mirrored in `types.ts`; confirm the vocabulary before the model phase.

### Milestone-1 tickets (one commit each; 1 → (2 ∥ 3) → 4 → 5 → 6 → 7 → 8 → 9)

The viewer lands before any camera ticket, per the user's direction. Tickets 2 and 3
parallelize; only tickets 3, 6, 7, 8, 9 touch the phone, and only ticket 3 needs Xcode barring
native-config changes.

1. Repo conventions and monorepo scaffold (Phase 0 above; gitignore additions for `app/ios`,
   `node_modules`, `.expo`, `server/data`, `app/assets/fonts`).
2. Stub server end-to-end: canned PRD responses, the `--seed` sample session, pytest schema
   tests, curl smoke script. No Xcode, no phone.
3. Expo app scaffold and the one dev-client build onto the iPhone: SDK 57 + dev client + camera
   cluster installed and pinned, `app.json` infoPlist entries (camera usage, local networking),
   theme tokens module, Aeonik loading with system-font fallback. Absorbs the build-risk
   buffer (VisionCamera issue #3997).
4. API client, zustand store, persisted server URL, and the connect flow against the stub.
5. **The review viewer** against the seeded session: canvas with zoom, boxes and bare labels,
   filmstrip, objects sheet with show/hide and selection, opacity slider, class filter tags,
   coords mapping unit-tested. Demoable on the phone at the end of this ticket.
6. Camera screen: permission UX, wide-lens selection, live preview, debug still capture.
7. Capture-quality module and guidance banner, with jest tests on synthetic luma arrays and
   the dev metrics overlay.
8. Capture sources and upload queue: `CaptureSource` with camera and sample implementations,
   the quality-gated capture loop with retry, live merge of upload responses into the store.
9. Live overlay on the preview, finish-scan handoff into the viewer, empty and error states,
   README run instructions, on-device threshold calibration with the macro attachment, and an
   app-screens checklist pass with progress-shots screenshots.

### Verification

- Ticket-level checks: pytest for the server; jest for quality metrics, guidance transitions,
  and coordinate mapping; on-device behavior checks (covering the lens triggers the focus
  prompt, a lamp reflection triggers the glare prompt, waving triggers the motion prompt).
- Viewer demo at ticket 5, on the phone against the seeded session: browse frames worst-first,
  toggle objects, filter classes, select a joint and see the zoom, annotation, and rework
  guidance.
- End-to-end demo at ticket 9: start the stub server on the Mac (`uv run uvicorn ... --host
  0.0.0.0`), scan a real circuit board with the phone, boxes appear live within seconds,
  Finish scan lands in the viewer, airplane mode shows the failure state and recovers.
- Agent-side: the simulator with sample-scan mode and the seeded session verifies screens and
  captures progress screenshots to `docs/progress/` via progress-shots.
- UI reviewed against the light-enterprise-ui app-screens checklist (grayscale test, signature
  colour under 5%, 2x relation test).

## After approval

Persist this plan to `docs/plans/mvp-roadmap-milestone-1.md` per the plan-docs skill and link
it from CLAUDE.md at bootstrap.
