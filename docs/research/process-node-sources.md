# PROCESS node sources, by tile

Scope: the nine PROCESS tiles in `docs/prd.md` section 1.3. For each tile, the procedures worth
authoring first, the step source, whether that source carries completion criteria, where the
per-step figure comes from, and the structured data that lets a node be checked instead of
displayed.

Every source below was fetched. Anything not fetched is marked UNVERIFIED.

## Findings that apply to every tile

### FM 21-76 figures: extractable, but not by `pdfimages`

Measured on the local copy `FM21-76_SurvivalManual.pdf` (233 pages).

- `pdfimages -list` reports 4,439 images, and every one is a one-pixel-tall inline RGB scanline
  strip. The figures are stored as horizontal strips, so `pdfimages -all` returns 4,439 slivers
  and no figure. Extraction has to render the page and crop.
- `pdftoppm -r 150` renders a figure at roughly 690 x 480 px; `-r 600` gives roughly 2,700 x
  1,900 px. Adequate for a phone-sized reference pane.
- Every figure sits inside a drawn black rectangle with a bold serif caption underneath
  ("Figure 6-7. Belowground still."). The rectangle is a reliable crop target; the caption is
  bitmap, not text.
- That bitmap caption explains the count discrepancy. `pdftotext` finds only 5 strings matching
  `Figure N-M.` because the captions are pixels. The 124 unique in-text parenthetical references
  (`(Figure 5-1)`) are text and are the usable index. Joining the text layer into one line first
  matters: references broken across a line, and plural forms such as "Figures 19-4 and 19-5",
  are missed otherwise. Joined, the local PDF yields 131 unique referenced figure numbers.
  Chapter lists for the PROCESS chapters:

  | Ch | in-text figure references |
  | --- | --- |
  | 4 | 4-1 .. 4-7 |
  | 5 | 5-1 .. 5-9, 5-11 .. 5-15 |
  | 6 | 6-1 .. 6-9 |
  | 7 | 7-1 .. 7-8 |
  | 12 | 12-1 .. 12-11 |
  | 13 | 13-1, 13-2 |
  | 14 | 14-1 |
  | 15 | 15-1 .. 15-7 |
  | 16 | 16-1, 16-2, 16-4 .. 16-11, 16-13, 16-14, 16-17 .. 16-19 |
  | 17 | 17-1 .. 17-8 |
  | 18 | 18-1 .. 18-4 |
  | 19 | 19-1, 19-2, 19-4 .. 19-9 (19-3 is the MK-3 mirror plate, reference line-broken) |
  | 23 | 23-1 |

- A figure does not always sit on the page that references it. Figure 4-6 is referenced on
  printed page 28 and drawn on page 29. An extractor keyed on the reference page will miss
  figures; key it on caption OCR or on the nearest following rectangle.
- Printed page number and PDF page index agree in this copy, so `pdftoppm -f N` where N is the
  printed "Page N of 233" is correct.

### FM 21-76 figures split into two kinds, and only one supports per-step nodes

Inspected by rendering pages 28, 39, 60, 67, 69, 127, 195, 206.

**Panelized, numbered, per-step.** These are directly usable as one figure per node.

- Figure 12-8, "Making lines from plant fibers", p127. Three panels captioned in the plate:
  "1 Secure firmly at knot. / 2 Twist both strands clockwise. / 3 Twist one strand around the
  other counterclockwise." One crop per node, no other source needed.
- Figure 18-1, "Shadow-tip method", p195. Three panels: "1 Mark the shadow's tip. / 2 Mark the
  new position and draw a line through the two marks. / 3 Stand with the first mark to your left
  and the second mark to your right, you are now facing north."
- Figure 19-7, "Body signals", p206. Eleven captioned panels, one per signal.
- Figure 19-6, "Ground-to-air emergency code", p206. A five-row table, one row per symbol.

**Single end-state plate.** These show the finished article, not the steps, so a per-step node
needs a second figure source or a locally drawn diagram.

- Figure 5-1 poncho lean-to (p39), and by inspection the rest of Ch 5.
- Figure 6-7 belowground still (p60), figure 6-6 aboveground still.
- Figure 7-7 fire-plow (p69), figure 7-8 bow and drill.
- Figure 7-5 (p67) is four panels, but they are four fire lay *types* (tepee, lean-to,
  cross-ditch, pyramid), not four steps. Good as the figure on a choose-your-lay node.
- Ch 17 crossing and raft figures.

### FM 21-76 text carries steps, not completion criteria

The procedures are unnumbered bullet lists. Figure 6-7's still is ten bullets; figure 5-1's
lean-to is a bullet run; figure 4-6's traction splint is six bullets. The bullets are imperative
and mostly observable ("Lower the plastic sheet into the hole until it is about 40 centimeters
below ground level ... Make sure that the cone's apex is directly over your container"), but no
step states a pass/fail test. Completion cues have to come from a second source or be authored.

### Licence: the local PDF is a reprint

The page header reads "FM 21-76 US ARMY SURVIVAL MANUAL / Reprinted as permitted by U.S.
Department of the Army". The underlying work is a US Government work and is public domain under
17 U.S.C. 105. The reprint adds no protectable authorship to the government text or figures.

### Civil Air Patrol is unusable

36 U.S.C. 40306, fetched from https://www.law.cornell.edu/uscode/text/36/40306, reads in full:
"The corporation has the exclusive right to use the name 'Civil Air Patrol' and all insignia,
copyrights, emblems, badges, descriptive or designating marks, words, and phrases the corporation
adopts. This section does not affect any vested rights." (Pub. L. 105-225, 112 Stat. 1332.)

CAP is a federally chartered private corporation, not a federal agency, and the statute vests
copyright in the corporation. CAP ground team, search-and-rescue, and emergency services
publications are therefore off limits for text or figure reuse, however well they fit the
Signaling and Direction Finding tiles. Do not author from them.

### Correction to the brief: FM 21-76 figures are already extracted, on Commons

`https://commons.wikimedia.org/wiki/Category:United_States_Army_Field_Manual_21-76` was fetched and
holds 33 individually cropped figure images, each sourced to "FM 21-76: Survival; Headquarters,
Department Of The Army; 5 June 1992" and tagged PD-USGov. Seventeen of the figures the PROCESS
tiles need are already there, at 400 to 600 px. A sibling category
`Category:United_States_Army_Field_Manual_21-76-1` was fetched and holds 13 more from the 1999
multiservice SERE edition.

So the pipeline has two figure paths, and the cheap one is available today: pull the Commons
crops for figures that exist there, and render-and-crop the local PDF only for the gaps.

### FM 3-05.70 carries a distribution restriction, so do not ship its figures

`https://commons.wikimedia.org/wiki/File:FM_3-05.70_(FM_21-76)_Survival_-_May_2002.pdf` was
fetched. Its figures are better than FM 21-76's (659 px, 150 ppi, 8-bit colour, against FM
21-76's 450 px, 96 ppi, 4-bit indexed, which visibly posterizes). Its cover reads "DISTRIBUTION
RESTRICTION: Distribution authorized to U.S. Government agencies and their contractors only to
protect technical or operational information ... This determination was made on 5 December 2003."

That is not a copyright problem, it is a distribution problem, and it still bars redistributing
the figures inside a shipped app. `docs/prd.md` section 4.3 names FM 3-05.70 as a figure source
for survival procedures. That line needs revisiting. Keep FM 3-05.70 as an internal cross-check
of the text and ship FM 21-76 1992 art.

### The only source with real completion criteria is STP 21-1-SMCT, and it covers first aid only

STP 21-1-SMCT (September 2012) was extracted from `https://asktop.net/wp/download/10/stp21_1.pdf`
and its full task list searched. There is no shelter task, no fire task, and no survival-craft
task. The GO/NO-GO format exists for first aid, land navigation, and CBRN, and nowhere else that
this product needs. The manual states the pattern:

> "The Performance Measures subsection identifies the criteria for acceptable task performance.
> The Soldier is rated (GO/NO GO) on how well he or she performs specific actions or produces
> specific products ... the Soldier must score a GO on all or specified performance measures to
> receive a GO on the task and be considered trained."

For the tiles STP does not cover, completion criteria have to be authored. FM 21-76 supplies the
raw material as embedded dimensions, which is the closest thing to a measurable criterion in the
source, and several are checkable by a camera against a scale reference.

---

## Tile 2: Shelter (Ch 5)

### Procedure 1: poncho lean-to (figure 5-1, printed p39)

- **Step source.** FM 21-76 Ch 5, five imperative bullets. Public domain, US Government work,
  cover states "approved for public release; distribution is unlimited". Cite the Commons scan
  `https://commons.wikimedia.org/wiki/File:FM_21-76_Survival_June_1992.pdf` rather than the local
  reprint, whose own cover adds editorial framing you do not want in the licence trail.
- **Completion cues.** None stated. Authorable from the FM's own dimensions: rope "2 to 3 meters",
  three stakes "about 30 centimeters", trees "2 to 3 meters apart", tie "about waist high", drip
  stick "about a 10-centimeter stick ... about 2.5 centimeters from the grommet". The siting rule
  is checkable and worth a node of its own: "Before selecting the trees you will use or the
  location of your poles, check the wind direction. Ensure that the back of your lean-to will be
  into the wind."
- **Figure.** Commons `Poncho lean-to.jpg`, 433 x 254, PD-USGov,
  `https://upload.wikimedia.org/wikipedia/commons/6/66/Poncho_lean-to.jpg`. One end-state plate
  for the whole procedure. Commons has no per-step photography for this build; `Category:Lean-to`
  was fetched, exists, holds 42 files, and is all permanent trail shelters, not poncho lean-tos.
- **Structured data.** NWS wind chill, formula below, gates shelter urgency.
- **Verdict.** Ready to author today, one shared figure across five step nodes.

### Procedure 2: debris hut (figure 5-11, printed p47)

- **Step source.** FM 21-76 Ch 5, eight strictly ordered bullets, each producing a visible
  structural layer. The FM singles it out: "For warmth and ease of construction, this shelter is
  one of the best."
- **Completion cues.** None stated, but two bullets are directly measurable: insulating material
  "at least 1 meter thick, the thicker the better", and "Place a 30-centimeter layer of insulating
  material inside the shelter."
- **Figure.** Commons `Debris hut.gif`, 450 x 410, PD-USGov,
  `https://upload.wikimedia.org/wikipedia/commons/e/e9/Debris_hut.gif`. End-state plate.
  `Category:Shelter construction` was fetched, exists, and holds only 13 files, mostly cyclone
  shelters and prefabs. No help.
- **Structured data.** The 1 m and 30 cm thicknesses are the check. FM 21-76 gives no R-values.
  Its one insulation heuristic: "When at rest, you lose as much as 80 percent of your body heat to
  the ground."
- **Verdict.** Ready to author today. The thickest-step check is the best camera-checkable step in
  the whole Shelter tile.

### Procedure 3: tree-pit snow shelter (figure 5-12, printed p48)

- **Step source.** FM 21-76 Ch 5, four bullets. Thin and seasonal, so author it third.
- **Figure.** Commons `Tree-pit snow shelter.jpg`, 433 x 298, PD-USGov,
  `https://upload.wikimedia.org/wikipedia/commons/1/19/Tree-pit_snow_shelter.jpg`.
  `Category:Snow caves` was fetched, exists, 24 files, includes schematics and
  `Installation of snow blocks for snow cave.jpg` showing construction in progress.
- **Verdict.** Ready, low priority.

**Do not start with a one-man snow trench.** FM 21-76 has no such procedure. Ch 15 has a Snow
Trench Shelter under figure 15-4, and it is three sentences of prose with no steps. Note also that
figure 15-4 is a single plate covering four different cold-weather shelters (snow cave, snow
trench, snow block and parachute, and a molded dome), panelizable per shelter type but not per
step. TC 3-97.61 Military Mountaineering is the likely home for a step-granular snow trench and
could not be fetched from any mirror: UNVERIFIED, and an open item.

---

## Tile 3: Fire (Ch 7)

### Procedure 1: fire site preparation and the Dakota fire hole (figures 7-1 and 7-2, printed p64-65)

- **Step source.** FM 21-76 Ch 7. Site prep is about three steps; the Dakota fire hole is exactly
  three bullets, all physically observable, and the upwind connecting-hole step is a genuine
  correctness check rather than a cosmetic one.
- **Completion cues.** None stated. Site prep carries the single most checkable criterion in the
  tile: "Clear a circle at least 1 meter in diameter."
- **Figure.** Commons `Types of fire walls.jpg` 450 x 325 and `Dakota fire hole.jpg` 608 x 445,
  both PD-USGov. Commons has no Dakota fire hole photograph at all; a search across namespaces
  returned nothing, so the FM plate is the only asset.
- **Structured data.** NFDRS adjective fire-danger classes, fetched from
  `https://www.fs.usda.gov/r05/laketahoebasin/fire/prevention/national-fire-danger-adjective-rating-system`,
  five classes Low through Extreme with verbatim descriptions. Qualitative, not computable
  offline, so it gates the node rather than checking it. No national machine-readable burn-ban
  feed exists; bans are county and state issued, which is the wrong shape for an offline app.
  Treat burn-ban status as a user-attested precondition on this node.
- **Verdict.** Ready to author today. Best first Fire walk.

### Procedure 2: fire lays, tepee and pyramid (figure 7-5, printed p66-67)

- **Step source.** FM 21-76 Ch 7. Four lays share one figure: tepee 3 steps, lean-to 4, cross-ditch
  3, pyramid 4. The pyramid is highly geometric, with alternating right-angle layers each smaller
  than the one below, so it is the most visually checkable. Match node titles to the FM's own
  terms: the FM calls the log-cabin lay "Pyramid".
- **Completion cues.** None stated. Usable dimensions: cross-ditch cross "about 30 centimeters in
  size ... 7.5 centimeters deep"; lean-to green stick "at a 30-degree angle", pointed "in the
  direction of the wind".
- **Figure.** Commons `Methods of laying fires.jpg`, 519 x 418, PD-USGov,
  `https://upload.wikimedia.org/wikipedia/commons/c/c6/Methods_of_laying_fires.jpg`. Rendering page
  67 confirms it is four captioned panels, but they are four lay *types*, not four steps. Use it as
  the figure on a choose-your-lay node and crop one panel per branch.
- **Verdict.** Ready to author today, as a branch node plus per-lay step runs.

### Procedure 3: bow and drill (figure 7-8, printed p69-70)

- **Step source.** FM 21-76 Ch 7. The richest procedure in the tile: four component-build
  sub-procedures (socket, drill, fire board, bow), each with dimensions, then a seven-step use
  sequence. The FM warns "Primitive fire-building methods are exhaustive and require practice to
  ensure success", which belongs on the scope banner.
- **Completion cues.** None stated, but the component dimensions are unusually complete and all
  camera-measurable: drill "about 2 centimeters in diameter and 25 centimeters long", fire board
  "about 2.5 centimeters thick and 10 centimeters wide", depression "about 2 centimeters from the
  edge", bow "about 2.5 centimeters in diameter", bowstring "without any slack".
- **Figure.** Commons `Bow and drill.png`, 408 x 309, PD-USGov. End-state plate only.
  **This is the one procedure where Commons genuinely fills the per-step gap.**
  `https://commons.wikimedia.org/wiki/Category:Bow_drill_(fire-starter)` was fetched, exists, holds
  32 files, and contains an actual sequential step series (the "Feuermachen" numbered images) plus
  technique photographs from Black Moshannon State Park. Per-file free licences, check each.
  `Category:Fire-starting` was fetched, exists, 83 files across 9 subcategories including
  Feather sticks (4) and Fire plow (6); it covers tinder preparation, which fills the gap left by
  figure 7-4 not being on Commons.
- **Verdict.** Ready to author today, and the only Fire procedure that can carry a distinct figure
  on every step.

Figure 7-4, the tinder/kindling/fuel types plate, is the one gap that matters and is not on
Commons. Render it from the local PDF, printed page 64.

---

## Tile 4: Water (Ch 6 + 17)

### Procedure 1: belowground solar still (figure 6-7, printed p60)

- **Step source.** FM 21-76 Ch 6, eleven imperative bullets, one per node. Public domain. The
  aboveground still (figure 6-6, p58) is six bullets and makes a good second walk.
- **Completion cues.** No scored criteria, but the geometry step carries three checkable conditions
  in one sentence: "Lower the plastic sheet into the hole until it is about 40 centimeters below
  ground level. It now forms an inverted cone with the rock at its apex. Make sure that the cone's
  apex is directly over your container. Also make sure the plastic cone does not touch the sides of
  the hole because the earth will absorb the condensed water." Cone formed, apex over container,
  plastic clear of walls. That is the best camera-checkable step found anywhere in FM 21-76.
- **Figure.** Already on Commons, pre-cropped, PD-USGov: `Belowground still.jpg`,
  `Aboveground solar water still.jpg`, `Belowground still to get potable wather from polluted
  water.jpg` (figure 6-8), `Water filtering systems.jpg` (figure 6-9). Local render path if a
  higher resolution is wanted: figures 6-6 through 6-9 are on printed pages 59, 60, 61, 62.
  `Category:Solar_water_treatment` was fetched, exists, 18 files, mixed PD and CC BY-SA, adds
  SODIS pictograms. End-state plates only, so the eleven step nodes share one figure.
- **Structured data.** Yield "about 24 hours to get 0.5 to 1 liter of water", "You will need at
  least three stills to meet your individual daily water intake needs", daily requirement "a
  minimum of 2 liters of water each day". Dimensions: hole 1 m across by 60 cm deep, sheet 40 cm
  below grade, polluted-water trough 25 cm from the lip, 25 cm deep, 8 cm wide.
- **Verdict.** Ready to author today.

### Procedure 2: making water safe to drink

- **Step source.** Four stacked public domain sources, all fetched. FM 21-76 Ch 6 (printed p61);
  EPA `https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water`;
  CDC Yellow Book 2026 "Water Disinfection for Travelers" via the NCBI mirror
  `https://www.ncbi.nlm.nih.gov/books/NBK620923/`, whose footer states "This publication is in the
  public domain" (cdc.gov itself returns 403 to fetchers); TC 4-02.3 *Field Hygiene and
  Sanitation*, 6 May 2015, appendix A, cover "Approved for public release; distribution is
  unlimited".
- **Completion cues.** The single best completion-cue source found in this whole survey.
  STP 21-1-SMCT (1990), task 081-831-1043 *Practice Preventive Medicine*, evaluation guide,
  verbatim: "3. Purifies water with iodine tablets. P F / a. Inspects the iodine tablets for a
  physical change (for example, inspects to ensure tablets are steel gray, and are not crumbled or
  stuck together). / b. Fills canteen with clean water. / c. To a one-quart canteen filled with
  clear water, adds one tablet. ... / f. Loosely tightens canteen cap and waits five minutes. /
  g. Shakes canteen, allowing leakage to rinse the threads around the neck. / h. Tightens the cap
  and waits an additional 25 minutes before using." Measure (a) is a visual inspection with a
  stated pass state, which is exactly the node shape this product needs.
  Two cautions. The current STP 21-1-SMCT (20 Nov 2025) has no water-purification task at all; a
  search of the 2017 full text for iodine, chlorine, purify and Lyster returns nothing. And the
  dose changed between editions: 1990 says one tablet per quart, the 2003 edition (task
  081-831-1053) says two. Ship the later figure.
  EPA adds a sensory cue: "Stir and let stand for 30 minutes. The water should have a slight
  chlorine odor."
- **Figure.** Figure 6-9 covers the improvised filter. Chemical dosing has no good FM figure and
  the TC 4-02.3 tables should be native UI, not images. `Category:Water_purification_tablets` was
  fetched, exists, 13 files, heavily US DoD PD.
- **Structured data.** This node can be genuinely checked rather than displayed.
  - EPA boiling: "Bring water to a rolling boil for at least one minute. At altitudes above 5,000
    feet (1,000 meters), boil water for three minutes." FM 21-76 disagrees (1 minute at sea level
    plus 1 minute per additional 300 m, or 10 minutes anywhere). Ship EPA's rule and cite FM as
    the field fallback.
  - CDC physical basis: 60 C (140 F) is effective at 30 minutes contact; "heat water until first
    sign of simmering ... leave the container covered for 30 minutes"; at about 4,900 m the
    boiling point is about 83 C.
  - EPA bleach per gallon of clear water: 8 drops of 6 percent or 6 drops of 8.25 percent; 2 gal
    16 drops (1/4 tsp) of 6 percent; 4 gal 1/3 tsp of 6 percent. "Double the amount of bleach if
    the water is cloudy, colored, or very cold." Contact time 30 minutes.
  - FM 21-76 iodine: 2 percent tincture, 5 drops clear, 10 drops cloudy or cold, stand 30 minutes.
  - TC 4-02.3 military chlorination: target 5 mg/L residual after a 10-minute contact period, then
    stand an additional 20 minutes; "A contact time of at least 30 minutes is required for
    satisfactory water disinfection." Iodine tablets 2 per quart, 4 per two-quart, 30 minutes.
  - CDC Yellow Book table 1.8.2 filter pore sizes: viruses 0.03 um, needs an ultrafilter, ideally
    0.01 um or finer; enteric bacteria 0.5 x 2-8 um, 0.2 to 0.4 um microfilter; Cryptosporidium
    oocysts 4-6 um, 1 um or finer; Giardia cysts 8 x 19 um, 3.0 to 5.0 um; helminth eggs 30 x 60 um.
  - Cryptosporidium is the branch that matters: CDC states it is "poorly inactivated by chlorine-
    or iodine-based disinfection at practical concentrations, even with extended contact times",
    and that chlorine dioxide works but its "tablets and drops require prolonged contact time of
    several hours".
  - EPA national primary drinking water regulations, fetched: nitrate 10 mg/L, nitrite 1 mg/L,
    arsenic 0.010 mg/L, lead action level 0.010 mg/L, copper action level 1.3 mg/L, uranium
    30 ug/L, chlorine MRDL 4.0 mg/L, chlorine dioxide MRDL 0.8 mg/L, gross alpha 15 pCi/L,
    radium-226 plus 228 combined 5 pCi/L.
  - SODIS, CDC: transparent bottles on their side, minimum 6 hours of sun with intermittent
    agitation, 2 consecutive days under cloud.
  - UNVERIFIED: a numeric chlorine-dioxide contact time against Cryptosporidium, and the
    halogen contact-time-by-temperature matrix at 5, 15 and 25 C. The 2026 Yellow Book dropped
    that table, cdc.gov returns 403, and eCFR 40 CFR 141.720 redirects to an unblock page.
- **Verdict.** Ready to author today, and the richest structured data in the product.

### Procedure 3: fording a swift stream with a pole, and the roped team crossing (figures 17-1 and 17-3)

- **Step source.** FM 21-76 Ch 17, public domain. The individual pole ford is four actions plus a
  technique paragraph. Site selection is already an authorable checklist: three "good crossing
  locations" bullets and six "avoid" bullets.
- **Completion cues.** Positional and camera-checkable, verbatim: "Grasp the pole and plant it
  firmly on your upstream side to break the current. Plant your feet firmly with each step, and
  move the pole forward a little downstream from its previous position, but still upstream from
  you. With your next step, place your foot below the pole. Keep the pole well slanted so that the
  force of the current keeps the pole against your shoulder." The rafts carry a literal test step:
  "Before you start to cross the river or stream, let the raft lay on the water a few minutes to
  ensure that it floats."
- **Figure.** **Figure 17-3 is the best single asset in the Water tile.** Rendering printed page 188
  at 200 dpi shows three stacked panels with numbered swimmers and per-panel instruction text, and
  the panel captions are themselves per-step completion criteria: "When he reaches the bank, 1
  unties himself and 2 ties on. No. 2 crosses, controlled by the others." Panelized, so one crop
  per node. Not on Commons; render from the local PDF. Ch 17 figure map: 17-1 pole ford, 17-2 team
  pole ford, 17-3 roped crossing (p188), 17-4 brush raft, 17-5 Australian poncho raft, 17-6 donut
  raft, 17-7 log raft, 17-8 two-log float. `Category:River_crossings` was fetched, exists, 101
  files plus subcategories, mixed CC and PD. `Category:Tyrolean_traversing` was fetched, exists,
  57 files, CC BY-SA.
- **Structured data.** Pole 7.5 cm diameter, 2.1 to 2.4 m long. Crossing angle 45 degrees to the
  downstream current, stated twice. Rope for the team crossing: "The length of the rope must be
  three times the width of the stream." Ordering rule: heaviest person downstream, lightest
  upstream. Raft capacities: brush raft 115 kg, Australian poncho raft 35 kg, with the FM explicit
  that "The design of the above rafts does not allow them to carry a person's full body weight."
  Hard stop: "You must not try to swim or wade across a stream or river when the water is at very
  low temperatures."
- **Verdict.** Ready to author today. Figure 17-3 needs local extraction first, which is one
  render-and-crop.

Note for scoping: FM 21-76 has no one-rope bridge and no Tyrolean traverse. Figure 17-3 is a roped
team wade. A one-rope bridge needs a different manual.

---

## Tile 12: Man-Made Hazards (Ch 23)

### Procedure 1: expedient fallout shelter and shielding

- **Step source.** FM 21-76 Ch 23 "Shelter Site Selection and Preparation", ten bullets, each an
  action with its reason. Supplemented by FM 3-11.3 / MCWP 3-37.2A / NTTP 3-11.25 / AFTTP(I)
  3-2.56 *CBRN Contamination Avoidance*, February 2006, appendix G, fetched from
  `https://www.globalsecurity.org/wmd/library/policy/army/fm/3-11-3/fm3-11-3.pdf`, cover "Approved
  for public release; distribution is unlimited", public domain. Note globalsecurity.org returns
  403 to fetchers but serves a plain GET with a browser user agent. Civilian numbers from FEMA/HHS
  *Planning Guidance for Response to a Nuclear Detonation*, 3rd ed. 2022, fetched from
  `https://remm.hhs.gov/PlanningGuidanceNuclearDetonation.pdf` (the fema.gov copy 403s, the
  REMM-hosted identical file returns 200), federal work, public domain.
- **Completion cues.** FM 21-76 gives a measurable one: "Clean the shelter site of any surface
  deposit using a branch or other object that you can discard ... The cleaned area should extend
  at least 1.5 meters beyond your shelter's area." And a time budget rather than a criterion:
  "Five minutes to locate the shelter is a good guide." No scored measures.
- **Figure.** **Ch 23 has exactly one figure, 23-1, and no procedural illustration at all.** This is
  the weakest figure position of any PROCESS tile. `Category:Fallout_shelters` was fetched, exists,
  12 files in the parent with useful children (Household fallout shelters 20, Fallout shelter signs
  58, Blast doors 68), includes protection-factor diagrams, CC0 and CC BY-SA.
  `Category:Sandbags` was fetched, exists, 195 files, and its **Sandbag filling** subcategory holds
  121 files, largely FEMA and National Guard public domain. That subcategory is the closest thing
  to a per-step procedural photo set for improvised shielding and is the recommended figure source
  for this walk.
- **Structured data.** Figure 23-1 is a 450 x 282 bitmap on printed page 225, so the numbers are
  not in the text layer. Read off a 300 dpi render, "Thickness of materials to reduce gamma
  radiation" by 50 percent: iron or steel 1.8 cm, brick 5.1 cm, concrete 5.6 cm, dirt 8.4 cm, ice
  17.3 cm, soft wood 22.4 cm, snow 51.6 cm. FM 3-11.3 table G-2 corroborates independently in
  inches: steel 0.7, concrete 2.2, earth 3.3, wood 8.8, which convert to 1.78, 5.59, 8.38 and
  22.35 cm, the same dataset to the millimetre. Two independent public domain sources agree, so
  this table is safe to ship.
  Caution: FM 3-11.3's own worked example contradicts its table G-2, treating a 6-inch concrete
  wall as one half-thickness where the table says 2.2 inches. Do not transcribe both.
  Decay: FM 3-11.3 states the "7:10 Rule. For every seven-fold increase in time, radiation will
  decay by a factor of 10." FM 21-76 works the same example, 200 cGy/h to 20 at 7 h to 2 at 49 h.
  FEMA gives the underlying equation and its accuracy bound: "Rt = R1t^-1.2 ... accurate to within
  about 25 percent up to 2 weeks or so". FEMA table 1.4 is a shippable lookup: 1 h 1,000 R/h, 2 h
  400, 6 h 100, 24 h 23, 48 h 10, 72 h 6.2, 200 h 1.7, 1,000 h 0.24.
  Protection factors, FEMA: houses with basements, large multi-storey structures, parking garages
  and tunnels "can generally reduce doses from fallout by a factor of 10 or more"; poorest shelters
  PF about 2; adequate PF above 10; outside trips "no more than 30 minutes"; "Sheltering for the
  first 12 hours following detonation is particularly critical." FM 3-11.3 table G-3 is
  text-extractable and equivalent: frame house 0.30 to 0.8, basement 0.05 to 0.1, multistorey upper
  storeys 0.01, 9-inch concrete blockhouse 0.007 to 0.090, 24-inch 0.0001 to 0.0020, 2-foot
  earth-covered shelter PF 50 to 200, 3-foot PF 200 to 1,000.
  FM 21-76's exposure timetable ships as a schedule, not prose: complete isolation days 4 to 6;
  brief water trip day 3 at 30 minutes or less; day 7 one exposure of 30 minutes or less; day 8 up
  to 1 hour; days 9 to 12, 2 to 4 hours; normal operation from day 13.
- **Verdict.** Text and structured data ready today. **Figure source must be resolved first**, from
  Commons `Category:Sandbags` subcategory Sandbag filling, because the FM has no procedural art.

### Procedure 2: personal decontamination

- **Step source.** **FM 21-76 is not usable here.** Ch 23 explicitly punts: "your first line of
  defense against chemical agents is your proficiency in individual nuclear, biological, and
  chemical (NBC) training ... The SMCTs cover these subjects. The subject matter covered below is
  not a substitute for any of the individual tasks in which you must be proficient." There is no
  step-level decontamination procedure in the FM at all.
  Use instead: STP 21-1-SMCT (28 Sep 2017) task `031-COM-1006 Decontaminate Yourself and Individual
  Equipment Using Chemical Decontaminating Kits`, public release, public domain, fetched from the
  archive.org item `stp-21-1-smct-warrior-skills-sl-1-2017`; and FM 3-11.5 / MCWP 3-37.3 / NTTP
  3-11.26 / AFTTP(I) 3-2.60 *CBRN Decontamination*, 4 April 2006, 364 pp, public release, fetched
  from `https://www.globalsecurity.org/wmd/library/policy/army/fm/3-11-5/fm-3-11-5.pdf`.
- **Completion cues.** **This is the single best source in the entire survey.** STP 21-1-SMCT task
  031-COM-1004, evaluation guidance, verbatim: "Read the action, condition, and standard to the
  Soldier. Provide the Soldier with all items given in the Conditions Statement. Score the Soldier
  GO if all performance measures are passed (P) in sequence. Soldier must complete steps 1 through
  3, in sequence, within 9 seconds. Score the Soldier NO GO if any performance measure is failed
  (F) or out of sequence."
  Two of its measures are directly camera-verifiable: "b. Blew out hard and ensured that any
  contaminated air is forced out around the edges of the face piece" and "b. Ensured mask assembly
  collapse against the face." The negative-pressure check has a visible pass state.
  Task 031-COM-1006's standard is a per-task time budget: "Start the steps to decontaminate your
  skin and eyes within 1 minute after contamination, and finish within 2 minutes. Decontaminate all
  individual equipment, in sequence, within 15 minutes after decontaminating your skin." Its step 5:
  "Allow RSDL to remain on skin for at least 2 minutes to destroy the chemical agent."
  This combination, a sequenced measure list plus a per-task time budget plus a binary score, is
  the model to copy for every PROCESS node in the product.
- **Figure.** FM 3-11.5 figure H-1 (M291 Skin Decontamination Kit, p H-5) and figure H-2 (M295
  IEDK, p H-6), plus MOPP-gear-exchange step tables IV-4, IV-5 and IV-6 already laid out as
  Required Steps / Contamination Type / Required Equipment / Required Procedures.
  `Category:Decontamination_of_people` was fetched, exists, 154 files plus a Mass Casualty
  Decontamination subcategory of 22, predominantly DoD and FEMA public domain, showing decon
  showers, decon lines and doffing. **This is the best per-step photo set found for any tile.**
  `Category:Mission_Oriented_Protective_Posture` was fetched, exists, 171 files, DVIDS and DoD
  provenance, though the category page does not state a per-file licence, so check each.
- **Structured data.** FEMA: "Removing the outer layer of clothing can remove up to 90% of the
  radioactive dust." PRISM: "you can remove 99% of chemical contamination by having the patient
  disrobe and blot their skin with dry, absorbent material." Different contaminant classes and
  different numbers, so the node must branch on hazard type.
  PRISM decay of the intervention, which converts directly to a live countdown: "the protective
  effects of disrobing will decrease by approximately 20% every 10 minutes", and "for some
  chemicals, the clinical benefit of decontamination can decrease by 50% within the first 10
  minutes of exposure."
  PRISM dry decon, the "10:10" method: blot an area of skin or hair for 10 seconds, then rub the
  same area for another 10 seconds, in order head and hair, face, hands, other exposed skin, fresh
  material per area, head tilted back during hair decon.
  PRISM wet decon: water 35 to 40 C (95 to 104 F); a washing aid improves removal by 20 percent;
  detergent 0.1 to 0.5 percent v/v; head to toe; "shower for no longer than 90 seconds ... Ideally,
  1 minute with soapy water followed by 1/2 minute of rinsing with water only" to avoid wash-in;
  active towel drying is a critical step.
  FEMA radiological washing: "shower from the top down with warm water and soap. Use shampoo if
  available, but do not use hair conditioner", "because it will bind radioactive material to your
  hair, keeping it from rinsing out easily", and "Do not scrub the skin." If fallout is still
  falling, do not remove clothing; gently dust off visible fallout without breathing or swallowing
  the dust.
  FM 3-11.5 timings: RSDL "provides the full removal and destruction of CW agents within 2
  minutes ... Apply the lotion within 1 minute of contamination." M291 six packets, M295 four mitts
  at 22 g decontaminant each. MOPP gear exchange within 6 hours of contamination.
- **Licence caution.** PRISM Volume 2, *Tactical Guidance*, 2nd ed. 2018, fetched from
  `https://www.medicalcountermeasures.gov/barda/cbrn/prism`, has the best civilian numbers by a
  wide margin but is **CC BY-NC-SA 4.0, not public domain**. It was authored by the University of
  Hertfordshire under BARDA contract HHSO100201500016C; federally funded is not federally authored.
  Use it as a numbers reference and write original prose. The NC clause blocks commercial
  distribution of verbatim text.
- **Verdict.** Ready to author today, and it should be authored first among the hazards
  procedures, because it is the one place where a genuine GO/NO-GO source and a genuine per-step
  photo set both exist.

### Procedure 3: safe water sourcing after fallout or a chemical release

- **Step source.** FM 21-76 Ch 23, public domain, with three separate ranked source hierarchies for
  nuclear, biological and chemical contamination that map cleanly onto a decision-tree node. EPA's
  emergency disinfection page supplies the hard rule.
- **Completion cues.** Threshold and observation based. Nuclear: "If you wait at least 48 hours
  before drinking any water to allow for radioactive decay to take place and select the safest
  possible water source, you will greatly reduce the danger." Settling has an explicit end state:
  "Stir the water until you see most dirt particles suspended in the water. Let the mixture settle
  for at least 6 hours." Chemical gives a reject-criterion list a camera can assist with: "Signs of
  water source contamination are foreign odors such as garlic, mustard, geranium, or bitter
  almonds; oily spots on the surface of the water or nearby; and the presence of dead fish or
  animals. If these signs are present, do not use the water."
- **Figure.** Ch 23 has no water figure and cross-references Ch 6 by name: "See Figure 6-9 for an
  example of a water filter." Reuse the Ch 6 asset, printed page 62, or Commons
  `Water filtering systems.jpg`. The seepage-basin technique has no illustration in any manual
  fetched and would need an original diagram.
- **Structured data.** Nuclear: wait at least 48 hours; source ranking springs and wells, then
  piped or stored water in abandoned buildings, then streams and rivers, then standing water last;
  a seepage basin removes "up to 99 percent of the radioactivity"; settling recipe is a container
  three-quarters full, soil taken from at least 10 cm below the surface, 2.5 cm of dirt per 10 cm
  of water, settle at least 6 hours, then filter and treat.
  Biological: sealed containers first, washing the container with soap and water or boiling it for
  at least 10 minutes before breaking the seal; springs second, boil 10 minutes covered; standing
  water last.
  Chemical: the hard rule is EPA's, verbatim, that boiling and disinfection "will not destroy other
  contaminants, such as heavy metals, salts, and most other chemicals." **This is the most
  important checkable fact in the tile.** It makes the boil and disinfect nodes unreachable inside
  a chemical-release branch, and the walk should enforce that rather than display it.
- **Verdict.** Ready to author today, apart from the seepage-basin diagram.

---

## The second completion-cue source, and it is better shaped than STP for craft procedures

**TC 3-97.61 *Military Mountaineering*, 26 November 2025, Chapter 8.** Fetched from
`https://archive.org/download/military-mountaineering-tc-3-97.61-november-2025/`. Cover: "Approved
for public release; distribution is unlimited." Public domain.

Its preface states Chapter 8 "provides step-by-step guides to the knots military mountaineers will
require". Every knot is written as `Tying the Knot` with numbered `STEP 1..n`, followed by a
`Checkpoints` block introduced by a fixed formula: **"The following must be true for the knot to be
correct:"** followed by an observable list. It is born-digital, and its 247 figures extract as
individual raster images.

That is the PROCESS node contract, already written, in a public domain document.

So the product has two completion-criterion shapes to choose between:

| Shape | Source | Fits |
| --- | --- | --- |
| `Performance Measures`, a per-step GO/NO-GO row with a numeric tolerance in the Standards line | STP 21-1-SMCT | anything the phone can measure, and first aid |
| `Checkpoints`, a per-procedure list of "must be true" statements | TC 3-97.61 | knots and craft, where the end state is inspectable but the steps are not |

Decide which the node model adopts before authoring. The two are not interchangeable.

---

## Tile 8: Tools and Cordage (Ch 12)

FM 21-76 Ch 12 is the wrong source for knots and lashings, and this needs saying plainly. Its
figures 12-1 through 12-11 are clubs, knives, a bow and arrow, a bola, cordage methods, packs and
bamboo containers. It names knots it never illustrates or teaches: round turn and two half hitches,
prusik, girth hitch, overhand. There is no bowline figure, no lashing figure, and no tying sequence
anywhere in the chapter.

### Procedure 1: bowline (author first)

- **Step source.** TC 3-97.61 (26 Nov 2025) paragraphs 8-78 to 8-80, five numbered steps, verbatim:
  "STEP 1. Bring the working end of the rope around the anchor, from right to left (as the climber
  faces the anchor). STEP 2. Form an overhand loop in the standing part of the rope (on the
  climber's right) toward the anchor. STEP 3. Reach through the loop and pull up a bight. STEP 4.
  Place the working end of the rope (on the climber's left) through the bight and bring it back
  onto itself. Now dress the knot down. STEP 5. Form an overhand knot with the tail from the bight."
  Public release, unlimited.
- **Completion cues.** Yes, explicit, paragraph 8-80: "The following must be true for the knot to be
  correct: The bight is locked into place by a loop. The short portion of the bight is on the inside
  and on the loop around the anchor (or inside the fixed loop). There is an approximate 4-inch tail
  after tying the overhand safety." Other knots give harder numbers still; the flat overhand
  (8-70/8-71) requires "a minimum 18-inch tail for both strands of rope" and checks "Knot should be
  hard to the touch, not loose, or sloppy."
- **Figure.** TC 3-97.61 figure 8-19, born-digital and extractable. Commons
  `https://commons.wikimedia.org/wiki/Category:Bowlines` was fetched, exists, 14 subcategories and
  122 files, and holds genuine step series `Bowline in four steps.png` and `Bowline steps.png` plus
  animations and slow-motion video. Licence caution: `File:Bowline_steps.png` is CC BY-SA 3.0 plus
  GFDL 1.2+, not public domain, so attribution and share-alike apply.
- **Verdict.** Ready to author today, and it is the best-supported procedure in the whole product:
  numbered steps, an explicit correctness list, a public domain figure, and a Commons step series.

### Procedure 2: prusik, end of rope

Recommended in place of cordage-from-plant-fibre for the first batch, on source quality.

- **Step source.** TC 3-97.61 paragraphs 8-90 to 8-94. Seven numbered steps for the end-of-rope
  prusik, three for the middle-of-rope variant.
- **Completion cues.** Paragraph 8-94, verbatim: "The following must be true for the knot to be
  correct: Six complete turns with a locking bar. The knot is tight and dressed down with no ropes
  twisted or crossed. The end-of-the-rope prusik hitch should be closed out with a bowline to
  prevent slipping." Design constraint from 8-91: "Ideally, there should be a 3-mm difference in
  diameter between the cordelette and installation rope" and "A minimum of three turns should be
  used for this knot."
  **Edition conflict:** the 2002 FM 3-97.61 specified four wraps, the 2025 TC specifies six turns.
  Ship the 2025 text.
- **Figure.** TC 3-97.61 figures 8-23 and 8-24. Commons
  `https://commons.wikimedia.org/wiki/Category:Prusik_knots` was fetched, exists, 63 files, and
  holds a genuine five-step photo series `Klettern_prusikknoten_1von5.jpg` through `5von5.jpg`
  (GFDL 1.2+ and CC BY-SA 3.0 dual) plus a five-part SVG series. Second-best per-step Commons
  coverage found anywhere.
- **Verdict.** Ready to author today.

### Procedure 3: square lashing and shear lashing

- **Step source.** FM 5-125 *Rigging*, 3 Oct 1995 with Change 1 of 23 Feb 2001, Chapter 2 section I,
  "Approved for public release; distribution is unlimited", fetched from archive.org. The successor
  TM 3-34.86 / MCRP 3-17.7J (16 Jul 2012) carries the same text at paragraphs 2-47 and 2-48 and
  fetches from armypubs at
  `https://armypubs.army.mil/epubs/DR_pubs/DR_a/pdf/web/tm3_34x86.pdf`. **Licence conflict on the
  successor:** its PDF cover says public release unlimited while the armypubs catalogue record tags
  it NOFORN. Prefer FM 5-125, whose statement is unambiguous.
  Square lashing, verbatim from FM 5-125: "To tie a square lashing, begin with a clove hitch on one
  spar and make a minimum of four complete turns around both members. Continue with two trapping
  turns between the vertical and the horizontal spar to tighten the lashing. Tie off the running end
  to the opposite spar from which you started with another clove hitch to finish the square
  lashing." ("trapping" is an OCR error for "frapping"; the 2012 TM reads "frapping".)
  Shear lashing, verbatim: spars "spaced about one-third of the diameter of a spar apart, with the
  butt ends together ... make eight tight turns around both spars above the clove hitch. Tighten the
  lashing with a minimum of two trapping turns around the eight turns."
- **Completion cues.** No Checkpoints block, but the prose is countable and therefore checkable:
  square lashing four complete turns, two frapping turns, a clove hitch at each end; shear lashing
  eight turns, minimum two frapping turns, spacing one third of a spar diameter. The best countable
  criterion in the lashings literature.
- **Figure.** FM 5-125 figures 2-36 (square lashing) and 2-37 (shears lashing). TM 3-34.86 carries
  the same numbers born-digital with 184 extractable images. FM 21-76 has nothing.
  **Commons is thin here and cannot fill the gap.** `Category:Lashing_knots` was fetched, exists, 73
  files, and holds `Square_lashing.jpg`, `Shear_lashing_0_Thumb.jpg` and `Shear-lashing-2pole.JPG`,
  all finished-lashing renders rather than sequences. `Category:Square_lashing` and
  `Category:Shear_lashing` were probed and **do not exist** (404). Step artwork must be commissioned.
- **Verdict.** Text ready today. **Per-step figures must be resolved first**; only the end state is
  illustrated anywhere.

**What FM 5-125 Chapter 2 actually covers**, for planning: overhand, wall, crown, square, single
and double sheet bend, carrick bend, bowline and five variants, speir knot, cat's-paw, figure eight
with an extra turn, butterfly; hitches half hitch, two half hitches, round turn and two half
hitches, timber, clove, rolling, telegraph, mooring, scaffold, blackwall, harness, girth,
sheepshank, fisherman's bend; and lashings square, shears and block. Figures run 2-1 to 2-60, with
knots at 2-1 to 2-38. **There is no prusik, and there are no numbered tying steps for any knot** —
the body text gives purpose and properties and defers the sequence to the drawing. FM 5-125's
plates beat FM 21-76's, which do not exist, but they are not step-labelled the way TC 3-97.61's are.

**Do not plan on cordage from plant fibre as a first procedure.** FM 21-76's "Lashing and Cordage"
gives a fibre suitability test and material lists but no reverse-wrap procedure; the method is
delegated entirely to figure 12-8. That figure is a genuine three-panel per-step plate (see above),
so the procedure is authorable from the figure captions alone, but no public-release US Government
source gives step-granular cordage-twisting text.

---

## Tile 9: Direction Finding (Ch 18)

### Procedure 1: shadow-tip method

- **Step source.** Prefer **FM 3-25.26 *Map Reading and Land Navigation*, 20 Jul 2001, paragraph
  9-5a**, public release unlimited, over FM 21-76, because it adds numbers FM 21-76 omits. Verbatim:
  "Step 1. Place a stick or branch into the ground at a level spot where a distinctive shadow will
  be cast. Mark the shadow tip with a stone, twig, or other means. This first shadow mark is always
  the west direction. Step 2. Wait 10 to 15 minutes until the shadow tip moves a few inches. Mark
  the new position of the shadow tip in the same way as the first. Step 3. Draw a straight line
  through the two marks to obtain an approximate east-west line. Step 4. Standing with the first
  mark (west) to your left, the other directions are simple; north is to the front, east is to the
  right, and south is behind you."
  FM 21-76 adds the equipment spec, "find a straight stick 1 meter long, and a level spot free of
  brush", and the more accurate arc variant.
  Hard bound from FM 3-25.26 9-5a(3)(d): "The shadow-tip system is not intended for use in polar
  regions, which the Department of Defense defines as being above 60 degrees latitude in either
  hemisphere." That is a gate the app can evaluate from GNSS.
- **Completion cues.** No GO/NO-GO block, and STP 21-1-SMCT has no shadow-tip task; its Navigate
  subject area is 071-329-1000 to 1012, all map and lensatic-compass tasks.
- **Figure.** **FM 21-76 figure 18-1 is already a three-panel per-step plate** with captions "1 Mark
  the shadow's tip / 2 Mark the new position and draw a line through the two marks / 3 Stand with
  the first mark to your left and the second mark to your right, you are now facing north", and it
  is already extracted on Commons as `Shadow-tip method.gif`, PD-USGov. One crop per node, no other
  source needed. FM 3-25.26 figure 9-7 is an alternative that adds a shadow-clock overlay. Commons
  has no photographic coverage; a media search returned only irrelevant hits and no category exists.
- **Structured data.** This is the node that becomes genuinely checkable.
  - **NOAA Solar Calculator**, `https://gml.noaa.gov/grad/solcalc/calcdetails.html`, fetched. The
    day spreadsheet `https://gml.noaa.gov/grad/solcalc/NOAA_Solar_Calculations_day.xls` downloaded
    at 286,208 bytes; its column headers confirm it emits `Solar Azimuth Angle (deg cw from N)`,
    `Solar Elevation Angle (deg)`, `Solar Zenith Angle (deg)`, `Hour Angle (deg)`, `Sun Declin
    (deg)`, `Solar Noon (LST)`, `Sunset Time (LST)` and `Sunlight Duration (minutes)`, tabulated per
    time step for one date. Solar azimuth at an arbitrary instant is exactly the quantity that
    validates a shadow-tip north line. Algorithm is "based on equations from Astronomical
    Algorithms, by Jean Meeus"; stated accuracy "sunrise and sunset results are theoretically
    accurate to within a minute for locations between +/- 72 degrees latitude, and within 10 minutes
    outside of those latitudes"; valid 1901 to 2099 only; NOAA notes the calculator is no longer
    actively maintained. US Government, public domain. The formulas port to roughly 200 lines and
    need no network, which is what an offline app requires.
  - **USNO API is live**, contrary to its outage history.
    `https://aa.usno.navy.mil/api/rstt/oneday?date=2026-08-15&coords=37.77,-122.42&tz=-8` returned
    HTTP 200 with sun and moon data. No API key. **Rate limits are stated nowhere: UNVERIFIED.**
    `rstt/oneday` gives rise, set and transit only; `/api/celnav` gives azimuth but is a network
    call, so it suits build-time validation rather than runtime.
  - sunrise-sunset.org returns full twilight data and a v2 endpoint adds `sunrise_azimuth`,
    `solar_noon_azimuth` and `sunset_azimuth`, but only at those three instants, and its terms
    require a visible link back.
- **Verdict.** Ready to author today, figure included, and it is the one navigation node where the
  app can independently compute the right answer and score the user's result.

### Procedure 2: watch method

- **Step source.** FM 3-25.26 paragraph 9-5b and FM 21-76 Ch 18 (printed p195). FM 21-76 verbatim:
  "In the northern hemisphere, hold the watch horizontal and point the hour hand at the sun. Bisect
  the angle between the hour hand and the 12 o'clock mark to get the north-south line ... Note: If
  your watch is set on daylight savings time, use the midway point between the hour hand and 1
  o'clock." Southern hemisphere: "point the watch's 12 o'clock mark toward the sun and a midpoint
  halfway between 12 and the hour hand will give you the north-south line."
- **Completion cues.** None stated. FM 3-25.26 9-5b(3) gives a self-correction procedure instead,
  which is the closest thing to a check: "The watch method can be in error, especially in the lower
  latitudes, and may cause circling. To avoid this, make a shadow clock and set your watch to the
  time indicated. After traveling for an hour, take another shadow-clock reading. Reset your watch
  if necessary."
- **Figure.** FM 21-76 figure 18-2, already on Commons as `Watch method for navigation.jpg`,
  PD-USGov. FM 3-25.26 figure 9-8 covers both hemispheres. Commons has zero photographic coverage.
- **Structured data.** Same NOAA solar azimuth. The watch method's error is a known function of
  latitude and the equation of time, so a computed azimuth lets the app state the expected error
  before the user commits to a bearing, which is a better node than a pass/fail.
- **Verdict.** Ready to author today.

### Procedure 3: improvised floating compass

- **Step source.** FM 21-76 Ch 18 "Making Improvised Compasses", prose only, no numbered steps.
  Three magnetisation routes (silk or hair stroking, magnet stroking, electrical) with one hard
  number, "The battery must be a minimum of 2 volts", plus the pivot variant.
- **Completion cues.** One, stated as an outcome rather than a step criterion: "When suspended from
  a piece of nonmetallic string, or floated on a small piece of wood in water, it will align itself
  with a north-south line."
- **Figure.** **FM 21-76 Ch 18 has no figure for the improvised compass**; figures 18-1 to 18-4 are
  shadow, watch, northern sky and Southern Cross. Commons has no category;
  `Category:Compass_(instrument)_diagrams` was probed and does not exist. Artwork must be authored.
- **Structured data.** **WMM declination is what turns this from a demonstration into a check.**
  `https://www.ncei.noaa.gov/products/world-magnetic-model` fetched: WMM2025, epoch 2025.0,
  released 17 Dec 2024, valid to 31 Dec 2029. Coefficients at
  `https://www.ncei.noaa.gov/sites/default/files/2024-12/WMM2025COF.zip` (42,887 bytes) containing
  `WMM.COF`, 93 lines of fixed-width ASCII to degree 12, about 4 KB. Test vectors at
  `https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025_TEST_VALUES.txt`. Licence quoted
  from the page: "The WMM source code is in the public domain and not licensed or under copyright.
  The information and software may be used freely by the public."
  Live API verified with a real call: `calculateDeclination` for 37.77, -122.42 on 2026-08-15
  returned `declination: 12.84478`, `declination_sv: -0.09005`, `declination_uncertainty: 0.35137`,
  `model: "WMM-2025"`. NCEI now gates key issuance behind a registration form, so bundle the COF
  rather than depending on the API. WMMHR2025 exists at degree 133, 9,044 coefficient lines and
  about 534 KB, and is overkill against WMM's 0.35 degree declination uncertainty.
  The improvised needle points to magnetic north, so with `WMM.COF` bundled the app can tell the
  user offline how far the needle sits from true north.
- **Verdict.** Text and structured data ready. **Figure must be resolved first**; nothing exists in
  any source.

### The one place STP performance measures exist for navigation

STP 21-1-SMCT (14 Dec 2007) subject area 5, "Navigate". Task **071-329-1003 Determine a Magnetic
Azimuth Using a Lensatic Compass**, verbatim:

> Standards: Determine the correct magnetic azimuth to the designated point within 3 degrees using
> the compass-to-cheek method and within 10 degrees using the center-hold method.
>
> Performance Measures, GO / NO GO
> 1. Determined the correct magnetic azimuth to the designated point within 3 degrees using the
>    compass-to-cheek method.
> 2. Determined the correct magnetic azimuth to the designated point within 10 degrees using the
>    center-hold method.

Task **071-329-1005 Determine a Location on the Ground by Terrain Association** sets "Within 7
minutes, determine the six-digit coordinate of your location with a 100-meter tolerance" and lists
six measures ending "the point selected must be within 100 meters of your location".

The scoring rule the product should copy, STP 21-1-SMCT paragraph 1-9e(2) verbatim: "Score the
Soldier GO if all performance measures are passed. Score the Soldier NO GO if any step is failed.
If the Soldier fails any step, show or tell him or her what was done wrong and how to do it
correctly." Note the last clause: the source specifies remediation, not just scoring.

---

## Tile 10: Signaling and Rescue (Ch 19)

**There is no STP signaling task.** Subject area 6 "Communicate" holds 071-326-0608 *Use Visual
Signaling Techniques*, but its conditions read "Given a requirement to use visual signals while
mounted" and its content is vehicle formation, drill and flag signals, with coarse measures such as
"Executed proper formation signals." Nothing in STP 21-1-SMCT covers signal mirrors, ground-to-air
panels or signal fires. Verified against the 2007 edition; the 2015, 2017 and 2023 task lists are
UNVERIFIED.

### Procedure 1: ground-to-air code panel construction

- **Step source.** FM 21-76 Ch 19 (printed p206), verbatim and complete: "This code (Figure 19-6) is
  actually five definite, meaningful symbols. Make these symbols a minimum of 1 meter wide and 6
  meters long. If you make them larger, keep the same 1:6 ratio. Ensure the signal contrasts greatly
  with the ground it is on. Place it in an open area easily spotted from the air." Construction
  materials come from the same chapter's "Natural Material" paragraph: tramp snow and fill the
  depression with contrasting twigs or branches; in sand use boulders, vegetation or seaweed; in
  brush cut out patterns or sear the ground; in tundra dig trenches or turn the sod upside down.
- **Completion cues.** No GO/NO-GO source. The 1:6 ratio, the contrast requirement and the open-area
  requirement are the three observables, and they are the only ones any source states. The ratio is
  checkable from a photograph or from user-entered dimensions, which makes this one of the few
  signaling nodes that can be scored.
- **Figure.** **The cleanest licence found in this whole survey.**
  `https://commons.wikimedia.org/wiki/File:Ground-Air_Visual_Code_for_Use_by_Survivors.png` was
  fetched: source FAA Aeronautical Information Manual section 6-2-6, author Federal Aviation
  Administration, dated 5 Oct 2023, 640 x 439, tagged public domain under 17 U.S.C. 105 plus PD Mark
  1.0. A companion file covers ground search parties. Reachable through
  `https://commons.wikimedia.org/wiki/Category:Distress_signals`, fetched, exists, 21 files.
  FM 21-76's own figure 19-6 is a clean five-row table (rendered from printed page 206) and is
  panelizable one row per symbol, but remains unextracted.
- **Structured data, and a conflict to resolve before authoring.** Three published minimums:

  | Source | Stated minimum |
  | --- | --- |
  | FM 21-76 (1992) | 1 m wide by 6 m long, keep the 1:6 ratio |
  | FM 3-05.70 (2002) | "a minimum of 4 meters (13 feet) wide and 6 meters (20 feet) long ... The signal arms or legs should be 1 meter (3 feet) wide" |
  | ICAO Annex 12, appendix, 2.3 | "Symbols shall be at least 2.5 metres (8 feet) long and shall be made as conspicuous as possible." |

  The 2002 revision reinterpreted the 1992 numbers as overall symbol extent rather than stroke
  width. FM 21-76's 1:6 rule is the one a phone can check; ICAO's 2.5 m is a floor. **ICAO Annex 12
  was fetched only from an unofficial mirror and icao.int itself could not be fetched: UNVERIFIED at
  source.** ICAO Annex text is ICAO copyright, so quote the number and do not reproduce the table.
  Symbol-set conflict: FM 21-76's table carries 18 symbols where FM 3-05.70 and ICAO carry 5. The
  ICAO five are V require assistance, X require medical assistance, N no or negative, Y yes or
  affirmative, and an arrow for proceeding in this direction, which matches FM 21-76 figure 19-6.
- **Verdict.** Ready to author today, with a PD figure already in hand. Resolve the dimension
  conflict first; publish the FM 21-76 1:6 rule and cite ICAO's 2.5 m floor.

### Procedure 2: signal mirror aiming

- **Step source.** FM 21-76 Ch 19 (printed p203) defers to the mirror itself: "If you have an MK-3
  signal mirror, follow the instructions on its back (Figure 19-3) ... Figures 19-4 and 19-5 show
  methods of aiming a signal mirror." **The step text lives inside the figures**, which is why the
  figure extraction gap bites hardest here. The transcribed in-figure steps read: "1 Reflect
  sunlight from mirror onto a nearby surface (raft, hand). 2 Slowly bring up to eye level and look
  through sighting hole. You will see a bright spot or light. This is the aim indicator. 3 Hold
  mirror near the eye and slowly turn and manipulate it so that the bright spot of light is on the
  target."
- **Completion cues.** None per step. What both manuals give instead are safety limits, which
  convert into node warnings. FM 21-76 verbatim: "CAUTION: Do not flash a signal mirror rapidly
  because a pilot may mistake the flashes for enemy fire. Do not direct the beam in the aircraft's
  cockpit for more than a few seconds as it may blind the pilot." Placement rule: "if possible, get
  to the highest point in your area when signaling. If you can't determine the aircraft's location,
  flash your signal in the direction of the aircraft noise."
- **Figure.** **Commons is unusually strong here and beats the FM.**
  `https://commons.wikimedia.org/wiki/Category:Signalling_mirrors` was fetched, exists, 53 files
  (note `Category:Signal_mirrors` does not exist), and holds `How to use the Mark 3 Signal
  Mirror.jpg`, `Four Methods of Aiming Mirror Flashes of Sunlight.png`, `Rearsight Signal Mirror
  Instructions.png`, `Retroreflective Signal Mirror Aimer Instructions.jpg` and a WWII US Government
  training film. Per-file licences on that category were not sampled: UNVERIFIED at file level.
  FM 21-76 figures 19-3, 19-4 and 19-5 are the fallback and are not on Commons.
- **Structured data.** Flash range, two independent sources agreeing. FM 21-76: "Pilots have
  reported seeing mirror flashes up to 160 kilometers away under ideal conditions." AFR 64-4 Vol I
  Ch 24, fetched from archive.org: "A mirror flash has been visible up to 100 miles under ideal
  conditions, but its value is significantly decreased unless it is used correctly. It also works on
  overcast days." 100 miles is 161 km. Cite as up to 160 km (100 miles) under ideal conditions, with
  attribution. **Flash intensity in candlepower is UNVERIFIED**; the widely repeated "several
  million candlepower" appears in neither manual and no military publication carrying it could be
  fetched.
- **Verdict.** Ready to author today, using the Commons aiming plates rather than the FM.

### Procedure 3: signal fires and smoke

- **Step source.** FM 21-76 Ch 19, verbatim: "During darkness, fire is the most effective visual
  means for signaling. Build three fires in a triangle (the international distress signal) or in a
  straight line with about 25 meters between the fires." Tree torch and smoke-colour control follow,
  including the failure condition: "Smoke signals are effective only on comparatively calm, clear
  days. High winds, rain, or snow disperse smoke."
- **Completion cues.** None. Three fires, 25 m apart, contrasting smoke colour and an isolated tree
  are the observables, stated as instructions rather than criteria.
- **Figure.** FM 21-76 figures 19-1 (burning tree) and 19-2 (smoke generator); 19-2 is already on
  Commons as `Smoke generator - ground.jpg`, PD-USGov. **Commons has effectively nothing else**:
  `Category:Signal_fires` does not exist, and `Category:Smoke_signals` was fetched, exists, and
  holds 9 files that are mostly Frederic Remington paintings.
- **Structured data.** Smoke colour control: green leaves, moss or a little water on a large fire
  gives white smoke; rubber or oil-soaked rags give black. Rule of three, stated three times in the
  chapter: three fires in a triangle, three columns of smoke, and "Three shots fired at distinct
  intervals usually indicate a distress signal". Whistle range: "In some documented cases, they have
  been heard up to 1.6 kilometers away."
- **Verdict.** Ready to author today.

### Body signals: use the FAA AIM, not FM 21-76

`https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap6_section_2.html` section 6-2-6
is live, current and public domain, and carries the full named set. It also states execution rules
FM 21-76 omits: "Stand in the open when you make the signals. Be sure the background, as seen from
the air, is not confusing. Go through the motions slowly and repeat each signal until you are
positive that the pilot understands you."

**Caveat before planning on it: the AIM HTML edition's figure images are blank placeholders.**
`https://www.faa.gov/air_traffic/publications/atpubs/aim_html/images/aim0602_Auto0.png` downloads at
143 bytes, 380 x 275, 1-bit, and renders solid white; ten images serve seventeen listed figures. No
working AIM PDF URL could be located: UNVERIFIED. Take the artwork from **FM 21-76 figure 19-7**
instead, which rendering printed page 206 confirms is an eleven-panel captioned grid, one panel per
signal, and is the single best per-node figure asset in the Signaling tile.

### Morse and distress conventions

**ITU-R M.1677-1 (10/2009)**, fetched, section 2 verbatim: "A dash is equal to three dots. The space
between the signals forming the same letter is equal to one dot. The space between two letters is
equal to three dots. The space between two words is equal to seven dots." In dot units: dot 1, dash
3, intra-character 1, inter-letter 3, inter-word 7. **M.1677-1 never mentions SOS**, so do not cite
it for the distress signal. Redistributing the ITU PDF is restricted; the timing numbers are facts.

**SOS**, authoritative and free: 33 CFR Part 87 Annex IV, fetched through the eCFR API at
`https://www.ecfr.gov/api/versioner/v1/full/2026-01-01/title-33.xml?part=87`, section 87.01(d)
verbatim: "A signal made by any method consisting of the group . . . - - - . . . (SOS) in the Morse
Code". US Government, public domain, unauthenticated API. Section 87.01(a) codifies the interval
without the count: "A gun or other explosive signal fired at intervals of about a minute."

### Commons knot and figure licensing, three verdicts the pipeline needs

- **The 1944 US Navy "Knots, Bends, Hitches, Splices" is NOT on Commons.** A media search on the
  title returned zero results and no category exists. UNVERIFIED as a Commons source; do not plan
  around it.
- **Ashley's Book of Knots: use redraws, exclude scans.** `Category:Ashley_Book_of_Knots` does not
  exist. A search returns 468 results, but the great majority are user redraws that cite an ABoK
  plate number as a reference only, such as `File:Double_overhand_knot.svg` (own work, released
  PD). That pattern is clean, because a knot is a fact and a fresh drawing is not a derivative of
  Ashley's engraving. Direct scans exist and are tagged badly: `File:ABoK_Entry_195.png` gives
  author Clifford Warren Ashley, date 1944, and carries only `{{PD-old-70}}`, which rests on
  Ashley's 1947 death. That is the wrong test for a US work, whose status turns on whether copyright
  was renewed in 1971-72, and the file carries no US tag at all.
- **Openclipart is clean.** `Category:PD_OpenClipart` holds 2,947 files populated by the
  `{{PD-OpenClipart}}` template, and Openclipart's site terms are CC0. The category page does not
  restate the rationale, so the verbatim wording is UNVERIFIED and no individual knot file was
  sampled.

**Overall Commons posture for this product: knot imagery is dominated by CC BY-SA and GFDL, not
public domain.** Sampled and confirmed: `File:Knot-square-ABoK_1204-USCG.jpg` is CC BY-SA 4.0
despite the USCG in the filename, because it was self-published by a user and is not a government
work; `File:Bowline_steps.png` CC BY-SA 3.0 plus GFDL 1.2+; `File:Klettern_prusikknoten_1von5.jpg`
GFDL 1.2+ and CC BY-SA 3.0; `File:Shear_lashing_0_Thumb.jpg` CC BY-SA 4.0. Two public domain
exceptions found: `File:Timber_Hitch_(PSF).png` (Pearson Scott Foresman, donated to WMF, OTRS
#2010061110041093) and `File:Double_overhand_knot.svg`. **Budget for a per-image attribution surface
and honour share-alike on any modified derivative.**

The best general knot pool is `https://commons.wikimedia.org/wiki/Category:Knot_diagram_steps`,
fetched, exists, 277 files and no subcategories, with explicitly numbered sequences such as
`Marlinespike-hitch-ABOK-2030-Step1..Step4.jpg`.

**Commons categories probed that do not exist**, so the pipeline does not retry them:
`Knot_tying_instructions`, `Animations_of_knots`, `Square_lashing`, `Shear_lashing`, `Lashings`,
`Lashing_(ropework)`, `Signal_mirrors`, `Signal_fires`, `Compass_(instrument)_diagrams`,
`Ashley_Book_of_Knots`, `Lean-to shelters`, `Fire_making`, `Fire_making_methods`, `Snow_shelters`.
The real names are `Knot_animations`, `Lashing_knots`, `Signalling_mirrors`, `Fire-starting`,
`Making fire`.

### Other manuals checked, with licence verdicts

- **USCG Boat Crew Seamanship Manual, COMDTINST M16114.5C, 16 Sep 2003**, fetched at 30.6 MB from
  `https://rdept.cgaux.org/documents/BoatCrewHandbooks/16114_5C%20BoatCrew%20Seamanship%20Manual.pdf`.
  US federal work, cover letter says "Internet release authorized", but every page is watermarked
  "Discontinued ... Reference purposes only". **Chapter 7's double-braid splice is Samson Ocean
  Systems copyright, reprinted by permission: exclude it.**
- **NAVEDTRA 14343 Boatswain's Mate: blocked.** Carries "FOR INDIVIDUAL USE ONLY / NOT TO BE FURTHER
  DISSEMINATED / DISTRIBUTION STATEMENT B".
- **FM 3-05.70: blocked**, confirmed independently a second time. Cover carries the 5 December 2003
  distribution determination plus a destruction notice. Not copyrighted, but not releasable.

---

## Tile 1: Survival Medicine (Ch 4)

**FM 21-76 Ch 4 is not the step source for this tile.** It is prose paragraphs with seven figures,
and two of its instructions are unsafe by current doctrine (see the divergence list below). Use it
only for the survival-specific material the medical manuals do not carry, chiefly the improvised
traction splint.

**The figure source is FM 4-25.11**, not FM 21-76. Fetched from
`https://archive.org/download/FM4-25.11/FM4-25.11.pdf` (224 pp, 2.45 MB), Internet Archive item
tagged Public Domain Mark 1.0, cover verbatim: "DISTRIBUTION RESTRICTION: Approved for public
release; distribution is unlimited." Measured figure counts, not estimated: FM 4-25.11 has 167
distinct figure numbers surviving OCR across 224 pages, a true count of about 175 to 180 after OCR
dropouts, of which Chapter 2 (lifesaving and bleeding) has 39 and Chapter 4 (fractures and
splinting) has 30. FM 21-76 Ch 4 has exactly 7. That is roughly ten times the illustration density,
and the captions sit in the text stream immediately after each figure, so caption-to-image pairing
is machine-extractable.

Related editions, all fetched:

- **TC 4-02.1** (21 Jan 2016, C2 2018), public domain, at `https://ciehub.info/ref/TC/4-02x1_2018.pdf`.
  **Useless for figures: only 3 numbered figures in 120 pages.** It superseded FM 4-25.11 and has
  itself been superseded.
- **ATP 4-02.11** (March 2026) is the current doctrine, public release, no CAC, at
  `https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN46159-ATP_4-02.11-000-WEB-1.pdf` (254 pp,
  12.7 MB), **109 numbered figures** including an illustrated splinting chapter. Check text against
  this; take figures from FM 4-25.11.

### Procedure 1: splint a suspected fracture (author first)

- **Step source.** STP 21-1-SMCT task **081-831-1034**, eight steps with lettered sub-steps.
  Verified in two editions: the 2003 task sheet at
  `https://trainingnco.pbworks.com/f/081-831-1034+Perform+First+Aid+for+a+Suspected+Fracture.pdf`,
  and the 14 December 2007 full manual, whose djvu text I pulled directly from the archive.org item
  `ArmyStp211SoldiersManualOfCommonTasksWarriorSkillsLevel1` (1.21 MB, 232 occurrences of
  "Performance Measures"). Public domain.
  Conditions, verbatim from the 2007 edition: "You see a casualty who has an arm or leg that you
  think is broken. The casualty has no more serious wounds or conditions that have not been
  treated. You will need splint materials (boards, poles, tree branches), padding materials
  (clothing, blanket, dressing, leafy vegetation), and tie materials (strips of cloth, belts)."
  Standards: "Splint the suspected broken arm or leg so that the arm or leg does not move and
  circulation is not impaired."
- **Completion cues. This is the strongest set in the product.** Performance measures, verbatim
  from the 2007 edition:

  > Performance Measures GO NO GO
  > 1. Used splints that reached beyond the joints above and below the fracture.
  > 2. Checked blood circulation below the fracture, both before and after applying the splints.
  > 3. Applied padding between the splints and all bony areas.
  > 4. Used at least four ties (two above and two below the fracture) to secure the splints, if possible.
  > 5. Tied nonslip knots on the splint away from the injury.
  > 6. Immobilized the splinted arm or leg using a sling and/or swathes, as required, to prevent easy movement.
  > 7. Checked the splint for tightness.
  > 8. Watched the casualty for life-threatening conditions and checked for other injuries. Sought medical aid.

  Several are visually checkable against a camera frame with a countable criterion rather than a
  yes/no recollection. Measure 4 gives a literal count to verify. Measure 2 encodes a before/after
  pair, so it is a two-node structure rather than one.
  FM 4-25.11 adds a completion criterion FM 21-76 does not give, verbatim: "A fingertip check can be
  made by inserting the tip of the finger between the bandaged knot and the skin."
  The 2003 sheet also carries a useful assessment sub-step, verbatim: "Check dark-skinned persons by
  depressing the toenail or fingernail beds and seeing how fast the color returns. A slower return
  of color to the injured side indicates a circulation problem."
- **Figure.** FM 4-25.11 Ch 4, 30 figures, one action per figure. ATP 4-02.11 Ch 13 has
  `Figure 13-15. Board splint applied to the fractured forearm` and `Figure 13-23. Improvised splint
  applied to the fractured lower leg or ankle`. FM 21-76 has only figure 4-6, drawn on printed page
  29 while referenced on page 28.
  **FM 21-76's unique contribution is the improvised traction splint**, natural-material
  construction that the medical manuals do not cover, and the reason to keep FM 21-76 in the mix.
  Its text is already step-granular and carries its own end condition: "Continue twisting until the
  broken leg is as long or slightly longer than the unbroken leg."
  `Category:First_aid_diagrams` was fetched, exists, 134 files and 2 subcategories, free licences
  per file (CC0 and CC BY-SA typical). `Category:First aid` was fetched and exists with a large
  subcategory tree including Bandages, Tourniquets, First aid training and SVG first aid.
- **Structured data.** None numeric beyond the four-tie count and the fingertip check, both of which
  are the check.
- **Verdict.** Ready to author today. Best completion measures in the product, countable criteria,
  and unique FM content.

### Procedure 2: control bleeding of an extremity and apply a tourniquet

- **Step source.** STP 21-1-SMCT task **081-831-1032** (2003 and 2007 editions, improvised
  materials) and **081-COM-1032** (11 Sep 2012, commercial CAT), the 2012 manual fetched at
  `https://asktop.net/wp/download/10/stp21_1.pdf`. Public domain.
  2007 conditions and standards, verbatim: "You have a casualty who has a bleeding wound of the arm
  or leg. The casualty is breathing ... Standards: Control bleeding from the wound following the
  correct sequence. Place a dressing over the wound with the sides of the dressing sealed so it does
  not slip. Ensure that the dressings do not have a tourniquet-like effect."
- **Completion cues. Edition choice matters here, and the 2007 edition is much the better source.**
  The 2003 sheet gives six coarse measures ("1. Uncovered the wound. 2. Applied a field dressing.
  3. Applied manual pressure and elevated the arm or leg, if necessary ..."). The 2007 edition
  decomposes the same task into nine measures with lettered sub-measures carrying real dimensional
  criteria. Verbatim from the 2007 djvu text:

  > Performance Measures GO NO GO
  > 1. Uncovered the wound, unless clothing was stuck to the wound or in a chemical environment.
  > 2. Applied the casualty's dressing.
  >    a. Applied the dressing/pad directly over the wound.
  >    b. Covered the edges of dressing/pad.
  >    c. Properly secured the bandage.
  >    d. Did not create a tourniquet-like effect with the dressing.
  > 3. Applied manual pressure and elevated the arm or leg, if necessary.
  > 4. If a field dressing was applied and bleeding continued, applied a pressure dressing.
  >    a. Placed the wad of padding directly over the wound.
  >    b. Tightly wrapped the cloth around the limb.
  >    c. Tied a nonslip knot directly over the wound.
  >    d. Did not create a tourniquet-like effect with the dressing.
  > 5. Applied a tourniquet, if necessary.
  >    a. Improvised tourniquet, if used, was at least 2 inches wide.
  >    b. Tourniquet was placed at least 2 inches above the wound between the wound and the heart
  >       but not on a joint or directly over a wound or a fracture.
  >    c. Tourniquet was properly applied and secured.
  > 6. Performed steps 1 through 5, as necessary, in sequence.
  > 7. If a tourniquet was applied, marked the casualty's forehead with a letter T and the time.
  > 8. If applicable and the situation allowed, saved severed limbs or body parts and transported
  >    them with the casualty.
  > 9. Watched the casualty closely for life-threatening conditions, checked for other injuries
  >    (if necessary), and treated for shock. Sought medical aid.

  Measures 5a and 5b are dimensional and camera-checkable. Measure 6 is a *sequence* assertion, so
  it is a walk-level check, not a node-level one. The "if necessary" tails on 3, 4 and 5 mean the
  walk needs branch-aware completion rather than a linear checklist.
- **Figure.** FM 4-25.11 gives one figure per action for tourniquet application, captions in the
  text stream: `Figure 2-32. Tourniquet above knee.`, `Figure 2-33. Rigid object on top of
  half-knot.`, `Figure 2-34. Full knot over rigid object.`, `Figure 2-35. Stick twisted.`,
  `Figure 2-36. Tie free ends on side of limb.` That is a five-node walk with a dedicated figure per
  node, which FM 21-76's single figure 4-4 cannot support. FM 21-76 contributes 4-2 pressure
  dressing, 4-3 pressure points, 4-4 tourniquet and 4-7 dressings, four figures for the whole
  procedure. `Category:Tourniquets` was fetched, exists, and returned 27 files plus 4 subcategories
  (Bloodletting, Esmarch bandage, Intravenous therapy, Venipunctures), mostly military medical
  training photographs.
- **Structured data.** TCCC Guidelines, 25 January 2024 (CoTCCC / Joint Trauma System, DoD, public
  domain), verbatim: "Every effort should be made to convert tourniquets in less than 2 hours if
  bleeding can be controlled with other means. Do not remove a tourniquet that has been in place
  more than 6 hours unless close monitoring and lab capability are available." Conversion requires
  three criteria: the casualty is not in shock, the wound can be monitored closely for bleeding, and
  the tourniquet is not controlling an amputation.
  Checkable numbers for nodes: 2 h conversion target, 6 h hard ceiling, tourniquet at least 2 inches
  wide, placed 2 to 3 inches above the wound, success condition the absence of a distal pulse.
- **Verdict.** Ready to author today, but **the FM 21-76 doctrine conflict must be resolved first**
  (below). Best per-step figure coverage of any procedure in the product.

### Procedure 3: heat injuries

- **Step source.** STP 21-1-SMCT task **081-831-1008**. Step 1 enumerates symptoms for heat cramps
  (3), heat exhaustion (12), and heatstroke (9); step 2 gives treatment per type.
- **Completion cues. This task is the counter-example that shows the STP format is not uniformly
  useful.** Its entire performance-measure list, verbatim from the 2007 edition, is three lines:
  "1. Identified the type of heat injury. 2. Provided the proper first aid for the heat injury.
  3. Watched the casualty closely for life-threatening conditions, checked for other injuries, and
  sought medical aid." Two measures for a twenty-symptom, sixteen-action task. Derive nodes from the
  performance *steps* and author the cues against CDC and NIOSH numbers.
  **The symptom lists themselves are the valuable part, because they are visually observable and
  mutually exclusive**, which makes this an identification walk rather than a process walk.
  Verbatim contrast from the 2007 text: heat exhaustion is "Profuse sweating with pale, moist, cool
  skin" while heatstroke is "Red (flushed), hot, dry skin". A camera can separate those two.
- **Figure.** FM 21-76 has none for heat injury. FM 4-25.11 and ATP 4-02.11 are the sources.
- **Structured data.** CDC/NIOSH `https://www.cdc.gov/niosh/heat-stress/about/illnesses.html`
  (reachable by curl with browser headers; WebFetch gets 403), verbatim: "When heat stroke occurs,
  the body temperature can rise to 106 degrees F or higher within 10 to 15 minutes." Heat-cramp
  fluid replacement every 15 to 20 minutes; seek medical help if cramps do not subside within 1
  hour; cooling target "cold wet cloths or ice on head, neck, armpits, and groin".
  NWS heat index, Rothfusz regression, fetched from
  `https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml`:

  ```
  HI = -42.379 + 2.04901523*T + 10.14333127*RH - 0.22475541*T*RH
       - 0.00683783*T*T - 0.05481717*RH*RH + 0.00122874*T*T*RH
       + 0.00085282*T*RH*RH - 0.00000199*T*T*RH*RH
  ```

  T in degrees F, RH in percent. Adjustments: subtract `[(13-RH)/4]*SQRT{[17-ABS(T-95)]/17}` when
  RH is below 13 percent and T is 80 to 112; add `[(RH-85)/10]*[(87-T)/5]` when RH is above 85
  percent and T is 80 to 87. Screening form first:
  `HI = 0.5*{T + 61.0 + [(T-68.0)*1.2] + (RH*0.094)}`, averaged with T; if 80 F or above, recompute
  with the full regression.
  Risk bands, independently verified at `https://www.weather.gov/ama/heatindex`: Caution 80 to 90 F
  "Fatigue possible with prolonged exposure and/or physical activity"; Extreme Caution 90 to 103 F;
  Danger 103 to 124 F; Extreme Danger 125 F and above "Heat stroke highly likely". Values assume
  shade and light wind, and **direct sun adds up to 15 F**.
- **Verdict.** Ready to author today as an identification walk plus a short treatment walk, with
  cues authored rather than lifted.

### Safety divergences that must be flagged in-app before any medicine node ships

1. **Tourniquet loosening.** FM 21-76 Ch 4 verbatim: "A lone survivor does not remove or release an
   applied tourniquet. In a buddy system, however, the buddy can release the tourniquet pressure
   every 10 to 15 minutes for 1 or 2 minutes to let blood flow to the rest of the extremity to
   prevent limb loss." Current TCCC forbids this and directs a single controlled conversion. A
   full-text search of the 2024 guidelines for "loosen" and "release" returns no tourniquet hit.
   Ship the 2 h / 6 h conversion rule instead.
2. **Tourniquet as last resort.** FM 21-76 subordinates the tourniquet to all other methods; TCCC
   makes it the first action for life-threatening extremity haemorrhage.
3. **Tick removal.** FM 21-76 Ch 4 verbatim: "If you find ticks attached to your body, cover them
   with a substance, such as Vaseline, heavy oil, or tree sap, that will cut off their air supply."
   CDC advises against smothering and directs pulling straight out with tweezers grasped close to
   the skin. The FM's own next sentence already says "Use tweezers if you have them", so the
   smothering advice should simply be dropped.
4. **Placement distance.** FM 21-76 says 5 to 10 cm above the wound where both STP editions say 2
   to 4 inches (2003) or 2 to 3 inches (2012).

**American Red Cross and AHA guidelines are copyrighted and unusable for text reuse.** Consult them
only to identify divergences from the older FM guidance; do not lift wording.

---

## Tile 11: Environments (Ch 13-16)

### Procedure 1: desert water discipline (Ch 13)

- **Step source.** FM 21-76 Ch 13, public domain. **Unusually for this manual, it carries its own
  numeric completion criteria**, verbatim: "At temperatures below 38 degrees C, drink 0.5 liter of
  water every hour. At temperatures above 38 degrees C, drink 1 liter of water every hour." Anchor
  figure: "a person performing hard work in the sun at 43 degrees C requires 19 liters of water
  daily." Rule: "Do not ration your water!" Conservation steps are a bulleted list, including
  "Conserve your sweat. Wear your complete uniform to include T-shirt. Roll the sleeves down, cover
  your head, and protect your neck with a scarf or similar item."
- **Completion cues.** No GO/NO-GO source exists. The closest Army analogue, STP 21-24-SMCT task
  081-831-9000 *Implement Preventive Medicine Measures*, fetched from
  `https://www.militarynewbie.com/wp-content/uploads/2013/11/STP-21-24-SMCT-SOLDIERS-MANUAL-OF-COMMON-TASKS-SKILL-LEVELS.pdf`,
  lists prevention as leader-training content, not per-step measures.
  **The cues here are authorable from the FM's own numbers**, and the clothing steps are directly
  camera-verifiable: sleeves down, head covered, neck covered.
- **Figure.** Ch 13 has only 13-1 (shade construction) and 13-2 (daily water requirement chart, a
  table graphic needing page-render and crop). Two figures for a whole chapter, so most desert nodes
  need photography from elsewhere.
- **Structured data.** The 0.5 and 1 litre per hour thresholds against measured or forecast
  temperature. This is the only environment chapter whose own text carries a threshold a node can
  check.
- **Verdict.** Ready to author today. Author this one first in the tile.

### Procedure 2: sea survival, raft boarding and cold-water immersion (Ch 16)

- **Step source.** FM 21-76 Ch 16, public domain, and **the best-illustrated chapter in the manual**:
  19 figures for one chapter against 7 for all of Chapter 4. Step text is already procedural, e.g.
  verbatim: "Before boarding any raft, remove and tether (attach) your life preserver to yourself or
  the raft. Ensure there are no other metallic or sharp objects on your clothing or equipment that
  could damage the raft. After boarding the raft, don your life preserver again."
- **Completion cues.** None in GO/NO-GO form, and no STP task covers raft procedures. The FM does
  give one inspectable state, verbatim: chambers are "firm (well rounded) but not overly tight
  (Figure 16-4). Check inflation regularly."
- **Figure.** 16-1 rescue procedures, 16-4 inflation chambers, 16-5 and 16-6 sea anchor (16-6
  verified crisp at 200 dpi on printed page 168), 16-9 and 16-10 boarding the one-man raft, 16-11
  spray shield, 16-13 and 16-14 righting and boarding, 16-17 and 16-18 repair and puncture, 16-19
  sail rigging. Best figure coverage of any PROCESS chapter.
- **Structured data.** FM 21-76 **figure 16-7**, read off the rendered page 168, which is a clean
  legible table:

  | Water temperature | Life expectancy |
  | --- | --- |
  | 21.0 to 15.5 C (70 to 60 F) | 12 hours |
  | 15.5 to 10.0 C (60 to 50 F) | 6 hours |
  | 10.0 to 4.5 C (50 to 40 F) | 1 hour |
  | 4.5 C (40 F) and below | less than 1 hour |

  Figure note: "Wearing an antiexposure suit may increase these times up to a maximum of 24 hours."
  FM text adds that heat exchange in water is "about 25 times greater than it is in air of the same
  temperature", and "keep your head and neck out of the water ... when the temperature is below 19
  degrees C."
  NWS `https://www.weather.gov/safety/coldwater`, fetched: cold shock gasping occurs during "the
  first 2-3 minutes"; "Cold shock can be just as severe and dangerous from water temperatures of
  50-60F (10-15C) as it is from water at 35F (2C)"; gasping "can be triggered by water as warm as
  77F (25C)"; "The onset of hypothermia begins when core body temperature drops to 95F (35C)."
  CDC/NIOSH: "Hypothermia can occur in any water temperature below 70F."
  NOAA NCEI sea state, WMO Code 3700, fetched from
  `https://www.ncei.noaa.gov/access/world-ocean-database/CODES/s_18_sea_state.html`: 0 Calm glassy
  0 m; 1 Calm rippled 0 to 0.1; 2 Smooth wavelet 0.1 to 0.5; 3 Slight 0.5 to 1.25; 4 Moderate 1.25
  to 2.50; 5 Rough 2.50 to 4.0; 6 Very rough 4 to 6; 7 High 6 to 9; 8 Very high 9 to 14;
  9 Phenomenal over 14. The NCEI transcription is a federal work, so cite NCEI rather than WMO, and
  do not label it "Douglas", which is a separate Royal Navy scale.
  Signalling numbers sit in Ch 19 rather than 16: star clusters "reach a height of 200 to 215
  meters, burn an average of 6 to 10 seconds, and descend at a rate of 14 meters per second"; the
  pen flare "fires the flare about 150 meters high"; "Red is the international distress color."
  **UNVERIFIED, do not ship:** the canonical three-column USCG table (Water Temperature /
  Exhaustion or Unconsciousness / Expected Survival Time). No federal source could be fetched:
  `dco.uscg.mil` 403, `uscgboating.org` 404, `weather.gov/safety/coldwater-hypothermia` 404,
  `cdc.gov/niosh/fishing/...` 403. Two USCG **Auxiliary** pages carrying a 1-10-1 principle and a
  survival table were fetched but are signed by individual volunteer authors on a `.info` domain
  with the disclaimer that the views "are not necessarily those of the Department of Homeland
  Security or the U.S. Coast Guard". **Federal authorship is not established, so treat them as not
  confirmed public domain.** One of those pages actively disputes the classic table.
- **Verdict.** Ready to author today, with figure 16-7 as the shippable table and the USCG table
  left out.

### Procedure 3: cold weather layering and frostbite checks (Ch 15)

- **Step source.** FM 21-76 Ch 15 for survival context, **CDC and NIOSH for recognition and
  treatment**, because FM 21-76's own wind chill figure is obsolete.
  CDC/NIOSH `https://www.cdc.gov/niosh/cold-stress/about/related-illness.html`: hypothermia early
  symptoms shivering, fatigue, loss of coordination, confusion and disorientation; late symptoms no
  shivering, blue skin, dilated pupils, slowed pulse and breathing, loss of consciousness. Frostbite
  symptoms reduced blood flow to hands and feet, numbness, tingling or stinging, aching, bluish or
  pale waxy skin, plus "A white or grayish-yellow skin area" and "Skin that feels unusually firm or
  waxy". First aid: get into a warm room, do not walk on frostbitten feet, immerse in warm not hot
  water, warm with body heat, **do not rub or massage**, and do not use a heating pad, heat lamp,
  stove, fireplace or radiator.
  Trench foot occurs at temperatures as high as 60 F with constantly wet feet, and "wet feet lose
  heat 25 times faster than dry feet". Chilblains come from repeated exposure from just above
  freezing up to 60 F, and the damage is permanent.
- **Completion cues.** One hard threshold, verbatim from
  `https://www.cdc.gov/winter-weather/prevention/index.html`: "Hypothermia is a medical emergency.
  If you notice any of the above signs, take the person's temperature. If it is below 95 degrees F,
  get medical attention immediately!" Also: hypothermia "can occur even at cool temperatures (above
  40 F) if a person becomes chilled from rain, sweat, or submersion in cold water."
  The buddy-check cue has an Army source, STP 21-24-SMCT 081-831-9000, verbatim: "Use the buddy
  system to spot frostbite on exposed skin", with the layering steps "Wear clothing in loose layers.
  (Avoid tight-fitting clothing.)" and "Keep clothing clean and dry."
  **UNVERIFIED: CDC publishes no numeric mild/moderate/severe hypothermia staging on these pages,
  only the 95 F action threshold. Do not ship a 90 F / 82 F staging table citing CDC.**
- **Figure, and a defect to act on.** Ch 15 has 15-1 through 15-7: 15-2 do's and don'ts for cold
  injuries, 15-3 snow goggles, 15-4 snow cave, 15-5 and 15-6 shelters, 15-7 stove. Note that figure
  15-4 is one plate covering four different shelters, panelizable per shelter type but not per step.
  **Figure 15-1 must not be shipped.** Rendering printed page 147 confirms it is the pre-2001
  Siple-Passel wind chill table, printed sideways, low resolution, with the obsolete banding
  "LITTLE DANGER / INCREASING DANGER (Flesh may freeze within 1 minute) / GREAT DANGER (Flesh may
  freeze within 30 seconds)". The FM's own text example gives -23 C for -10 C at 15 kt; the NWS 2001
  formula gives -19 C for the same inputs. NWS replaced the index on 1 November 2001 precisely
  because the old one overstated the chill. Replace figure 15-1 with a chart rendered from the NWS
  formula.
- **Structured data.** NWS 2001 wind chill, verified independently by me from the official NWS PDF
  `https://www.weather.gov/media/epz/wxcalc/windChill.pdf` and corroborated at
  `https://www.weather.gov/media/safety/windchillchart3.pdf`:

  ```
  Wind Chill (F) = 35.74 + 0.6215*T - 35.75*(V^0.16) + 0.4275*T*(V^0.16)
  ```

  T in degrees F, V in mph. Valid at T of 50 F or below and V above 3 mph. The same NWS sheet gives
  a heat-loss form in metric units, `WindChill (W/m^2) = (12.1452 + 11.6222*sqrt(V) - 1.16222*V) *
  (33 - T)`, with T in C and V in m/s, and directs the reader to convert to F and mph for the
  temperature form.
  Frostbite bands from the official graphic legend: 30 minutes, 10 minutes, 5 minutes. The bands
  depend on T and V separately, not on wind chill alone. Practical machine rule read off the band
  boundaries: the 10-minute band starts around a wind chill of -19 to -24 F and the 5-minute band
  around -64 to -72 F, with the exact column varying by wind speed, plus or minus one column,
  because these are pixel reads of a raster chart.
  **UNVERIFIED:** the metric temperature-form wind chill equation could not be found on any
  fetchable US federal page, and the OFCM closed-form frostbite-time equation is unavailable
  (`https://www.wpc.ncep.noaa.gov/html/on25.shtml` returns 404, ofcm.gov unreachable).
- **Verdict.** Ready to author today. **Figure 15-1 must be replaced before shipping**, which is a
  correctness fix, not a cosmetic one.

### Chapter 14, tropical: defer

The weakest of the four environments for this product. One figure (14-1, jungle vegetation layers),
and the chapter is descriptive rather than procedural. No STP task maps to it.

---

## Readiness summary

| Tile | Procedure | Steps | Cues | Figure | Verdict |
| --- | --- | --- | --- | --- | --- |
| Survival Medicine | Splint a suspected fracture | STP 081-831-1034 | **GO/NO-GO, countable** | FM 4-25.11 Ch 4, 30 figures | Author today |
| Survival Medicine | Control bleeding, tourniquet | STP 081-831-1032 (2007) | **GO/NO-GO, dimensional** | FM 4-25.11 figs 2-32..2-36, one per action | Author today, after resolving the FM doctrine conflict |
| Survival Medicine | Heat injuries | STP 081-831-1008 | Coarse, author your own | FM 4-25.11 | Author today as identification |
| Shelter | Poncho lean-to | FM 21-76 Ch 5 | Dimensions only | Commons PD-USGov, end state | Author today |
| Shelter | Debris hut | FM 21-76 Ch 5 | 1 m and 30 cm thicknesses | Commons PD-USGov, end state | Author today |
| Shelter | Tree-pit snow shelter | FM 21-76 Ch 5 | None | Commons PD-USGov | Author today, low priority |
| Fire | Site prep and Dakota fire hole | FM 21-76 Ch 7 | "at least 1 meter in diameter" | Commons PD-USGov | Author today |
| Fire | Fire lays, tepee and pyramid | FM 21-76 Ch 7 | Dimensions only | Commons, 4 panels by type | Author today |
| Fire | Bow and drill | FM 21-76 Ch 7 | Component dimensions | **Commons Bow drill, 32 files with a step series** | Author today |
| Water | Belowground solar still | FM 21-76 Ch 6 | Three conditions in one step | Commons PD-USGov, end state | Author today |
| Water | Making water safe to drink | EPA, CDC, TC 4-02.3, FM 21-76 | **STP 081-831-1043 GO/NO-GO** | Fig 6-9 plus native tables | Author today |
| Water | Pole ford and roped crossing | FM 21-76 Ch 17 | Positional, checkable | **Fig 17-3, 3 panels, needs extraction** | Author today after one crop |
| Tools and Cordage | Bowline | **TC 3-97.61 8-78..8-80** | **Checkpoints block** | TC fig 8-19 plus Commons series | Author today |
| Tools and Cordage | Prusik | **TC 3-97.61 8-90..8-94** | **Checkpoints block** | TC figs 8-23/8-24 plus Commons 5-step | Author today |
| Tools and Cordage | Square and shear lashing | FM 5-125 | Countable turns | End state only | **Blocked on figures** |
| Direction Finding | Shadow-tip method | FM 3-25.26 9-5a | None, but computable | **Fig 18-1, 3 panels, on Commons** | Author today |
| Direction Finding | Watch method | FM 3-25.26 9-5b | Self-correction procedure | Fig 18-2, on Commons | Author today |
| Direction Finding | Improvised floating compass | FM 21-76 Ch 18 | Outcome only | **None anywhere** | **Blocked on figures** |
| Signaling | Ground-to-air code panel | FM 21-76 Ch 19 | 1:6 ratio, contrast | **FAA PD-USGov on Commons** | Author today, resolve dimension conflict |
| Signaling | Signal mirror aiming | FM 21-76 figs 19-3..19-5 | Safety limits only | **Commons Signalling mirrors, 53 files** | Author today |
| Signaling | Signal fires and smoke | FM 21-76 Ch 19 | None | Figs 19-1, 19-2 (19-2 on Commons) | Author today |
| Environments | Desert water discipline | FM 21-76 Ch 13 | **0.5 / 1 L per hour threshold** | Only 2 figures in the chapter | Author today |
| Environments | Sea raft procedures | FM 21-76 Ch 16 | Inflation state | **19 figures, best in the manual** | Author today |
| Environments | Cold layering and frostbite | CDC/NIOSH plus FM Ch 15 | **95 F threshold** | **Fig 15-1 must be replaced** | Author today after the swap |
| Man-Made Hazards | Personal decontamination | **STP 031-COM-1006** | **GO/NO-GO plus time budget** | **Commons Decontamination, 154 files** | Author today |
| Man-Made Hazards | Expedient fallout shelter | FM 21-76 Ch 23, FM 3-11.3 | 1.5 m clearance | **No procedural art in the FM** | **Blocked on figures** |
| Man-Made Hazards | Safe water after release | FM 21-76 Ch 23, EPA | Observation criteria | Reuse fig 6-9 | Author today |

### Blocked on a figure source

- **Square and shear lashing.** Only end states exist. `Category:Square_lashing` and
  `Category:Shear_lashing` do not exist on Commons. Commission step artwork.
- **Improvised floating compass.** No figure in FM 21-76 Ch 18 and no Commons category. Commission.
- **Expedient fallout shelter.** FM 21-76 Ch 23 has one figure and no procedural art. Use Commons
  `Category:Sandbags` subcategory Sandbag filling, 121 files, largely FEMA and National Guard PD.
- **Figure 7-4** (tinder, kindling and fuel types) is not on Commons; render printed page 64.
- **Figure 17-3** (roped crossing) is not on Commons; render printed page 188. One crop, and it is
  the best per-step plate in the Water tile.
- **Figure 15-1** is not blocked but is **wrong**, and must be replaced with an NWS 2001 chart.

### Licence ledger

| Source | Verdict |
| --- | --- |
| FM 21-76 (1992) | US Gov work, public domain, "approved for public release; distribution is unlimited" |
| FM 4-25.11 (2002) | Public domain, public release unlimited. **Best first-aid line art** |
| ATP 4-02.11 (Mar 2026) | Public domain, public release, current doctrine, 109 figures |
| TC 4-02.1 (2016/2018) | Public domain, but only 3 figures in 120 pages |
| STP 21-1-SMCT (1990, 2003, 2007, 2012, 2017) | Public domain, public release unlimited |
| TC 3-97.61 (Nov 2025) | Public domain, public release unlimited. **Best knot format** |
| FM 5-125 (1995/2001) | Public domain, public release unlimited |
| TM 3-34.86 (2012) | PDF says public release; armypubs catalogue tags NOFORN. **Conflict, prefer FM 5-125** |
| FM 3-25.26 (2001), FM 3-11.3 (2006), FM 3-11.5 (2006), TC 4-02.3 (2015) | Public domain, public release |
| **FM 3-05.70 (2002)** | **Blocked.** Distribution authorized to US Government agencies and contractors only, 5 Dec 2003, plus a destruction notice. Confirmed twice independently |
| **NAVEDTRA 14343** | **Blocked.** Distribution Statement B, not to be further disseminated |
| USCG Boat Crew Seamanship M16114.5C | Federal work, internet release authorized, but watermarked discontinued. **Ch 7 double-braid splice is Samson Ocean Systems copyright: exclude** |
| EPA, CDC, NIOSH, NWS, NOAA, NCEI, FEMA, FAA, USDA Forest Service | US federal works, public domain |
| CDC Yellow Book | Public domain, stated at the NCBI mirror footer |
| TCCC Guidelines (2024) | DoD Joint Trauma System, public domain |
| 33 CFR Part 87 (SOS) | US Gov, public domain, unauthenticated eCFR API |
| **WHO** | **CC BY-NC-SA 3.0 IGO. The NC clause blocks commercial distribution** |
| **PRISM Vol 2 (BARDA-funded)** | **CC BY-NC-SA 4.0.** Federally funded is not federally authored. Numbers only, write original prose |
| **ITU-R M.1677-1** | Redistribution restricted. The timing numbers are facts |
| **ICAO Annex 12** | ICAO copyright. Quote the number, do not reproduce the table. Fetched only from an unofficial mirror: UNVERIFIED at source |
| **American Red Cross, AHA** | **Copyrighted, unusable for text reuse** |
| **Civil Air Patrol** | **Unusable.** 36 U.S.C. 40306 vests exclusive copyright in the corporation |
| USCG Auxiliary volunteer pages | **Not confirmed public domain.** Volunteer-authored, disclaimed |
| Commons knot imagery | Mostly CC BY-SA and GFDL, **not** public domain. Budget a per-image attribution surface and honour share-alike |

### Consolidated UNVERIFIED list

- Halogen contact time by water temperature (5, 15, 25 C) and a numeric chlorine dioxide contact
  time against Cryptosporidium. The 2026 Yellow Book dropped the table; cdc.gov 403s; eCFR 40 CFR
  141.720 redirects.
- The canonical USCG cold-water survival-time table. No federal source fetchable.
- The metric temperature-form wind chill equation from a US federal page, and the OFCM closed-form
  frostbite-time equation (`on25.shtml` returns 404).
- CDC numeric hypothermia staging bands. CDC publishes only the 95 F threshold.
- TC 3-97.61 snow-trench content and figure numbering; no mirror could be fetched.
- FM 31-70 and FM 31-71 (cold weather): not fetched at all.
- ATP 3-90.97 shelter and snow-cave content; the Internet Archive item is marked Public Domain Mark
  1.0 but the content is unverified.
- STP 21-1-SMCT 20 Nov 2025 full text. Armypubs serves it only from the CAC-gated tree.
- STP 21-1-SMCT 2015, 2017 and 2023 task lists for signaling.
- The 1944 US Navy "Knots, Bends, Hitches, Splices" is **not on Commons**; do not plan around it.
- Ashley's Book of Knots US copyright status. Use Commons redraws, exclude scans.
- The FAA AIM PDF edition. The HTML edition's figure images are blank 143-byte placeholders.
- ICAO Annex 12 at source (icao.int unfetchable).
- Signal mirror flash intensity in candlepower; it appears in no fetchable manual.
- Per-file licences inside Commons `Category:Signalling_mirrors` and
  `Category:Mission_Oriented_Protective_Posture`.
- USNO API rate limits, stated nowhere.

### Host notes for the pipeline

Blocked to fetchers but fine with a browser user agent: globalsecurity.org, cdc.gov, chemm.hhs.gov,
medicalcountermeasures.gov. Blocked outright: ready.gov, fema.gov PDF paths (use the identical file
on remm.hhs.gov), ecfr.gov HTML (use the versioner API), USCG media.defense.gov. Archive.org needs
the exact `_djvu.txt` filename from `https://archive.org/metadata/<item>`; guessing the name returns
a 404 HTML page of 146 bytes.

---

## Late corrections and additions

### The local PDF is an activist reprint, so cite the Commons scan instead

The two statements about the local file are both true, and together they settle its provenance. The
running page header on every page reads "Reprinted as permitted by U.S. Department of the Army".
The title page reads "Reprinted as NOT permitted by U.S. Department of the Army, but by we the
citizenry who paid for it". It carries no publication date line. It is a third-party reprint with
its own editorial framing.

The underlying FM 21-76 is a US Government work and public domain, so the text and figures are
free. But for a licence trail a reviewer can follow, cite
`https://commons.wikimedia.org/wiki/File:FM_21-76_Survival_June_1992.pdf` (646 pp, dated 5 June
1992, "approved for public release; distribution is unlimited") and keep the local 233-page reprint
as a working copy only. Note the page counts differ (646 against 233), so **printed page numbers
quoted in this document refer to the local reprint** and do not transfer to the Commons scan.

### FM 5-125 gives ordered steps for lashings but not for knots

Worth stating precisely, because it decides what to author from which manual. Each **knot** in FM
5-125 gets a use-and-property paragraph plus "see Figure 2-N", and the tying sequence lives entirely
in the figure plate. Each **lashing** gets ordered prose steps with countable quantities. So author
lashings from FM 5-125 text and knots from TC 3-97.61 text.

Confirmed by grep across FM 5-125, FM 3-25.26, STP 21-1 and FM 21-76: **the only prusik mention in
any of them is one passing clause in FM 21-76 about a parachute hammock.** TC 3-97.61 is the sole
source for the prusik.

TC 3-97.61 Chapter 8 knot inventory, for planning: overhand and inline figure eight, figure-eight
slip, figure eight on a bight, rerouted figure eight, two-loop figure eight, directional figure
eight, alpine butterfly, figure-eight bend, water knot, flat overhand, double fisherman's, square
knot, bowline, triple bowline, bowline on a bight, girth hitch, middle- and end-of-rope prusik,
autoblock, klemheist, Bachmann, clove hitch, Munter, super Munter, Munter mule, Garda, big honking
knot, and a field-expedient harness. Figures 8-1 to 8-38, one per knot. **No lashings.**
TC figure 8-6 is a rope-tying terminology plate and is worth authoring as a glossary node, because
every Checkpoints block uses bight, standing part and running end precisely.

### Add figures 19-3, 19-4 and 19-5 to the extraction list

The signal mirror procedure is unreachable without them, and they were missing from the brief's
figure list because the in-text references are line-broken or plural. FM 21-76 defers the aiming
procedure to the figures: "If you have an MK-3 signal mirror, follow the instructions on its back
(Figure 19-3)" and "Figures 19-4 and 19-5 show methods of aiming a signal mirror for signaling."
19-4 and 19-5 carry the actual procedure.

### Chapter 19 numbers worth shipping as pack data

All verbatim from FM 21-76 Ch 19: signal fires three in a triangle or a straight line about 25
metres apart; three columns of smoke is the international distress signal; pen flare about 150 m
high and about 3 cm diameter; star clusters 200 to 215 m, burn 6 to 10 seconds, descend at 14 m/s;
star parachute flares 200 to 215 m, descend at 2.1 m/s, M126 red burns about 50 seconds, M127 white
about 25 seconds, visible at 48 to 56 km at night; strobe 60 flashes per minute; whistles heard up
to 1.6 km; sea dye markers conspicuous about 3 hours; red is the international distress colour.

SOS as FM 21-76 states it: "three dots, three dashes, three dots ... A dot is a short, sharp pulse;
a dash is a longer pulse. Keep repeating the signal. When using flags, hold flags on the left side
for dashes and on the right side for dots."

### USNO /celnav verified live with real values, which makes shadow-tip scoreable

`https://aa.usno.navy.mil/api/celnav?date=2026-08-15&time=20:14:00&coords=37.77,-122.42` returned
Sun `zn` 179.928 degrees, `hc` 66.073, `dec` 13.843 at solar noon for San Francisco: due south, as
it must be. That is a direct validator for a shadow-tip north line, comparing the drawn line's
bearing against 90 degrees off the solar azimuth. Endpoints available: `/rstt/oneday`, `/celnav`,
`/siderealtime`, `/moon/phases/date`, `/moon/phases/year`, `/seasons`, `/eclipses/solar/date`,
`/juliandate`, `/calendardate`, `/daylightsaving`. It is a network dependency, so it validates
during pack authoring rather than in the field; the offline path is the Meeus port from the NOAA
spreadsheet.

`WMM.COF` unzips to **4,554 bytes**, which is trivially bundleable. That single file is what turns
the improvised-compass and shadow-tip nodes from displayed to checked.

### The two cue shapes, restated as a recommendation

STP performance measures are **task-level and event-shaped**, one or two per task, scored at the
end ("Determined the correct azimuth within 3 degrees"). TC 3-97.61 Checkpoints are
**artifact-level and state-shaped** ("Six complete turns with a locking bar", "approximate 4-inch
tail"). For a node that shows a reference figure beside a live camera and asks whether a step is
complete, **the TC checkpoint form is the one to model on, because it describes the object the
camera is looking at rather than the event that produced it.** Take the pass/fail semantics and the
numeric-tolerance idea from STP, and the per-step wording from TC 3-97.61.

The exception is Survival Medicine, where the 2007 STP measures are already decomposed to
sub-measure level with dimensional criteria, and are the better model.
