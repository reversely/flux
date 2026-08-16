# Open-data research: coachable procedures per encyclopedia tile

Research date: 2026-08-15. Frame of reference: the six-knot exemplar
(app/src/data/coach.ts, docs/log.md). Each coachable item needs: (1) open
bench video with hand-marked ground truth for step-state accuracy on
cosmos-reason2-8b (8 s chunks, 8 frames per chunk, stateless full-list
classification, monotone + majority smoothing); (2) steps at VLM-trackable
phase granularity (fine hand topology fails; coarse visually distinct phases
work — bowline 78.6% -> 85.7% after merging threading sub-steps); (3) the
server step pointer (/v1/coach); (4) openly licensed per-step reference
figures with attribution; (5) narration fragments; (6) an accuracy gate
before `watchable: true`.

Findings by tile follow. Anything not verified against a live page is
marked UNVERIFIED.

## What these datasets are for: the coach runs inference, not training

The controlling decision is in docs/log.md, 2026-08-15 night, "coach pivots to
inference": there is no fine-tune. cosmos-reason2-8b classifies each 8-second
chunk against the full step list, stateless, and the server applies monotone
plus majority smoothing to move a step pointer. PRD section 6.3 "Fine-tune
targets", the 6.1 CPR fine-tune row, 2.1 "one selected fine-tuned coach", and
2.2 "Fine-tuning targets a measurable execution signal" all describe a plan
that was dropped. Read the log, not the PRD, on this point.

Every dataset named below is therefore a measuring instrument rather than a
training corpus, which changes four things a reader would otherwise get wrong:

1. Non-commercial licensing is mostly not the binding constraint. No video
   dataset was ever going to ship inside the app, and none is trained on, so
   CC BY-NC on R2PPE, EPIC-KITCHENS, or EgoEMS restricts far less than the
   "Recurring license traps" section at the foot of this document implies. The
   real question per dataset is narrower: can it be downloaded once and have
   local inference run over it.
2. COIN is the exception that still bites. Its signed agreement bars use for
   "testing commercial systems", and benching is exactly that. COIN gates the
   fish-cleaning item (#112) in a way NC licenses elsewhere do not.
3. Volume requirements collapse. EPIC-Tent's 179 GB segmented download was
   staged for the abandoned structural-mistake fine-tune. A bench needs on the
   order of ten to twenty minutes of footage with markable step boundaries,
   not a training-scale corpus.
4. The tiles this document calls thin are less thin than that framing
   suggests, but this project produces no footage of its own. A tile with no
   open research dataset cannot be benched, so its procedures ship
   reference-only: steps, figures, and narration, with no camera judgement.

The one number that governs every item is the accuracy gate in epic #111: at
least 85.7% per-chunk step-state after monotone and majority smoothing, the
figure the coarse-phase bowline reached.

Two other PRD sections are stale for reasons recorded in the 2026-08-15
evening entry: the phone-only model tier in 3.6 is cut for MVP, since all
perception runs on the GN100, and the web app is deferred.

## Cross-cutting: what COIN actually contains

COIN's full 180-task taxonomy was downloaded and parsed (taxonomy.xlsx from
github.com/coin-dataset/annotations). Four tasks are directly relevant:
`BandageHead` (place gasket at injury, wind bandage around head, knot at the
end), `BandageDogPaw` (cover injury, wind legs, cut the bandage),
`PerformCPR` (6 steps), and `PitchATent` (clean up the ground, lay the cushion
evenly, set up the brackets, set up the platfond, fix the ground nail, put on
the waterproof cover). Trap: COIN's step "tie the tourniquet" belongs to
`DrawBlood` (venipuncture), not limb hemorrhage control. Access needs a signed
license agreement with the maintainers, and videos are re-downloaded from
YouTube via their `download_videos.py`, so link rot applies and COIN is
bench-only. CrossTask's 83 tasks (cooking, car maintenance, drinks, DIY) carry
no first-aid, fire, or shelter match.

FM 21-76 figure numbers below were extracted from the PDF already in the repo
root, FM21-76_SurvivalManual.pdf.

## Tile 1. Survival Medicine (FM 21-76 Ch 4)

CPR is already covered by CPREval-6k, CPR-Coach, EgoEMS, and Ego-Exo4D health;
COIN `PerformCPR` adds third-person consumer footage. The three items below
are the unexplored ones.

### 1.1 Pressure bandage and wound dressing

- Video: COIN `BandageHead` (verified, task #40, three annotated steps) is the
  best benchable source, and its steps map cleanly onto coach phases.
  `BandageDogPaw` (#6) generalizes limb wrapping. Secondary: DVIDS combat
  lifesaver footage (verified, PD as US government work, for example
  https://www.dvidshub.net/video/960978/combat-lifesaver-training and the JBLM
  MSTC series), which needs hand-marked ground truth.
- Images: FM 21-76 Fig 4-2 (dressing held with a tightly wrapped bandage) and
  Fig 4-3 (pressure points), PD. FM 4-25.11 First Aid (Dec 2002) is PD with
  full PDFs at https://archive.org/details/FM4-25.11 and on Commons
  (File:FM_4-25.11_(FM_21-11)_First_Aid_December_2002.pdf); its Ch 2 and Ch 3
  field-dressing figure sequences are per-step illustrations. Successor
  TC 4-02.1 First Aid (2016) is also PD, with a full PDF on Commons and
  rdl.train.army.mil (verified). Commons Category:Tourniquets exists (215
  files); a dedicated Category:Bandaging does not, so use Category:First aid
  plus the extracted FM figures.
- Structured data: STP 21-1-SMCT (Soldier's Manual of Common Tasks, PD) gives
  GO/NO-GO performance-step checklists for the 081-COM first-aid tasks. This
  is the closest analog in the tile to the mycomorphbox extraction: numbered
  performance measures per procedure, directly convertible to step records.
  TCCC guidelines via Deployed Medicine (DoD) carry the MARCH sequence as
  structured protocol (UNVERIFIED).
- Bench feasibility: good. Bare wound, dressing placed, wraps in progress, and
  tied-off are distinct whole-limb states, analogous to the coarse knot phases
  that reached 85.7%.
- Ticket: Bench pressure-bandage step tracking on COIN BandageHead

### 1.2 Tourniquet application

- Video: NOT AVAILABLE TO THIS PROJECT TODAY. Trauma THOMPSON exists as a
  published dataset (Sci Data s41597-025-06365-y; MICCAI 2023 challenge report
  at doi 10.1007/978-3-031-71626-3_8; MELBA 2025:048; the 2025 challenge is
  live and open at https://t3challenge25.grand-challenge.org/) and describes
  3,717 egocentric clips across five lifesaving procedures including
  tourniquet application, verb-noun annotated. What could NOT be verified is
  any path to the bytes: the challenge page publishes no download mechanism
  and gates data behind registration, the Nature article 303-redirects to a
  login wall, and the DOI cited in PRD 6.3, 10.7910/DVN/V5BTRU, does not
  resolve to a readable Harvard Dataverse record (302 to a citation page that
  renders empty; the Dataverse API returns HTTP 202 with an empty body).
  Treat this dataset as aspirational until someone registers for the challenge
  and confirms what registration actually yields. Do not plan the tourniquet
  bench around it. FILE A PRD CORRECTION for the unresolvable DOI. EgoEMS
  (verified, github.com/UVA-DSA/EgoEMS, openly hosted on Harvard Dataverse,
  20+ hours, keystep annotations) covers cardiac and stroke protocols with no
  confirmed tourniquet keysteps, so treat it as CPR-adjacent. PD supplement:
  DVIDS "Combat Lifesaver - Applying a Tourniquet"
  (https://www.dvidshub.net/video/544757/combat-lifesaver-applying-tourniquet,
  verified), a single-procedure demonstration well suited to a hand-marked
  golden clip.
- Images: FM 21-76 Fig 4-4 (tourniquet 5-10 cm above the wound); FM 4-25.11
  and TC 4-02.1 tourniquet sequences (PD); Commons Category:Tourniquets
  (verified, 215 files including CAT application photos from military
  training).
- Structured data: TCCC Care Under Fire card (high-and-tight sequence);
  STP 21-1-SMCT 081-COM bleeding-control performance measures.
- Bench feasibility: good. Band around limb, windlass turning, windlass
  secured, and time marked are coarse whole-frame states; only windlass-twist
  counting would hit the fine-manipulation limit.
- Ticket: Bench tourniquet application on the DVIDS PD demonstration clip
  (Trauma THOMPSON is unobtainable today; see the video note above)

### 1.3 Splinting a limb

- Video: no research dataset covers splinting. Best open footage is DVIDS
  combat lifesaver and SAM-splint training b-roll (PD; splinting is named in
  CLS course coverage, and individual splint b-roll needs curation) plus
  CC-filtered YouTube instructional video. Without an open source this ships
  reference-only, not
  ground truth, as the knots did.
- Images: FM 21-76 Fig 4-6 (improvised traction splint from natural material);
  FM 4-25.11 Ch 4 fracture-immobilization figures (arm sling, leg splint
  sequences, PD). No dedicated Commons splint category was verified.
- Structured data: STP 21-1-SMCT "splint a suspected fracture" performance
  measures; TC 4-02.1 Ch 4 numbered procedure lists.
- Bench feasibility: good. Padding placed, rigid support alongside the limb,
  ties above and below the fracture, and sling on are large-object coarse
  states; tying individual cravats sits below VLM granularity and must be
  merged.
- Ticket: Define splinting step records and shoot bench footage

### 1.4 Recovery position

- No dataset and no verified PD or CC footage (stock libraries only). Commons
  Category:Recovery position (verified, 19 files including multilingual
  step-by-step sequences) covers the image need.
- Bench feasibility: likely the easiest bench in the tile, since arm
  positioned, knee raised, rolled to side, and head tilted are maximally
  coarse body-pose states. No open footage exists, so this ships reference-only.
- Ticket: Shoot and bench recovery-position footage against Commons step
  images

## Tile 2. Shelter (FM 21-76 Ch 5)

### 2.1 Tent pitching (data already in hand)

- Video: EPIC-Tent (verified at
  https://data.bris.ac.uk/data/dataset/2ite3tu1u53n42hjfh3886sa86) has 29
  participants, 7+ hours, two synchronized head-mounted cameras (GoPro plus
  SMI eye tracker), 166.8 GiB, annotated with action labels, task errors,
  self-rated uncertainty, and gaze. License: Non-Commercial Government Licence
  for public sector information v2, so it benches but cannot ship or be
  redistributed in the app, which matters if LifeKit ever goes commercial.
  Project page: https://sites.google.com/view/epic-tent. EgoProceL, already in
  hand, re-annotates EPIC-Tent with key-steps. COIN `PitchATent` (verified,
  task #113, six steps) adds exocentric consumer footage as a cross-view
  complement under COIN's signed-license terms.
- Images: FM 21-76 Fig 5-2 (poncho tent), Figs 5-4, 5-5, 5-6 (parachute
  tepees); Commons Category:Tents. Tent-manufacturer instruction sheets are
  copyrighted.
- Structured data: EPIC-Tent's own action and error annotation schema doubles
  as a step-record template, and COIN's six-step PitchATent list is a
  ready-made coarse phase set.
- Bench feasibility: good. Canopy spread, poles inserted, structure raised,
  staked, and flysheet on are large distinct visual states, and EPIC-Tent's
  error labels also allow benching mistake detection.
- Ticket: Bench tent-pitching step tracking on EPIC-Tent with a COIN
  cross-check

### 2.2 Poncho or tarp lean-to

- Video: no research dataset. COIN, CrossTask, and HowTo100M domain lists were
  all checked; HowTo100M (verified,
  https://www.di.ens.fr/willow/research/howto100m/, 23k tasks across cooking,
  crafting, personal care, gardening, fitness) may contain a lean-to task
  (UNVERIFIED), and its videos are unlicensed YouTube IDs regardless. Open
  footage: DVIDS SERE training b-roll (PD; shelter building appears in
  https://www.dvidshub.net/video/937101/sere-skills and Misawa SERE b-roll
  931619, both verified), unscripted, so expect to self-shoot the golden
  bench. Archive.org PD military survival films (for example
  https://archive.org/details/28534USNavyAirForceMountainAndDesertSurvival,
  1963 USAF) suit narration B-roll rather than benching.
- Images: FM 21-76 Fig 5-1 (poncho lean-to, with an explicit ordered build
  list: tie off the hood, tie ropes to grommets, attach drip sticks, stake the
  ground edge, add the center support), Fig 5-9 (field-expedient lean-to plus
  fire reflector wall), Fig 5-11 (debris hut), all PD with per-step text
  already written in the manual.
- Structured data: the FM 21-76 Ch 5 build instructions are the structured
  source, extractable as ordered bullets (verified in the local PDF at the "To
  make the lean-to" list). wikiHow "Build a Lean-To" is CC BY-NC-SA 3.0, the
  same non-commercial caveat as EPIC-Tent.
- Bench feasibility: good. Ridgeline tied, tarp draped, corners staked, and
  drip sticks on are coarse scene-level states; individual grommet knots are
  exactly the fine topology that failed in the bowline and must merge into
  "corner secured".
- Ticket: Extract poncho lean-to step records from FM 21-76 Ch 5 and shoot
  bench footage

### 2.3 A-frame debris shelter (deprioritize)

- FM 21-76 Fig 5-11 gives figures and steps, but no video source of any kind
  exists, and hour-scale gradual debris accumulation barely changes
  chunk-level state, which fits 8-second chunk classification poorly.
- Ticket: Assess debris-hut coachability or descope from the Shelter tile

## Tile 3. Fire (FM 21-76 Ch 7)

A tepee follow-along already ships (`fire-tepee` in coach.ts, `watchable:
false`), pending a bench.

### 3.1 Tepee fire lay build

- Video: no research dataset. COIN's only fire task is
  `OperateFireExtinguisher`; CrossTask has none; HowTo100M may contain "build
  a campfire" (UNVERIFIED, unlicensed). Open footage: DVIDS SERE b-roll shows
  fire building (SERE Skills 937101, Misawa 931619, PD), unscripted;
  archive.org USAF survival films (PD) supplement. Without open step-annotated
  footage, as with the knots.
- Images: FM 21-76 Fig 7-5 covers all four fire lays in one figure (tepee,
  lean-to, cross-ditch, pyramid, confirmed in the local PDF), Fig 7-1 (fire
  wall), Fig 7-2 (Dakota fire hole), Fig 7-4 (tinder, kindling, fuel chart).
  Commons Category:Campfires is verified (7 subcategories) for finished-fire
  imagery; no fire-lay diagram category exists, so extract the FM figures.
- Structured data: FM 21-76 Fig 7-4 is a genuine tabular asset, the tinder,
  kindling, and fuel material classes, and the closest thing this tile has to
  a mycomorphbox. Firewood BTU and species tables from USDA and state
  extension services extend it (UNVERIFIED).
- Bench feasibility: good. Cleared circle, tinder bundle placed, kindling cone
  formed, fuel added, and lit are distinct scene-scale states well inside the
  coarse-phase regime. This is the bench the shipped `fire-tepee` procedure is
  waiting on.
- Ticket: Build tepee fire-lay step records from FM 21-76 Fig 7-5 and bench
  no open footage, so reference-only

### 3.2 Ferro-rod and flint-and-steel ignition

- Video: no dataset. CC-filtered YouTube bushcraft footage only, otherwise
  ground truth is the realistic source, with DVIDS SERE firecraft b-roll as a
  PD supplement. Nothing could be verified as CC-BY, so treat the video column
  as UNVERIFIED pending curation.
- Images: FM 21-76 Ch 7 flint-and-steel text (Fig 7-6 is the convex lens;
  flint and steel is described alongside); Commons Category:Fire strikers
  (verified, 54 files). Category:Fire making does not exist on Commons; the
  working categories are Category:Fire strikers, Category:Bow drills, and
  Category:Campfires. A ferrocerium-specific category was not verified.
- Structured data: the FM 21-76 Ch 7 ignition-methods enumeration (convex
  lens, metal match, flint and steel, fire-plow, bow and drill) feeds a
  method-picker inference story.
- Bench feasibility: marginal. The striking motion is fast and fine-grained
  and likely invisible at 1 fps sampling, but the outcome states (tinder
  prepared, striking posture, smoke, flame) are highly distinct, so a
  three-to-four coarse-phase design should clear the gate where a stroke-level
  design will not.
- Ticket: Bench ferro-rod ignition with outcome-state phases (tinder, strike,
  smoke, flame)

### 3.3 Bow drill (reference-only recommended)

- FM 21-76 Fig 7-8 (bow and drill) and Fig 7-7 (fire-plow) give PD figures;
  Commons Category:Bow drills is verified (15 files including an annotated SVG
  and one museum video). No video dataset exists, and the procedure runs for
  minutes of visually identical sawing where success depends on downward
  pressure and speed, the invisible-technique regime where the knot bench
  failed. Reference images plus narration without a live step tracker.
- Ticket: Decide bow-drill coverage, reference-only against tracked, per bench
  limits

## License caveats carried by tiles 1-3

- EPIC-Tent: Non-Commercial Government Licence v2. Bench yes, ship no.
- COIN: signed institutional license, videos re-fetched from YouTube (link rot
  risk). Bench only.
- Trauma THOMPSON: no obtainable access path found. Published and its 2025
  challenge is open, but no public download, the article is login-gated, and
  the PRD's DOI does not resolve. Not a dataset this project has.
- EgoEMS: openly downloadable from Harvard Dataverse, with no explicit license
  in the README. Check the Dataverse record terms before shipping anything
  derived.
- Shippable image side: FM 21-76, FM 4-25.11, TC 4-02.1, STP 21-1-SMCT, DVIDS,
  and archive.org military films are PD US government works. Commons files
  carry per-file licenses needing attribution capture.
- wikiHow structured steps are CC BY-NC-SA 3.0, the same non-commercial
  constraint.

## Tile 4. Water (FM 21-76 Ch 6 + 17)

### 4.1 Belowground solar still

- Phases: dig the hole; place the container; lay the plastic sheet; weight the
  center with a rock; seal the edges with soil; insert the drinking tube.
  FM 21-76 Fig 6-7, with Fig 6-8 as the polluted-water trough variant.
- Video: no research dataset. COIN's full annotation JSON was checked and
  carries nothing water-survival; the nearest tasks are
  ReplaceRefrigeratorWaterFilter, ReplaceFilterForAirPurifier, and BoilNoodles,
  which give weak phase priors only. CrossTask's 18 primary and 65 related
  tasks are cooking and car-centric with no water task. HowTo100M
  (https://www.di.ens.fr/willow/research/howto100m/, verified) may hold
  "purify water" clips among its 23k activities but has no step-level
  annotation (water coverage UNVERIFIED). DVIDS
  (https://www.dvidshub.net/about/copyright, verified) is PD for
  USG-produced footage with a non-endorsement disclaimer, but its SERE water
  content is raft and pool training rather than procurement. The practical
  path is the knots workflow's CC-BY YouTube half; with no open source, reference-only.
- Images: FM 21-76 Ch 6 figures above, all PD. FM 3-05.70 (2002) redraws the
  same steps in a second art style (https://landsurvival.com/06.htm).
  Wikimedia Commons Category:Solar stills does not exist; use the files
  directly (File:Solar still.svg, File:Wick solar still.png). Verified
  categories: Water purification, Water treatment, Drinking water treatment,
  Water filters, Boiling water, Distillation, Fording, River crossings, Rafts.
- Bench feasibility: feasible. The phases are scene-scale and distinct.
- Ticket: Build the belowground solar still pack from FM 21-76 Fig 6-7 and 6-8

### 4.2 Improvised layered filter

- FM 21-76 Fig 6-9: cloth, sand, crushed rock, and charcoal in bamboo, a
  hollow log, or a cloth tripod.
- Video: same as 4.1, no open dataset, so reference-only.
- Images: FM 21-76 Fig 6-9 (PD); Commons Category:Water filters.
- Bench feasibility: feasible if merged per material layer. Distinguishing a
  sand pour from a crushed-rock pour likely needs merging into "add coarse
  media" and "add fine media".
- Ticket: Build the layered water filter pack with per-layer merged steps
  (Fig 6-9)

### 4.3 Chemical purification setup

- FM 21-76 Ch 6 Water Purification: 5 drops of 2% iodine per canteen of clear
  water, 10 if cloudy or cold, stand 30 minutes. The aboveground
  vegetation-bag still (Fig 6-6) is a simpler backup procedure.
- Structured data: the CDC backcountry water treatment table
  (https://www.cdc.gov/drinking-water/media/pdfs/backcountry_water_treatment-508.pdf,
  verified) is a method-by-pathogen-class effectiveness matrix and the closest
  mycomorphbox analog on this tile. EPA emergency disinfection
  (https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water,
  verified) gives bleach drops by volume and concentration plus boil time by
  altitude. CDC Yellow Book water-disinfection tables: UNVERIFIED (404/403 on
  fetch).
- Bench feasibility: marginal. Drop counts and 30-minute waits are invisible
  at 8 frames, so coach coarse phases with a server-owned timer, the same
  pattern the shadow-tip wait needs.
- Ticket: Build the chemical purification pack with server-side timer steps

### 4.x Excluded from coaching

Ch 17 water crossings (Fig 17-1 pole, 17-3 rope team, 17-4 through 17-7 rafts,
17-8 trouser flotation) are step-based but unsafe to practice on camera.
Reference-only.

- Tickets: Collect and hand-mark bench footage for the still and filter
  builds; extract the EPA and CDC method-versus-pathogen and dose tables into
  a TSV; record the scope note that Ch 17 crossings stay reference-only.

## Tile 5. Food (FM 21-76 Ch 8 + 9)

This tile holds the only research-dataset ground truth found outside tiles 1-3.

### 5.1 Fish cleaning (scale, gut, fillet)

- Video: COIN task `CleanFish`, verified in COIN.json
  (github.com/coin-dataset/annotations): 50 videos, about 138 s average, 5
  annotated steps (scratch scales, cut the head, remove the gill, remove
  intestines and blood vessels, cut off tail and fin). That granularity
  matches the coarse bowline phases that reached 85.7%. Access is registration
  plus a signed research license (copyright Meitu and Tsinghua); annotations
  are public on GitHub and videos are YouTube-hosted. Supplements with
  licenses confirmed via yt-dlp metadata: Florida FWC "How to Fillet a Fish"
  (youtube.com/watch?v=8gpduagmQz4, CC-BY, 139 s) and MidWest Outdoors "How
  To: Fillet Fish" (xMQk3Hu8VTQ, CC-BY, 394 s). State-agency works are not
  automatically PD, but the explicit YouTube CC-BY license settles reuse on
  those two.
- Ruled out: YouCook2 fish recipes start from fillets; EPIC-KITCHENS-100 is
  CC BY-NC with no fish-cleaning label; Ego-Exo4D cooking adds no cleaning
  ground truth; CrossTask has a "clean fish" step only inside its unannotated
  related tasks; HowTo100M labels are ASR noise, unusable for a gate.
- Images: FM 21-76 Fig 8-24 (fish cleaning and skinning), Fig 8-25 and 8-26
  (game skinning), verified against the repo PDF. Commons categories verified
  to exist: Filleting, Fish processing, Fish hooks, Fish traps, Fishing rods,
  Fishing equipment. Category:Fish filleting does not exist.
- Bench feasibility: strong. The five COIN phases are whole-frame distinct;
  expect performance in the bowline-coarse range.
- Ticket: Fish-cleaning coach benched on COIN CleanFish (50 videos, 5 steps)

### 5.2 Figure-4 deadfall, construction only

- Baited sets on a live trail are regulated in most US states; an unbaited
  practice build is safe and legal.
- Video: no research dataset. CC-BY bench footage verified: Delta Plan
  figure-4 build (fvhDJJPhp5A, CC-BY, 260 s). The same channel has CC-BY snare
  builds (gmyASYA-qNE, RoJ4C6zxdaY; per-video licenses UNVERIFIED). Snare
  alternates verified CC-BY: ogU6A3r99Ks (531 s), CWK8x4u_uLM Ojibwe bird trap
  (60 s).
- Images: FM 21-76 Fig 8-12 (figure-4 deadfall), Fig 8-13 (Paiute deadfall),
  Fig 8-5 (simple snare), 8-6 (drag noose), 8-7 (twitch-up snare), 8-9 (Ojibwa
  bird pole), 8-11 (treadle snare), all PD and verified against the repo PDF.
  FM 3-05.70 equivalents exist with UNVERIFIED figure numbers. Commons
  Category:Deadfall traps, Category:Snare traps, and Category:Trapping exist;
  Category:Animal traps and Category:Snares do not.
- Bench feasibility: workable at four coarse phases, with all notch carving
  merged into one. Notch topology is exactly the fine detail that failed on
  knots.
- Ticket: Figure-4 deadfall construction coach with CC-BY bench footage

### 5.3 Improvised hand-line rig

- Phases: cut and strip the line; attach an improvised hook; add a sinker;
  wind on a spool. Reuses the shipped palomar knot coach.
- Video: verified CC-BY, AlaskanFrontier1 hand-line build (VSqsMt8qlWM, 486 s).
- Images: FM 21-76 Fig 8-17 (improvised fishhooks), Fig 8-18 (stakeout),
  Fig 8-21 (fish basket traps), Fig 8-22 (spear), all PD.
- Bench feasibility: workable if "hook attached" is treated as a state rather
  than a watched manipulation.
- Ticket: Improvised hand-line rig coach reusing the palomar knot step

### 5.x Structured data

NOAA seafood species profiles
(fisheries.noaa.gov/topic/sustainable-seafood/seafood-profiles) are PD federal
work with UNVERIFIED per-species field coverage. Wikipedia Speciesbox
transclusions for game fish run through the same revid pipeline as
mycomorphbox under CC BY-SA. FishBase is CC BY-NC 4.0, so the NC term
conflicts with app distribution. wikiHow is CC BY-NC-SA, useful as
step-taxonomy reference only.

- Ticket: Extract NOAA seafood profiles and Wikipedia speciesbox data into a
  fish trait TSV

## Tile 6. Poisonous Plants (FM 21-76 Ch 10)

Identification-first, with no accuracy gate to build. The universal edibility
test is not camera-trackable: it is dominated by waiting (8 h fast, 15 min
contact, 3 min lip, 15 min hold, 8 h post-swallow), its active steps are
millimetre-scale contacts that 8 frames cannot separate from a hand near a
face, and stateless classification cannot represent "hour 5 of 8". Ship it as
a timer-driven checklist with optional timestamped photo checkpoints.

What the camera can do: guided identification capture, stepping the user
through leaf top, leaf underside, stem cross-section or node, flower, and
whole-plant habit. Those framing states are coarse and distinct, so a step
pointer over them is plausible for cosmos-reason2-8b.

### 6.x Structured data beyond what the project already uses

- NC State Extension Plant Toolbox (https://plants.ces.ncsu.edu/, verified,
  4,721 species) is the closest mycomorphbox analog: per-species Poison
  Severity, Poison Symptoms, Poison Toxic Principle, enumerated Poison Parts,
  and Causes Contact Dermatitis, confirmed on the Conium maculatum page. The
  text carries no open license (NC State copyright; images are individually
  CC-licensed), so it is inference data pending permission rather than
  redistributable content.
- Wikipedia "List of poisonous plants" (CC BY-SA, verified) extracts to a TSV
  with revids, though toxicity sits in a prose description column.
  Template:Speciesbox and Taxobox carry taxonomy only, with no toxicity
  parameters (verified), so no transclusion shortcut exists here.
- Dr. Duke's Phytochemical Databases (https://phytochem.nal.usda.gov/,
  USDA, PD; raw CSVs on Ag Data Commons record 24660351) join species to
  phytochemical to activity, connecting species names to named toxins such as
  coniine and cicutoxin for narration.
- CPCS toxic-species list via Calflora
  (https://www.calflora.org/app/ipl?list_id=px3140, verified, 1,310 species).
  The 1-4 toxicity classes live in the UC ANR "Safe and Poisonous Garden
  Plants" PDF (UNVERIFIED by fetch); calpoison.org carries prose only.
- T3DB (https://www.t3db.ca/, existence verified via its NAR paper, direct
  fetch 403) is CC BY-NC. Cornell Plants Poisonous to Livestock has no stated
  license. NLM TOXNET was retired in 2019 with no drop-in plant successor.
  Wikidata has Q21028485 "poisonous plant" but no per-species toxin or
  severity property.

### 6.x Lookalike pairs

No published deadly-lookalike dataset exists. Two build-your-own routes: the
iNaturalist endpoint
`GET /v1/identifications/similar_species?taxon_id=N` returns 200 with ranked
confused taxa for Conium maculatum, giving an empirical confusion matrix
derived from community ID corrections. This is the strongest mycomorphbox
analog on the tile, though the count-field semantics need checking against
api.inaturalist.org/v1/docs. Roboflow Universe also hosts small CV sets for
poison hemlock, water hemlock, giant hogweed, and mayapple, with per-dataset
licenses needing an audit.

### 6.x Images and video

Commons Category:Poisonous plants is verified with 171 subcategories and deep
per-genus coverage (Aconitum, Datura, Digitalis, Ricinus communis, Euphorbia
at 758 files). FM 21-76 Ch 10 plates are PD and already in the repo PDF. USDA
ARS Image Gallery (https://www.ars.usda.gov/oc/images/image-gallery/,
verified, 6,500+ photos) is PD for ARS-produced work, to be confirmed per
image; the Logan, UT Poisonous Plant Research Laboratory page exposes no
gallery or downloadable database. No video is needed and essentially none is
available: no research dataset covers plant identification or lookalike
comparison, and most foraging channels use the standard YouTube license.

- Tickets: Ship the universal edibility test as a timer checklist with no
  camera gate; build the guided five-shot plant ID capture flow; evaluate the
  NC State Plant Toolbox poison fields as a toxicity trait table; extract the
  Wikipedia list-of-poisonous-plants table to a TSV with revids; join
  Dr. Duke's CSV tables to tile-6 species for toxin annotations; build
  lookalike confusion pairs from the iNaturalist similar_species endpoint;
  harvest per-species images from Commons categories and the FM 21-76 Ch 10
  plates.

## Tile 7. Dangerous Animals (FM 21-76 Ch 11)

Identification-first tile with one genuine coachable procedure. Encounter
behavior is knowledge, not a paced procedure. The camera identifies species,
tracks, and scat, and raises detector alerts (MegaDetector/SpeciesNet already
in the stack).

### 7.1 Tick removal with fine-tipped tweezers

- Phases: expose the attached tick; grasp at the skin surface; steady upward
  pull to detachment; inspect and disinfect the site; secure the tick for
  identification. Do not split the tweezer grip into sub-steps.
- Video: no dataset exists. COIN, CrossTask, and medical video corpora carry
  nothing. CDC tick communication resources
  (https://www.cdc.gov/ticks/communication-resources/index.html) are PD as US
  government works, but whether a CDC-produced (rather than contractor)
  removal video exists is UNVERIFIED. Army Public Health Center fact sheet
  "How to Check for Ticks and Removal"
  (https://ph.health.mil/PHC%20Resource%20Library/HowtoCheckforTicksandRemoval_FS_18-092-0919.pdf),
  PD. Self-capture is cheap: the procedure runs about 30 seconds.
- Images: CDC PHIL PD photographs, verified: PHIL #28384 (blacklegged tick
  removed with fine-tipped tweezers, 2023,
  https://phil.cdc.gov/Details.aspx?pid=28384) and PHIL #28393 (lone star
  tick, https://wwwn.cdc.gov/phil/Details.aspx?pid=28393). FM 4-25.11 for
  field-sanitation context.
- Bench feasibility: workable. Grasp, pull, and detached are distinct at
  8-frame granularity, but the subject is small in frame, so the step records
  must carry close-up framing guidance and the accuracy gate should test it.
- Ticket: Coach tick removal with CDC PHIL figures and self-captured bench footage

### 7.x Identification assets (not coached)

- Tracks and scat: OpenAnimalTracks (ICIP 2024, arXiv:2406.09647,
  https://github.com/dahlian00/OpenAnimalTracks) has 3,579 footprint images
  across 18 species on mud, sand, and snow. Code is MIT; the dataset is
  research-only behind a Google Form, so it benches but does not ship.
  Shippable reference images: Wikimedia Commons Category:Animal tracks
  (verified, subcategories by surface and taxon) and Category:Animal feces
  (verified). USFWS National Digital Library (https://www.fws.gov/search/images)
  and NPS photo galleries are PD with attribution requested.
- Structured data: WHO Snakebite Information and Data Platform, live at
  https://snbdatainfo.who.int/, carries per-species range maps and
  Category-1/Category-2 medical-importance classification. Reuse license is
  not stated, so extraction terms are UNVERIFIED; the category list itself is
  publishable fact. Wikipedia's Speciesbox/Taxobox is not a mycomorphbox
  analog, since it carries taxonomy without trait fields. The closer analogs
  are Wikipedia's "List of dangerous snakes" LD50 and geography tables, and
  Wikidata (CC0) joined by SPARQL over taxon, common name, range, and IUCN
  status, seeded from the WHO category list because no clean "venomous"
  property exists. Clinical Toxinology Resources (http://www.toxinology.com/)
  holds 800+ venomous snake records plus spiders, scorpions, and marine
  species; no open license was found, so it stays a read-only reference
  (UNVERIFIED for extraction). iNaturalist publishes only its ~500-taxa small
  CV models (https://github.com/inaturalist/model-files); BioCLIP, already in
  the stack, remains the better open path.
- Tickets: Bench track and scat identification on OpenAnimalTracks, ship
  Commons and USFWS reference images; build a dangerous-species trait TSV from
  WHO snakebite categories plus Wikidata.

## Tile 8. Tools and Cordage (FM 21-76 Ch 12; knots shipped)

Verified negative: the COIN taxonomy (947 strings, extracted and checked)
contains no lashing, whittling, cordage, or carving task; the nearest entries
are PitchATent, TieBoatToDock, and CutAndRestoreRopeTrick. CrossTask
(https://github.com/DmZhukov/CrossTask, 18 primary plus 65 related wikiHow
tasks, no stated license) has no bushcraft task either. No academic video
dataset covers lashing, cordage, or feather sticks, so bench footage comes
from per-video CC-checked instructional video or self-capture, as the knots
exemplar already proved.

### 8.1 Square lashing (strongest next item in this tile)

- Phases: clove hitch on the vertical spar; wrapping turns (four or more);
  frapping turns (two); finishing clove hitch. Same rope-on-pole visual class
  the knot bench already cleared.
- Video: YouTube CC-BY filter for "square lashing" returns Scouting troop
  footage; check each video's license, since official Scouting America media
  is copyrighted. Self-capture is cheap.
- Images: FM 5-125 Rigging, Ch 2 Section I, verified figure numbers: Figure
  2-36 square lashing, Figure 2-37 shears lashing, Figure 2-38 block lashing
  (p. 2-25). PD. Full PDF at
  https://www.globalsecurity.org/military/library/policy/army/fm/5-125/fm5-125.pdf
  and as MCRP 3-17.7J at
  https://www.marines.mil/portals/1/MCRP%203-17.7J%20With%20Ch.%201%20z.pdf.
  Wikimedia Commons Category:Lashings does not exist (404); the real category
  is Category:Lashing knots (verified, holds Square lashing.jpg and
  Tripodlashing1-3.gif). The 1911 Boy Scout Handbook
  (https://www.gutenberg.org/files/29558/29558-h/29558-h.htm) is PD for
  period pioneering illustrations.
- Bench feasibility: strong. Wraps, fraps, and finished lashing are coarse
  high-contrast states; expect knot-tier accuracy after phase merging.
- Ticket: Coach square and shear lashing with FM 5-125 figures 2-36 and 2-37

### 8.2 Reverse-wrap two-ply cordage

- Phases: fiber bundle prepared; kink and start twist; reverse-wrap the
  running section; splice in new fiber; finished cord. Twist direction is
  exactly the fine-manipulation detail the VLM cannot track, so phase on
  completed cord length and hand position instead.
- Video: no dataset. YouTube tutorials are abundant but default to the
  standard license unless CC-flagged (UNVERIFIED per video). Survival Sherpa's
  written guide
  (https://survivalsherpa.wordpress.com/2017/12/16/how-to-make-reverse-twist-two-ply-natural-cordage/)
  is CC BY-NC, usable for ground-truth reference but not for shipping.
- Images: FM 21-76 Ch 12 cordage figures (PD, already in the repo PDF).
  No dedicated Commons cordage-making category was found (UNVERIFIED).
- Bench feasibility: marginal. The repetitive wrap loop produces near-identical
  frames chunk after chunk, so the only state signal is grown cord length,
  which 8 sparse frames judge coarsely. Run a pilot bench before committing.
- Ticket: Pilot-bench reverse-wrap cordage phase detection before committing
  the procedure

### 8.3 Feather stick

- Phases: stick selected and braced; curl strokes accumulating; finished
  feather head. Commons Category:Feather sticks (verified, 4 files);
  Category:Whittling (verified, mostly historical artwork rather than step
  figures).
- Bench feasibility: marginal, for the same repetitive-stroke reason as
  cordage, and it puts a knife near the hands, so coaching latency affects
  safety phrasing. Rank behind 8.1 and 8.2.
- Ticket: Evaluate feather stick as a coached procedure with curl-count phasing

## Tile 9. Direction Finding (FM 21-76 Ch 18)

Verified negative: no orienteering or compass-instruction video dataset
exists. The nearest hits are embodied-navigation corpora such as CompassNav,
which are robot path data. Orienteering club tutorials (for example
https://www.croc.org/navigationvideos) carry no open license (UNVERIFIED), so
bench footage is self-captured.

### 9.1 Shadow-tip method

- Phases: stick planted vertical with the first shadow-tip mark; wait
  interval; second mark; east-west line drawn; user oriented (first mark on
  the left means facing north).
- The 15-minute wait against the 8-second chunk model: the wait is a
  degenerate state rather than a problem. Every chunk during the wait
  classifies identically as "waiting, one mark placed", which monotone plus
  majority smoothing already absorbs. The server step pointer needs a
  wall-clock timer to gate the "place the second mark" advance instead of
  expecting visual change. Bench the active segments in real time; time-lapse
  the wait for benching only, since deployment sees real time.
- Video: none open. YouTube demonstrations
  (https://www.youtube.com/watch?v=2-kaTUISfm4) are standard-license.
  One sunny hour of self-capture yields a full bench.
- Images: FM 21-76 Ch 18 Figure 18-1 (shadow-tip method), PD, in the repo
  PDF; FM 3-05.70 carries its own version. Commons Category:Celestial
  navigation (verified) supplies star compass and Polaris finder charts for
  the star-method knowledge cards.
- Bench feasibility: strong. Stick-planted, one-mark, two-marks, and
  line-drawn are static scene states trivially separable from 8 frames.
- Ticket: Coach the shadow-tip method with a timer-gated wait step

### 9.2 Improvised compass (magnetized floating needle)

- Phases: needle stroked on magnet or silk; float prepared (leaf, paper, or
  cork); needle floated on still water; needle settled on the north-south line.
- Video: none open. University of Hawaii's Exploring Our Fluid Earth activity
  (https://manoa.hawaii.edu/exploringourfluidearth/physical/navigation-and-transportation/wayfinding-and-navigation/activity-floating-magnetic-compass)
  permits free non-profit educational reproduction, usable for ground-truth
  reference; shipping-grade footage is self-captured.
- Images: FM 21-76 Ch 18 improvised-compass text (PD); Commons
  Category:Compasses.
- Bench feasibility: workable. Stroke, float, and settled are distinct; the
  risk sits in separating settled from drifting, which needs an alignment
  judgment the accuracy gate should test explicitly.
- Ticket: Coach the floating-needle improvised compass

### 9.3 Map-and-compass bearing

- Phases: compass edge on the map from position to destination; bezel rotated
  to grid north; declination applied; compass off the map, body rotated until
  the needle is boxed.
- Images: FM 3-25.26 Map Reading and Land Navigation, PD, verified at
  https://archive.org/details/milmanual-fm-3-25.26-map-reading-and-land-navigation
  and https://irp.fas.org/doddir/army/fm3-25-26.pdf. The successor TC 3-25.26
  is on Army Pubs
  (https://armypubs.army.mil/epubs/DR_pubs/DR_c/NOCASE-TC_3-25.26-000-WEB-0.pdf);
  its Part One compass and declination-diagram figures are the best PD figure
  source in this tile.
- Bench feasibility: poor. Bezel numbers and needle boxing are exactly the
  fine-detail class the VLM cannot read at 8-frame, 8-second granularity.
  Ship it as knowledge cards plus phone-magnetometer assist rather than a
  vision-benched procedure. Rank third.
- Ticket: Teach bearing-taking with TC 3-25.26 figures and magnetometer
  assist, no vision bench

### 9.x Structured data

- Sun position for shadow-tip validation and the solar-noon method: avoid the
  NREL SPA C code, whose license forbids redistribution and permits
  non-commercial use only (verified via pvlib issue #9,
  https://github.com/pvlib/pvlib-python/issues/9). Use pvlib's `spa_python`
  reimplementation (BSD-3), `astral` (Apache-2.0), or `suncalc` (BSD-2), all
  offline-friendly and suited to the on-box constraint. NOAA WMM already
  covers declination.
- Night methods: Yale Bright Star Catalog (PD) if a Polaris or Southern Cross
  finder card wants real positions; Commons celestial-navigation diagrams
  otherwise suffice.
- Ticket: Add offline sun-position via astral, replacing any NREL SPA
  dependency

## Tile 10. Signaling and Rescue (FM 21-76 Ch 19)

Premise correction: SARD is not open. Its IEEE DataPort page requires a
subscription, and the CC BY 4.0 that circulates for it covers the paper rather
than the data. HERIDAL and WiSARD are the open aerial-SAR options. All aerial
SAR datasets contain people rather than ground-air symbols; no dataset of
built V or X signals was found, so that bench needs self-collected footage
plus DVIDS b-roll.

### 10.1 Ground-to-air signal build (V, X, or arrow in contrasting material)

- Phases: ground cleared; material gathered; first stroke laid; symbol
  complete at size and contrast.
- Video: no research dataset covers signal building. Bench on hand-shot
  ground truth plus PD military training b-roll. DVIDS
  (https://www.dvidshub.net) carries USAF SERE and USCG training video as US
  government works, PD per https://www.dvidshub.net/about/copyright (verify
  per item, since some hosted content is not DoD). Search terms that return
  results: "SERE training", "water survival training", "signal".
- Images: FM 21-76 Ch 19 figures, PD, already in the repo root as
  FM21-76_SurvivalManual.pdf. AFH 10-644 (USAF SERE Operations, 2017, 644 pp,
  https://irp.fas.org/doddir/usaf/afh10-644.pdf) is PD and carries newer
  signaling figures than FM 21-76. Wikimedia Commons Category:Ground-air
  signals does not exist (404); what exists is
  File:Ground-Air Visual Code for Use by Survivors.png (from the FAA AIM, PD),
  Category:Signalling mirrors (54 members), and Category:Heliographs (125
  members), all verified. FAA Aeronautical Information Manual Ch 6-2 covers
  emergency and body signals as a PD US government work (UNVERIFIED, not
  fetched, though the Commons file above is sourced from it). Civil Air Patrol
  manuals are not automatically PD, since CAP is a congressionally chartered
  nonprofit (UNVERIFIED; treat as closed until checked).
- Structured data: the ground-air emergency code table (V, X, N, Y, arrow with
  meanings) from FAA AIM Table 6-2-2 is small, PD, and worth transcribing
  once. ICAO Annex 12 carries the same table, but ICAO documents are
  copyrighted, so use the FAA version. Morse code table: ITU-R M.1677-1,
  Wikipedia's table (CC BY-SA), or the PD FM 21-76 appendix.
- Bench feasibility: strong, and probably above the knots. This is a
  construction-progress bench rather than motion classification, and 8 frames
  separate cleared ground, gathered material, one stroke, and full symbol
  easily; the finished symbol is a large static high-contrast shape.
- Ticket: Ground-to-air signal build pack with FM 21-76 and AFH 10-644 figures

### 10.2 Signal fire and smoke generator build

- Phases: platform; pyre laid; ignition; green boughs added for smoke.
- Video: DVIDS PD b-roll only.
- Images: FM 21-76 Ch 19 and AFH 10-644, both PD.
- Bench feasibility: good. The phases are coarse and visually distinct, and
  smoke onset is unmistakable at 8-frame sampling.
- Ticket: Signal fire and smoke generator pack benched on DVIDS PD footage
  footage

### 10.3 Signal mirror aiming (demote to reference card)

- The coached action is a two-finger V hand pose plus a flash that the phone
  camera cannot see from the signaler's side. States are sub-resolution hand
  poses with no visible outcome, so expect a poor bench. Ship it as a
  reference card using Commons Category:Signalling mirrors and
  Category:Heliographs rather than a coached procedure.
- Ticket: Ship signal mirror aiming as a reference card, not a coached
  procedure

### 10.x Aerial SAR datasets (adjacent, not for coaching)

HERIDAL (http://ipsar.fesb.unist.hr, about 500 full 4000x3000 aerial images
plus 68k patches, CC BY 4.0, mirrored via Accenture/AIR on GitHub) and WiSARD
(https://sites.google.com/uw.edu/wisard/, arXiv:2309.04453, about 56k visual
and thermal UAV images) suit an added "is the signal visible from above"
check rather than step coaching.

## Tile 11. Environments (FM 21-76 Ch 13-16)

Cold Weather and Sea carry the coachable material. Desert and Tropical are
knowledge plus region selection, where the camera does scene classification
(terrain and cloud reading) rather than coaching.

### 11.1 Quinzee or snow trench build (Cold Weather)

- Phases: bare ground; snow mound; stick depth-gauges set; entrance hole;
  hollowed interior with a vent hole. The sinter wait produces no visual
  change, so merge it into the mound phase, echoing the bowline merge lesson.
- Video: no winter-shelter research dataset exists. Instructional quinzee
  footage exists (Scout Life, AMC, MyNorth, YouTube) with no confirmed open
  license; a CC-BY YouTube filter may yield usable builds (UNVERIFIED).
  Cold-weather military training b-roll on DVIDS ("arctic survival", "cold
  weather survival") is PD, though specific snow-shelter build sequences are
  UNVERIFIED.
- Images: FM 21-76 Ch 13-16 figures (PD, local PDF). USAP field manuals are
  free PDFs on usap.gov (Continental Field Manual 2024,
  https://www.usap.gov/usapgov/travelAndDeployment/documents/Continental-Field-Manual-2024_ProgramInformation.pdf)
  with snow-shelter chapters; produced under NSF contract, so PD status is
  UNVERIFIED even though the files download freely. AFH 10-644 arctic chapters
  (PD) carry better line art than FM 21-76. Wikimedia Commons
  Category:Quinzhee exists (6 files); Category:Snow shelters does not (404),
  with nearby coverage under Category:Snow caves and Category:Igloos (those
  two names individually UNVERIFIED).
- Bench feasibility: strong. The phases are large-scale scene changes well
  within 8-frame stateless classification.
- Ticket: Quinzee snow shelter pack with USAP and AFH figures and DVIDS bench
  footage

### 11.2 HELP position and improvised flotation (Sea)

- This is one body-pose state rather than a step sequence, so the bench
  reduces to pose verification.
- Video: DVIDS USCG water survival training, PD, verified examples at
  https://www.dvidshub.net/video/707105/coast-guard-members-conduct-water-survival-training
  and https://www.dvidshub.net/video/149373/coast-guard-unit-conducts-water-survival-training.
  archive.org hosts historical USCG and Navy sea-survival films (PD, specific
  titles UNVERIFIED).
- Images: AFH 10-644 open-sea chapter (PD); USCG boating-safety HELP and
  huddle figures are PD as USCG works (specific figure URLs UNVERIFIED).
- Bench feasibility: workable but shallow. Cosmos can judge the pose, but a
  one-step procedure gives the step pointer almost nothing to track.
- Ticket: HELP position pose check benched on DVIDS USCG water survival video

### 11.x Structured data

- NWS wind chill chart and formula (weather.gov/safety/cold-wind-chill-chart),
  PD as a NOAA work. The formula is published, so generate the table rather
  than scrape it (exact URL UNVERIFIED).
- Frostbite time-to-onset ships inside the NWS wind chill chart; deeper tables
  sit in Army TB MED 508 (PD, UNVERIFIED).
- Cloud reading: SWIMCAT is already in use; the CCSN cloud-type dataset (11
  classes, about 2,543 images) is the usual complement (UNVERIFIED).
- Ticket: Generate the NWS wind chill and frostbite-onset table as a TSV

## Tile 12. Man-Made Hazards (FM 21-76 Ch 23)

### 12.1 PPE donning and doffing (strongest bench candidate across tiles 10-12)

- Phases: each step flips a whole-garment visual state (no gown to gown, bare
  face to mask to face shield), in a CDC-defined order.
- Video: R2PPE (Resuscitation Room PPE dataset, Scientific Data 2025,
  https://www.nature.com/articles/s41597-024-04355-0) holds 26 full simulation
  videos, 10,034 images, and 123,751 boxes across 17 PPE adherence and
  nonadherence classes (eyewear, mask, gown, gloves), shot in a real emergency
  department at Children's National. Hosted at Zenodo DOI
  10.5281/zenodo.13851664 (verified: 6.0 GB video, 34.5 GB images,
  annotations). The Zenodo record is CC BY-NC 4.0; the CC BY 4.0 on the paper
  is the article license. NC suits benching, and the manifest should flag it.
  CDC PPE training video is PD as a CDC work: OneLab REACH job aids
  (https://reach.cdc.gov/jobaid/donning-and-doffing-ppe-clinical-laboratories-removing-gown-and-gloves-together)
  and the Marburg PPE training series
  (https://www.cdc.gov/marburg/hcp/training/ppe-part-2-putting-on-and-taking-off-ppe-1.html)
  are verified. The Ebola-era set at cdc.gov/vhf/ebola/hcp/ppe-training/ is
  referenced but UNVERIFIED live. OpenWHO PPE videos are CC BY-NC-SA 3.0 IGO;
  the ShareAlike clause makes them awkward for pack inclusion, so bench only.
- Images: CDC PHIL (https://phil.cdc.gov), verified FAQ: most images are PD,
  each marked individually as Public Domain or Copyright Protected, credit CDC
  plus photographer. CDC PPE poster and fact-sheet PDFs carry sequence
  diagrams, PD, for example
  https://www.cdc.gov/marburg/media/pdfs/2024/05/HCW-7-PPE-Part-2-How-to-Put-On-and-Remove-PPE-for-Marburg-508-c.pdf.
- Bench feasibility: the best in these three tiles. Whole-garment state flips
  survive 8-frame sampling robustly, and R2PPE supplies real multi-person
  footage with per-frame adherence labels as ground truth.
- Ticket: PPE donning-doffing pack benched on R2PPE with CDC PD reference
  stills

### 12.2 Sealing a room (shelter-in-place)

- Phases: bare window or door; plastic sheet placed; perimeter taped.
- Video: no dataset, so reference-only against Ready.gov steps.
- Images: Ready.gov and FEMA shelter-in-place graphics, PD, already in the
  project's source set. Army CBRN manuals (FM 3-11 family) carry PD decon
  figures (figure inventory UNVERIFIED).
- Bench feasibility: good. Coarse visible states, comparable to the signal
  build.
- Ticket: Shelter-in-place room-sealing pack from Ready.gov and FEMA steps

### 12.3 HazMat placard recognition (detection, not coaching)

- The camera reads a placard and the server looks up the ERG guide. This is
  single-frame recognition, so it needs a detection-accuracy gate rather than
  a step-state bench.
- Structured data: PHMSA publishes ERG2020 data files
  (https://www.phmsa.dot.gov/training/hazmat/erg/erg2020-data-files; the page
  exists and returned 403 to an automated fetch, likely bot-blocking; Excel
  format), PD as a US DOT work. PubChem mirrors ERG2024 as a browsable UN
  number to guide number to material name to CID table at
  https://pubchem.ncbi.nlm.nih.gov/erg/ (verified), which is the better parse
  target for the current edition. CAMEO Chemicals
  (https://cameochemicals.noaa.gov, verified) is a NOAA and EPA work with
  per-chemical response datasheets keyed by UN/NA and CAS, including ERG guide
  text and protective-action information, downloadable via CAMEO Data Manager.
  Protective-action distances are the ERG green pages, included in the data
  files.
- Placard image sets: HAZMAT13 (https://github.com/mrl-amrl/HAZMAT13,
  verified: 13 classes, 1,685 original and 52,845 augmented images, MIT
  license, Google Drive download) is the cleanest and the only one with a
  clear open license. Roboflow "Hazmat Placards" by Digital ERG (2,563 images,
  https://universe.roboflow.com/digital-erg/hazmat-placards) exists with an
  UNVERIFIED per-dataset license. VisInt-VHM (10k highway images, PMC9029883)
  has UNVERIFIED access terms.
- Ticket: ERG lookup table from PubChem ERG2024 with a HAZMAT13 placard
  recognition gate

### 10-12 verification note

Fetched and confirmed: SARD (paywalled), HERIDAL page references, WiSARD,
R2PPE paper and Zenodo record, HAZMAT13 repository, PubChem ERG, CDC PHIL FAQ,
DVIDS copyright page, USAP field manual PDFs, and the Commons categories
(Quinzhee, Signalling mirrors, Heliographs exist; Ground-air signals and Snow
shelters do not), AFH 10-644 PDF. Marked UNVERIFIED: CAP manual PD status,
CC-licensed quinzee footage, TB MED 508, CCSN, Roboflow and VisInt-VHM
licenses, the live Ebola PPE video page, and the exact NWS chart URL.

## Coverage summary

Strong open data (a real dataset or a PD figure set plus a workable bench):

- Tile 2 Shelter. EPIC-Tent is already downloading, EgoProceL re-annotates it
  with key-steps, and COIN PitchATent cross-checks from a second viewpoint.
  FM 21-76 Ch 5 writes the lean-to build as an ordered list already.
- Tile 12 Man-Made Hazards. R2PPE gives 26 simulation videos with per-frame
  PPE adherence labels, CDC supplies PD reference stills, and the ERG plus
  CAMEO tables are the best structured data found anywhere in this survey.
- Tile 1 Survival Medicine. COIN BandageHead and BandageDogPaw bench wound
  care, and FM 4-25.11, TC 4-02.1, and STP 21-1-SMCT give PD figures plus
  numbered performance measures. Tourniquets fall back to a single PD DVIDS
  demonstration clip, since Trauma THOMPSON turned out to be unobtainable.
- Tile 5 Food. COIN CleanFish carries 50 videos at exactly the right step
  granularity, and FM 21-76 Ch 8 has verified figure numbers for every trap.
- Tile 6 Poisonous Plants. No coaching, but the richest structured data after
  mycomorphbox: NC State Plant Toolbox poison fields, Dr. Duke's USDA CSVs,
  and the iNaturalist similar_species confusion matrix.

Reference-only (PD figures exist, no open video, and this project films nothing):

- Tile 3 Fire, Tile 4 Water, Tile 8 Tools and Cordage, Tile 9 Direction
  Finding, Tile 10 Signaling, Tile 11 Environments. Every one of these has
  good PD figures in FM 21-76, FM 5-125, AFH 10-644, or TC 3-25.26, and none
  has a research video dataset. COIN's 180-task taxonomy and CrossTask's 83
  tasks were both parsed and confirmed empty for lashing, cordage, fire lays,
  water procurement, navigation, and signal building.

Thinnest:

- Tile 7 Dangerous Animals is identification-only except for tick removal, and
  its best structured source (WHO snakebite platform) has unstated reuse
  terms. Tile 11's Desert and Tropical modules have no coachable procedure at
  all.

Three best next items after knots:

1. Fish cleaning (Tile 5). The only unexploited procedure with research
   ground truth already annotated at the granularity the bowline bench proved
   works: COIN CleanFish, 50 videos, five whole-frame-distinct steps.
2. Tepee fire lay (Tile 3). The procedure is already shipped as a
   follow-along with `watchable: false`; without open bench footage it stays there
   to flip the flag, and its phases are scene-scale. Lowest work per shipped
   capability.
3. Square lashing (Tile 8). Same rope-on-pole visual class the knot bench
   already cleared, with verified FM 5-125 figures 2-36 and 2-37 for per-step
   references, so it reuses both the bench harness and the figure pipeline.

Runner-up worth noting: PPE donning and doffing (Tile 12) is probably the
single best-benching procedure surveyed, since each step flips a whole-garment
state and R2PPE supplies labeled footage. It ranks below the three above only
because it sits furthest from the wilderness core of the app.

## Recurring license traps

Read this section against the inference-only framing at the top of the
document. "All bench, none ship" is the normal case rather than a trap, since
no video dataset ships inside the app and none is trained on. The two entries
that constrain real work are COIN's signed agreement, which bars testing a
commercial system, and Trauma THOMPSON, which has no access path.

- Non-commercial encumbrance: EPIC-Tent (NCGL v2), R2PPE (CC BY-NC 4.0 on the
  Zenodo record, not the CC BY 4.0 on the paper), EPIC-KITCHENS-100, FishBase,
  T3DB, wikiHow, OpenWHO (CC BY-NC-SA 3.0 IGO). All bench, none ship.
- Signed-agreement access: COIN, Assembly101, Ego-Exo4D, OpenAnimalTracks.
- No obtainable access path found at all: Trauma THOMPSON. It is published and
  its 2025 challenge is open, but no public download exists, the article is
  login-gated, and the DOI in PRD 6.3 (10.7910/DVN/V5BTRU) does not resolve to
  a readable Dataverse record. Existence is not access; the PRD cites it as
  though it were in hand.
- No stated license at all: NC State Plant Toolbox, Cornell Plants Poisonous
  to Livestock, Clinical Toxinology Resources, EgoEMS README, Civil Air Patrol
  manuals, USAP field manuals.
- Paywalled despite reputation: SARD (IEEE DataPort subscription; the CC BY
  4.0 that circulates covers the paper).
- Commons categories assumed by tile plans that do not exist: Solar stills,
  Animal traps, Fish filleting, Snares, Lashings, Ground-air signals, Snow
  shelters, Bandaging, Fire making.

## Verified license verdicts

Each item was checked against the licence text at the source, not inferred
from reputation. SHIP means the asset can travel inside a pack; BENCH means it
can be downloaded and measured against locally, which is all the inference
coach needs from video. Read these with the inference framing at the top: for
video, BENCH is the whole requirement.

| Asset | Verdict | Evidence |
| --- | --- | --- |
| EPIC-Tent | BENCH | Non-Commercial Government Licence v2. Attribution string "Contains information licensed under the Non-Commercial Government Licence v2.0" is mandatory. Unfunded demo fine, commercial app not. |
| R2PPE | BENCH | Article is CC BY 4.0 with no data-license statement; the Zenodo record of record is CC BY-NC 4.0 (SPDX cc-by-nc-4.0 in DataCite). The NC licence governs the data. |
| Trauma THOMPSON | BENCH, gated, unobtainable so far | Grand Challenge path requires agreeing not to "distribute, copy, or reproduce any of the individual images or videos". The Dataverse record is tagged CC BY 4.0 and simultaneously restrictedAccess. No download path reached from here. |
| EgoEMS | BENCH | Dataverse record is CC BY-NC-ND 4.0 plus restrictedAccess. ND blocks reformatting into pack form; benching is unaffected. |
| CDC PHIL | SHIP, per-image check | Each image is individually marked Public Domain or Copyright Protected. For PD: credit the institution and contributor, no fixed string published; use the image's own Content Provider field. |
| DVIDS | SHIP, per-item check | US-government-employee works are not eligible for US copyright. Attribution is requested, not required. The binding rule is non-endorsement. Some items are third-party copyrighted regardless of any notice. |
| USAP field manuals | SHIP text, strip figures | NSF policy states works are government-authored or prepared under contracts giving NSF the right to place text in the public domain. NSF separately disclaims visual media, and the manuals credit named artists and reprint third-party material. |
| Civil Air Patrol pubs | UNUSABLE | Not PD: 36 U.S.C. 40306 gives CAP exclusive copyright, the library carries an all-rights-reserved notice, and CAPR 1-2 permits only unaltered reproduction. Excerpting into packs breaches it. Use FM 21-76 and AFH 10-644. |
| NC State Plant Toolbox | SHIP fields only | No terms-of-use, copyright notice, or robots.txt published; field values are uncopyrightable facts under Feist. Their one licence statement covers photographs, so ship no images and no prose. Rests on absence of a restriction, not granted permission. |
| iNaturalist similar_species | BENCH | About 1 request per second and roughly 10k per day, explicitly "not meant to be a way to download data in bulk". Terms bar using iNaturalist data to train ML models for commercial purposes; content defaults to CC BY-NC. |
| COIN | UNUSABLE if LifeKit is commercial | The signed agreement bars use for "Testing commercial systems" and bars redistribution. Annotations are CC BY-NC by Meitu and Tsinghua; the videos belong to individual YouTube uploaders and nobody has cleared them. |
| PHMSA ERG + PubChem mirror | SHIP | Both are US federal works. Current edition is ERG2024, but PHMSA publishes structured data files for 2020 only, so use the PubChem ERG2024 mirror as the machine-readable source. Unresolved: the ERG is a joint US, Transport Canada, and SCT work, and Canadian Crown copyright has no US-style exemption. |

Two consequences worth carrying into the tickets. COIN's "testing commercial
systems" clause is the only licence here that blocks a bench outright, and it
sits under the top-ranked next item (#112 fish cleaning), so that ticket needs
a decision on LifeKit's commercial posture or a substitute corpus. Every other
video licence permits the measurement the inference coach actually performs.
