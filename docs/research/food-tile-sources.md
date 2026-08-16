# Food tile sources (FM 21-76 Ch 8 and 9)

Scope: tile 5 in `docs/prd.md` section 1.3, the one tile no brief covers. It carries both synoptic
forms of PRD 1.4: PROCESS for traps, fishing, game preparation and preserving, IDENTIFICATION for
edible plants, plus one timed checklist (the universal edibility test) that is neither.

Every source below was fetched unless marked UNVERIFIED. Licence verdicts use the three values in
`process-node-sources.md`: shippable, reference only, unusable.

This project produces no datasets, footage, or artwork. Where no open figure source exists the item
ships without camera judgement and the row says so.

---

# Part 1: PROCESS procedures

## Findings that apply to the whole tile

### FM 21-76 Ch 8 is the densest figure chapter in the manual for traps and fishing

Extracted from the local `FM21-76_SurvivalManual.pdf` text layer, printed pages 72 to 98. Chapter 8
references figures 8-1 through 8-28. The trap, fishing and butchering procedures each carry their
own figure number, which is unusual in this manual:

| Figure | Subject | Printed page |
| --- | --- | --- |
| 8-5 | Simple snare | 80 |
| 8-6 | Drag noose | 80 |
| 8-7 | Twitch-up snare | 81 |
| 8-8 | Squirrel pole | 82 |
| 8-9 | Ojibwa bird pole | 82 |
| 8-10 | Noosing wand | 83 |
| 8-11 | Treadle spring snare | 83 |
| 8-12 | Figure 4 deadfall | 84 |
| 8-13 | Paiute deadfall | 85 |
| 8-14 | Bow trap | 86 |
| 8-15 | Pig spear shaft | 86 |
| 8-16 | Bottle trap | 87 |
| 8-17 | Improvised fishhooks (incl. the gorge) | 89 |
| 8-18 | Stakeout | 89 |
| 8-19 | Gill net construction | 90 |
| 8-20 | Gill net in use | 90 |
| 8-21 | Fish traps and the tidal stone weir | 91 |
| 8-22 | Improvised spear | 92 |
| 8-24 | Skinning a snake | 95 |
| 8-25 | Skinning and butchering large game | 96 |
| 8-26 | Skinning small game | 96 |
| 8-27 | Smoking meat in an enclosure | 97 |
| 8-28 | Smoking meat in a pit | 97 |

### FM 21-76 Ch 8 states steps, not completion criteria

Same finding as every other FM 21-76 chapter (`process-node-sources.md`, "FM 21-76 text carries
steps, not completion criteria"). The trap procedures are imperative prose with embedded
dimensions, and the dimensions are the only checkable quantity. No step states a pass/fail test.
Nothing in the chapter resembles TC 3-97.61's "the following must be true" checkpoint block or
STP 21-1-SMCT's countable GO/NO-GO performance measures.

The FM's own embedded dimensions, which are the raw material for authored criteria:

- Squirrel pole: pole nooses `5 to 6 centimeters in diameter`, standing off `about 2.5 centimeters`
  from the pole, top and bottom nooses `45 centimeters` from the pole ends.
- Ojibwa bird pole: pole `1.8 to 2.1 meters`, perch hole `5 to 7.5 centimeters` below the top,
  perch `10 to 15 centimeters`, counterweight `about equal to the weight of the targeted species`.
- Treadle spring snare: trigger stick `5 centimeter or so`.
- Paiute deadfall: catch stick `about 5 centimeters`, cord `halfway around the vertical stick with
  the catch stick at a 90-degree angle`.
- Bottle trap: hole `30 to 45 centimeters deep`, wider at the bottom than the top, cover held
  `2.5 to 5 centimeters off the ground`.
- Smoking: slices `no more than 6 centimeters thick`, `none of the meat touches another piece`.
- Drying: strips `6-millimeter` cut with the grain.
- Pig spear shaft: pole `about 2.5 meters`.

### The figure-four deadfall is the thinnest procedure in the chapter

FM 21-76's entire figure-four text is three sentences: "The figure 4 is a trigger used to drop a
weight onto a prey and crush it (Figure 8-12). The type of weight used may vary, but it should be
heavy enough to kill or incapacitate the prey immediately. Construct the figure 4 using three
notched sticks. These notches hold the sticks together in a figure 4 pattern when under tension.
Practice making this trigger before-hand; it requires close tolerances and precise angles in its
construction."

There are no ordered steps, no stick lengths, and no notch angles. Figure 8-12 carries the whole
procedure. A per-step walk needs the notch geometry from a second source, and the FM concedes the
tolerance problem itself. The Paiute deadfall immediately after it is better specified in text
(five ordered actions, one dimension) and the FM says it is "easier to set than the figure 4",
which makes it the better first authoring target of the two.

### Legality gate, and it is not a licence question

Snaring, deadfalls, gill nets, fish traps, fish poison and the bow trap are illegal for most
species in most US states outside a declared emergency. Any state agency source (Part 1 sources
below) states this on its own face. The FM's bow trap and pig spear shaft carry the FM's own
"This is a lethal trap" warnings and are hazards to people. This is a product decision, not a
sourcing one, and it belongs in the node's scope banner (PRD 1.5).

### Correction to the earlier Commons audit: it undercounted, and it undercounted exactly here

The brief that seeded this task recorded `insource:"FM 21-76"` in the File namespace as returning 40
files, all public domain. Re-run today the same query returns **42** and misses three Food-tile
figures, because their file pages credit "U.S. Army Field Manual, No. 21-76, Survival" and never
write the string `FM 21-76`.

Two better queries, both run against `commons.wikimedia.org/w/api.php`:

- `insource:"21-76" insource:/[Ss]urvival/`, namespace 6, returns 46.
- `list=categorymembers` on `Category:United States Army Field Manual 21-76` returns 33 files, and
  is the authoritative set. The sibling `Category:United States Army Field Manual 21-76-1` returns 13.

The three Food-tile crops the earlier audit missed, each verified public domain through
`prop=imageinfo&iiprop=extmetadata` with `Artist: U.S. Army`:

| File | Size | FM figure | URL |
| --- | --- | --- | --- |
| `Figure 4 deadfall.gif` | 450 x 383 | 8-12 | `https://upload.wikimedia.org/wikipedia/commons/c/c8/Figure_4_deadfall.gif` |
| `Paiute Deadfall.gif` | 450 x 333 | 8-13 | `https://upload.wikimedia.org/wikipedia/commons/c/cc/Paiute_Deadfall.gif` |
| `Bottle trap.gif` | 450 x 311 | 8-16 | `https://upload.wikimedia.org/wikipedia/commons/5/57/Bottle_trap.gif` |

Two more from the same category serve this tile: `Simple crane.gif` (259 x 186, PD, the cooking
crane over a fire) and `Chamerion angustifolium.gif` (450 x 303, PD, a fireweed plate from the
Appendix B species art).

**No snare figure, no fishing figure, and no game-preparation figure cites FM 21-76 on Commons.**
Figures 8-5 through 8-11, 8-17 through 8-22, and 8-24 through 8-28 are absent. Those need either a
render-and-crop of the local PDF (the technique in `process-node-sources.md`) or a second source.

### The second source, and it is better shaped than FM 21-76 for traps

**A. R. Harding, *Deadfalls and Snares* (Columbus, Ohio, 1907).** Verified two ways: the Internet
Archive scan `deadfallssnaresb00harduoft`, 1907, `possible-copyright-status: NOT_IN_COPYRIGHT`, and
Project Gutenberg ebook 34110, whose full text was fetched (220 KB). Public domain by publication
date. **Verdict: shippable.**

It gives what FM 21-76 does not, which is stick-by-stick dimensioned geometry for the figure-four
and for snare loops:

> "The figure 4 trigger is best for this trap and is made after this manner: standard (1) is made by
> cutting a stick five or six inches long out of hard wood and whittling it to a flat point, but
> blunt at one end; (2) is about five inches long with a notch cut within about one and one-half
> inches of the end with the other end made square so that it will fit in (3) which is the bait
> stick. This is only a straight stick sixteen or eighteen inches long."

A second, tighter variant follows in the same chapter: parts "about three-eighths of an inch thick",
trigger "thirteen inches long, with notches about one-sixteenth of an inch deep ... two of the
notches near together and at one end, and another four and a half inches from the first two"; lever
"six and one-half inches long, one inch wide at one end, and tapering down to three-sixteenths of an
inch at the other; a notch is cut across the under side one and a half inches from the wide end."

For snares (Ch XV to XVII): loop "seven inches in diameter", "bottom of loop ten inches from the
ground" in one set and "about six inches from the ground" in another, spring pole "6 or 7 feet
long", noose and snare entrance trees "about four inches apart".

Every one of those is a countable measure, which is the STP 21-1-SMCT shape. None of them is a
"the following must be true" checkpoint block in the TC 3-97.61 sense; Harding states dimensions and
one behavioural test ("You should keep your knee under the stone all the time until you see that it
comes down easily and does not 'go off' of its own weight"). Call it dimensional criteria, one tier
below TC 3-97.61 and level with the best FM 21-76 rows already in `coverage.md`.

**Harding figures on Commons.** `insource:"Deadfalls and Snares"` in namespace 6 returns 12 files.
Six were checked through `extmetadata` and all six read `Public domain`, `Artist: A. R. Harding`:

| File | Size | Subject |
| --- | --- | --- |
| `SNARE LOOP.jpg` | 454 x 232 | snare loop set, lettered parts |
| `PATH SET SNARE.jpg` | 494 x 277 | trail set |
| `SnareSpringPole.jpg` | 406 x 600 | spring-pole snare, numbered parts |
| `TriggerDeadfall.jpg` | 600 x 430 | trigger geometry |
| `TripDeadfall.jpg` | 600 x 353 | trip set |
| `TrailDeadfall.jpg` | 600 x 344 | trail set deadfall |
| `PitDeadfall.jpg` | 436 x 273 | pit deadfall |
| `PortableDeadfall.jpg` | 600 x 325 | portable deadfall |
| `CoopDeadfall.jpg` | 451 x 423 | coop deadfall |
| `StretchingHide.jpg` | 384 x 662 | hide stretching |

`BranchTriggerDeadfall.png` in the same result set is **not** Harding: it is CC BY-SA 3.0 own work by
a Commons user. `Paiute Deadfall Trap.JPG` (2048 x 1536) is likewise CC BY-SA 3.0 own work. Both are
usable only with attribution and share-alike, so prefer the public-domain plates.

The rest of the 1907 plates are in the archive.org scan and can be render-and-cropped the same way
the FM figures are. **UNVERIFIED:** the page numbers of individual plates in
`deadfallssnaresb00harduoft`; the Gutenberg text carries `[Illustration: ...]` captions but no page
mapping.

A second public-domain trapping book turned up in the same search and is a stronger illustration
source still: W. Hamilton Gibson, *Camp Life in the Woods and the Tricks of Trapping and Trap
Making* (Harper & Brothers, New York, 1881), archive.org `camplifeinwoodst00gibsrich`,
`possible-copyright-status: NOT_IN_COPYRIGHT`, and a full PDF is on Commons. Gibson is the standard
Victorian engraving set for the figure-four, the Paiute-style triggers, snares and box traps.
**Verdict: shippable, unread.** **UNVERIFIED:** its text and per-figure content; only its
archive.org metadata was fetched.

---

## Procedure 1: simple snare

- **Step source.** FM 21-76 Ch 8, printed p80, "Simple Snare", five sentences. Public domain, cite
  the Commons scan `https://commons.wikimedia.org/wiki/File:FM_21-76_Survival_June_1992.pdf`.
  Harding Ch XV to XVII carries the same set with dimensions.
- **Completion criteria.** None in FM 21-76. Its only checkable statements are placement rules
  ("Make sure the noose is large enough to pass freely over the animal's head", nooses "should never
  be low enough for the prey to step into with a foot"). Harding supplies the numbers: loop 7 in
  across, bottom of loop 6 to 10 in off the ground. Author from Harding, cite FM 21-76 for the set.
- **Figure.** FM figure 8-5 is not on Commons. Harding `SNARE LOOP.jpg` and `PATH SET SNARE.jpg`
  are, both public domain, and both show a set snare with lettered parts. `SnareSpringPole.jpg` has
  numbered parts (1 bait stick, 2 trigger, 3 noose, 4 stay wire, 5 bait, 6 spring pole), which maps
  one figure region per node and is the closest thing to a panelized plate this procedure has.
- **Structured data.** Loop diameter and set height are the two numbers a node checks; both are
  camera-checkable against a scale reference, the same pattern as `capDiameter` in the fungi table.
- **Verdict.** **Author today.** Steps, dimensional criteria and public-domain figures all exist.

## Procedure 2: the figure-four deadfall

- **Step source.** FM 21-76 Ch 8, printed p84, is three sentences and no steps (quoted above).
  Harding 1907 Ch V is the real step source and gives two dimensioned variants.
- **Completion criteria.** Dimensional, from Harding. Plus one behavioural test, quoted above, for
  whether the set holds without going off under its own weight.
- **Figure.** `Figure 4 deadfall.gif`, 450 x 383, PD-USGov,
  `https://upload.wikimedia.org/wikipedia/commons/c/c8/Figure_4_deadfall.gif`. One end-state plate
  for the whole trigger. Harding `TriggerDeadfall.jpg` (600 x 430) shows the trigger geometry
  separately, which is the harder half. For a per-step walk of the three notches, neither plate is
  panelized; Gibson 1881 is the place to look, unread.
- **Verdict.** **Author today with a caveat.** The FM concedes the trigger "requires close
  tolerances and precise angles", so a first-timer walk is more likely to succeed on the Paiute
  deadfall. Author the Paiute first, the figure-four second.

## Procedure 2b: the Paiute deadfall

- **Step source.** FM 21-76 Ch 8, printed p85. Five ordered actions, the clearest trap text in the
  chapter, with one angle stated (catch stick at 90 degrees) and one length (5 cm catch stick).
- **Figure.** `Paiute Deadfall.gif`, 450 x 333, PD-USGov,
  `https://upload.wikimedia.org/wikipedia/commons/c/cc/Paiute_Deadfall.gif`.
- **Verdict.** **Author today.** Best first target of the two deadfalls, and the FM says so.

## Procedure 3: improvised fishing, hand line and gorge hook

- **Step source.** FM 21-76 Ch 8, printed p89. The gorge is four sentences: "A gorge is a small
  shaft of wood, bone, metal, or other material. It is sharp on both ends and notched in the middle
  where you tie cordage. Bait the gorge by placing a piece of bait on it lengthwise. When the fish
  swallows the bait, it also swallows the gorge." The wooden hook beside it does carry dimensions:
  shank "about 2.5 centimeters long and about 6 millimeters in diameter". The stakeout (figure 8-18)
  is a five-action set. FM 21-76 has no hand-line procedure as such; the hand line is implied by the
  stakeout and the improvised hooks.
- **Completion criteria.** None. The shank dimensions are the only numbers.
- **Figure.** FM figures 8-17 and 8-18 are not on Commons. Three public-domain gorge plates are:
  - `Gorge hook and baiting needle.png`, 1447 x 719, PD, Salter, *The Angler's Guide*, sourced to
    `https://archive.org/details/anglersguidebein00salt/page/178`. Highest resolution of the three.
  - `FMIB 44068 Gorge Hook and Bait.jpeg`, 776 x 412, PD, Herbert, *Frank Forester's Fish and
    Fishing of the United States* (1851).
  - `FMIB 46684 Gorge hook.jpeg`, PD, same Freshwater and Marine Image Bank collection.
  The FMIB set is the Freshwater and Marine Image Bank at the University of Washington, and its
  Commons files carry per-file public-domain tags with the source book and year. Verified on two
  files. **UNVERIFIED:** the per-file licence of every other FMIB file.
- **Verdict.** **Author today as a short walk.** The gorge is three nodes: shape it, notch and tie
  it, bait it lengthwise. Figures exist and are public domain. The hand line itself has no source
  in FM 21-76 and should not be invented.

## Procedure 4: fish trap, basket and tidal weir

- **Step source.** FM 21-76 Ch 8, printed p91. Two paragraphs. The basket is one sentence of
  construction ("lashing several sticks together with vines into a funnel shape ... leaving a hole
  large enough for the fish to swim through"). The tidal stone weir is better: "Pick a location at
  high tide and build the trap at low tide ... Build the trap as a low stone wall extending outward
  into the water and forming an angle with the shore", with three shore types called out (rocky
  pools, coral reef pools, sandbars).
- **Completion criteria.** None. The tide timing is the only sequencing constraint, and it is a real
  one: the site is chosen at high water and built at low water.
- **Figure.** FM figure 8-21 is not on Commons. Public-domain substitutes exist in the FMIB set:
  `FMIB 33830 Fish Basket Trap.jpeg`, 707 x 617, PD, credited to John N. Cobb, *Commercial
  Fisheries of the Hawaiian Islands* (1904, US Bureau of Fisheries), and `FMIB 33807 Puhi Basket
  Trap.jpeg` from the same book. Several PD weir photographs exist (`FMIB 34569 Herring Weir, Near
  Eastport, Me.jpeg`, `FMIB 35453 Salmon Weir, Afognak River.jpeg`) but they show industrial
  stake weirs, not a hand-built tidal stone wall. **No public-domain figure of the FM's stone tidal
  weir was found.**
- **Verdict.** **Partial.** The basket ships with a Cobb 1904 plate. The tidal weir ships as text
  and tide timing with no camera judgement, and the node says so.

## Procedure 5: skinning and gutting small game

- **Step source, FM.** FM 21-76 Ch 8, printed p96, "Skinning and Butchering Game". Ordered and
  usable: bleed by cutting the throat, split the hide from throat to tail cutting around the sexual
  organs, remove the musk glands at points A and B, then for small mammals "cut the hide around the
  body and insert two fingers under the hide on both sides of the cut and pull both pieces off".
  Gutting follows: split the body, pull the entrails with the fingers, do not forget the chest
  cavity, cut around the anus, pinch off the urine bladder and cut below the fingers, save and
  inspect heart and liver.
- **Step source with better shape.** USDA Farmers' Bulletin 2131, *Raising Rabbits*, revised 1961,
  archive.org `CAT10309023`, file `farmbul2131rev1961_djvu.txt`, fetched in full. A US Department of
  Agriculture work, public domain, **shippable.** Its "Slaughtering and Skinning" section is ordered
  and anatomically specific in a way the FM is not: suspend the carcass "on a hook inserted between
  the tendon and the bone of the right hind leg just above the hock", remove the head immediately
  "to permit thorough bleeding so the meat will have a good color", cut the skin "just below the
  hock of the suspended leg and open it on the inside of the leg to the root of the tail, continuing
  the incision to the hock of the left leg", then "make a slit along the median line of the belly
  and remove the entrails and gall bladder. Leave the liver and kidneys in place."
- **Completion criteria.** The FM gives one real inspection test, and it is worth a node of its own:
  "Cut these open and inspect for signs of worms or other parasites. Also inspect the liver's color
  ... The liver's surface should be smooth and wet and its color deep red or purple. If the liver
  appears diseased, discard it." That is a camera-answerable pass/fail on a single organ, the only
  one in the chapter. FB 2131 adds countable ones that are wrong for a survival context but right as
  a model: carcass in water "not more than 15 minutes", chill "to no less than 36 F and to no more
  than 40 F within 24 hours".
- **Figure.** FM figures 8-25 and 8-26 are not on Commons. FB 2131 carries figure 17 (how to hold a
  rabbit for dislocating the neck), figure 18 captioned "Steps (right to left) in skinning rabbits
  and removing internal organs", and figure 19 (pelt on a stretcher). Figure 18 is a genuine
  **per-step series**, which is rare. It is a commercial rack with plumbed water jets, so it reads as
  a processing plant rather than a field kill, and a node using it has to say so.
  **UNVERIFIED:** the image quality of figures 17 to 19 at render resolution; only the OCR text was
  fetched, not the page renders of `farmbul2131rev1961.pdf`.
- **Verdict.** **Author today.** Steps from FM 21-76 plus FB 2131, one real completion test on the
  liver, and one public-domain per-step figure series.

## Procedure 6: fish cleaning

- **Step source.** Two, and the second is much better shaped.
  - FM 21-76 Ch 8, printed p94-95. Spoilage signs are a genuine six-point observable checklist
    (sunken eyes; peculiar odour; gills should be red to pink and scales a pronounced shade of grey,
    not faded; dents stay in the flesh after thumb pressure; slimy rather than moist; sharp or
    peppery taste). Cleaning itself is three sentences: cut out the gills and large blood vessels
    near the spine, gut fish over 10 cm, scale or skin.
  - **USDA, *Home Curing Fish: A Guide for Extension and Village Workers in Many Countries*, by
    Sue T. Murry, Federal Extension Service, United States Department of Agriculture, in cooperation
    with the Agency for International Development, issued July 1967.** archive.org `CAT93973687`,
    full OCR fetched. Also on Commons as
    `File:Home curing fish - a guide for extension and village workers in many countries (IA CAT93973687).pdf`,
    tagged Public domain. A US federal work, public domain under 17 U.S.C. 105. **Verdict:
    shippable.** Note the archive.org banner on page 1: "Historic, Archive Document. Do not assume
    content reflects current scientific knowledge, policies, or practices." Any node from it carries
    a divergence check against current food-safety guidance.
- **Completion criteria.** The FM's six spoilage signs are a real observable checklist and three of
  them are camera-answerable directly (sunken eyes, gill colour, scale colour), one is after-action
  (thumb dent), two are user-answered (odour, taste). This is the strongest identification-shaped
  content in the whole PROCESS half of the tile.
- **Figure.** FM figure 8-24 (snake skinning) is not on Commons and there is no FM fish-cleaning
  figure. *Home Curing Fish* is illustrated throughout with line drawings of each tool and each
  operation across 24 pages. **UNVERIFIED:** the individual figure captions and page numbers; only
  the OCR text was fetched, and the OCR drops figure captions.
- **Verdict.** **Author today.** Spoilage screen from FM 21-76 as an identification-shaped node set,
  cleaning steps from the 1967 USDA guide.

## Procedure 7: smoking, drying, and cooking without utensils

- **Step source, FM.** FM 21-76 Ch 8, printed p97-98. Smoking: enclosure around a fire, produce
  smoke not heat, hardwood and "somewhat green" wood, no resinous wood, slices "no more than 6
  centimetres thick", "Make sure none of the meat touches another piece". Drying: strips "6-
  millimeter" cut with the grain, on a rack in sun with good air flow, covered against blowflies.
  Brine and salt, and freezing, get one sentence each. Cooking without utensils is scattered: the
  clay-ball fish bake on p95, boiling with skin on to keep the fats and juices, the spit, and the
  Ch 7 cooking fire.
- **Step source, USDA 1967.** *Home Curing Fish* is the per-step source and it is numbered. Salting
  small fish is four numbered steps with quantities (weak brine of one cup salt to one gallon of
  water, about 300 g per 4 L, soak half an hour to an hour; strong brine one part salt to four parts
  water by weight; weight the fish under the brine five to six hours; drain in a single layer, no
  overlap). Salting medium and large fish is five preparation steps plus nine salting steps, with
  the salt-to-fish ratio "one part salt to three parts fish", a bottom salt layer "about 1/4 inch",
  a week to ten days in the salt, and a final wash in "three to four cups of salt in one gallon of
  water" followed by a 15 to 20 minute drain. Air drying is eight numbered steps. Smoking is four
  headed sections: hanging methods, fuel, building the smokehouse, and cold against hot smoking.
- **Completion criteria, and this is the find.** The 1967 guide states real ones, in the shape a
  node can check:
  - Drying done test: "To tell when fish are dry, press the thick part of the flesh between your
    thumb and forefinger. If you cannot make a dent, the fish are dry enough."
  - Hot smoking heat test: "The air around them should feel very warm to the hand. However, if you
    cannot keep your hand in the smoke, it is too hot."
  - Timings: cold smoking "five to seven days, depending on the size and thickness of the fish"; hot
    smoking "a low smoldering fire for the first eight hours ... Then build up the fire to make dense
    smoke for two to three hours longer", then cool two to three hours and brush with oil.
  - Drying times: "Small fish will dry in about three days if the air is dry. Larger fish take a week
    or 10 days."
  - Storage maintenance: sun the stored fish "about every two weeks ... for one to three hours".
  FM 21-76 has its own preservation timings for meat, and they should be carried as the meat figures
  while the fish figures come from USDA: "Meat smoked overnight in this manner will last about 1
  week. Two days of continuous smoking will preserve the meat for 2 to 4 weeks. Properly smoked meat
  will look like a dark, curled, brittle stick." And for drying: "Properly dried meat will have a
  dry, crisp texture and will not feel cool to the touch." Both are done-tests, both authored into
  nodes as-is.
- **Figure.** FM figures 8-27 and 8-28 (smoking in an enclosure, smoking in a pit) are not on
  Commons; render printed page 97. `Simple crane.gif` (259 x 186, PD-USGov) covers the cooking crane
  and is on Commons. *Home Curing Fish* is line-illustrated throughout, including the barrel or oil
  drum smokehouse with its 12-foot trench.
- **Verdict.** **Author today, with a divergence flag.** This is the only Food procedure with real
  completion criteria from an openly licensed source. Both step sources predate modern food-safety
  guidance, which is a PRD 6.5.7 divergence, handled below.

### The food-safety divergence, and its source is only partly verified

FM 21-76 (1992) and USDA 1967 both describe smoking as a preservation method at temperatures that
current USDA guidance treats as unsafe holding. The current statement lives in the USDA Food Safety
and Inspection Service fact sheet *Smoking Meat and Poultry*, at
`https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/smoking-meat-and-poultry`,
which names the Danger Zone as 40 to 140 F and directs that smoker air temperature be held between
225 and 300 F. As a US federal work it is public domain and shippable.

**UNVERIFIED at source.** fsis.usda.gov returns HTTP 403 to a plain fetch and to a browser user
agent, and web.archive.org is not reachable from this environment. The two numbers above come from
search-result extracts, not from the page itself. Add fsis.usda.gov to the blocked-host list in
`process-node-sources.md`, and confirm both numbers from a browser before any smoking node ships
with a temperature in it.

The National Center for Home Food Preservation at the University of Georgia is the obvious modern
step source and is **unusable**: its pages carry "Copyright © 2026 National Center for Home Food
Preservation, All rights reserved", verified by fetching `https://nchfp.uga.edu/how/smoke/`. USDA
funds it; USDA did not author it, so 17 U.S.C. 105 does not reach it. Same trap already recorded in
`process-node-sources.md` for PRISM.

### Sources checked for this half and rejected

| Source | Verdict | Reason |
| --- | --- | --- |
| National Center for Home Food Preservation (UGA) | **Unusable** | "All rights reserved", verified on the page |
| State fish and wildlife agency field-dressing guides (ADF&G, TPWD, NC WRC, NH F&G) | **Reference only** | State agencies are not federal, so 17 U.S.C. 105 does not apply and none of the four grants an open licence. **UNVERIFIED:** each agency's terms page was not individually fetched |
| Penn State Extension, NC State Extension *Wild Game: From Field to Table* | **Reference only** | Land-grant extension units hold their own copyright. NC State Extension is already recorded as reference only in `synoptic-characters-fungi-plants.md` |
| FAO fisheries documents | **UNVERIFIED, expect reference only** | FAO's standard grant since 2021 is CC BY-NC-SA 3.0 IGO, and the NC clause blocks commercial distribution, the same finding already recorded for WHO. Not fetched in this pass |
| USDA *Complete Guide to Home Canning*, Agriculture Information Bulletin 539 | **Shippable, unfetched** | A USDA publication and therefore public domain, but the canonical NAL landing page 404s and the guide was not fetched. It covers pressure canning, which needs equipment a survivor does not have, so it is a poor fit for this tile regardless. **UNVERIFIED** |
| National Park Service | **Nothing found** | No NPS publication on trapping, fishing gear, or game preparation surfaced. NPS regulations prohibit most of it in park units |

---

# Part 2: IDENTIFICATION, edible plants

## Finding that reframes this half: the local PDF is missing the appendices

`FM21-76_SurvivalManual.pdf` in the repo root is 233 pages and stops at Chapter 23. The published FM
21-76 runs to Appendix H. The Commons scan
`https://commons.wikimedia.org/wiki/File:FM_21-76_Survival_June_1992.pdf` is **646 pages**,
confirmed through `prop=imageinfo` (`pagecount: 646`, 52.4 MB, Public domain), and the appendices
were read from the OCR of the Marine Corps reprint, archive.org
`milmanual-mcrp-3-02f-fm-21-76-survival`, file `mcrp_3-02f_fm_21-76_survival_djvu.txt`, 717 KB,
fetched in full.

The appendices the local copy is missing:

| Appendix | Subject | Entries counted in the OCR |
| --- | --- | --- |
| A | Survival kits | prose |
| **B** | **Edible and medicinal plants** | **111 species** |
| **C** | **Poisonous plants** | **17 species** |
| D | Dangerous insects and arachnids | species accounts |
| E | Poisonous snakes and lizards | species accounts |
| F | Dangerous fish and mollusks | species accounts |
| **G** | **Clouds: foretellers of weather** | prose, and it closes the "weather and sky reading" row in `coverage.md` |
| H | Contingency plan of action format | prose |

**Appendix B is the per-species edibility source this brief was sent to find, and it is already
public domain and already inside the manual the product is built on.** Every entry uses the same
four-field schema, and 35 entries carry a fifth field:

- `Description:` (182 across B and C)
- `Habitat and Distribution:` (127)
- `Edible Parts:` (111), which carries the preparation instruction inline
- `Other Uses:` (35)
- plus 10 `WARNING` and several `CAUTION` blocks

A representative entry, verbatim:

> **Agave** — *Agave species*
> **Description:** These plants have large clusters of thick, fleshy leaves borne close to the
> ground and surrounding a central stalk. The plants flower only once, then die. They produce a
> massive flower stalk.
> **Habitat and Distribution:** Agaves prefer dry, open areas. They are found throughout Central
> America, the Caribbean, and parts of the western deserts of the United States and Mexico.
> **Edible Parts:** Its flowers and flower buds are edible. Boil them before eating.
> **CAUTION:** The juice of some species causes dermatitis in some individuals.
> **Other Uses:** Cut the huge flower stalk and collect the juice for drinking. ...

**Verdict: shippable, and it is the best per-species edibility source verified in this pass.**

**UNVERIFIED:** the Appendix B species plates. Every entry has a line drawing in the printed manual;
the OCR renders them as noise. One of them is already on Commons as `Chamerion angustifolium.gif`
(450 x 303, PD-USGov, credited "U.S. Army Survival Manual (FM 21-76)"), which shows the crops exist
and are the same 400 to 600 px class as the procedure figures. The other 110 need render-and-crop
from the 646-page Commons scan. Page numbers were not established in this pass.

## How edible-plant identification relates to the 28-character plant set

`docs/research/synoptic-characters-fungi-plants.md` designs a 28-character plant walk ranked for the
six deadly pairs Q1 to Q6. Nothing in that design changes for the Food tile. Three points:

1. **The character set is shared, not duplicated.** The Food tile's edible-plant walk asks the same
   28 characters in the same order. `coverage.md` already records this ("shares the 28-character
   plant set"). The design holds because Q1 to Q6 are all edible-against-poisonous pairs already:
   Q1 is *Conium* against wild carrot, Q2 is *Cicuta* against parsnip and *Sium*, Q5 is *Veratrum*
   and *Colchicum* against ramps. A walk that separates those pairs is the edible-plant walk.
2. **What differs is what an answer means at the leaf.** In the Poisonous Plants tile the terminal
   record is a toxicity record. In the Food tile the terminal record is an edibility verdict, and
   the verdict needs four fields the 28 characters never ask, because they are not observable
   traits of the specimen in front of the camera.
3. **The ranking may need one addition for the Food tile.** Character 4 `crushedOdour` and character
   6 `rootOnSection` are already rank 4 and 6, which is right. Nothing in Appendix B suggests a new
   character. Appendix B's own discriminators are habitat, growth form, leaf arrangement and fruit
   type, all of which the 28 already carry.

### The four extra fields an edibility verdict needs, and where each comes from

| Field | Why the character walk cannot supply it | Verified source | Licence |
| --- | --- | --- | --- |
| **Edible part** | A trait of the taxon, not of the specimen | FM 21-76 Appendix B `Edible Parts:`, 111 species. Yanovsky 1936 for 1,112 species | Public domain, both |
| **Preparation required** | Same | FM 21-76 Appendix B, inline in `Edible Parts:` ("Boil them before eating", "Leach acorns in water"). Ch 9 "Preparation of Plant Food" carries the general rules for leaching, oxalates and tannins | Public domain |
| **Season** | Same, and it is the one field Appendix B does not carry | USDA PLANTS `Bloom Period`, `Fruit/Seed Period Begin`, `Fruit/Seed Period End`, `Active Growth Period`, verified populated on a live record | Public domain |
| **Toxic lookalike** | It is a relation between two taxa, not a trait of one | The Q1 to Q6 pairs already designed, plus FM 21-76 Appendix C (17 species) and the Poisonous Plants tile's own toxic-plant records | Public domain |

Appendix C states the relation the product needs, in the manual's own words: "Many edible plants
have deadly relatives and look-alikes." Seventeen species is thin, so the lookalike edges keep
coming from the deadly-pair design rather than from the FM.

## The universal edibility test

### It is a timed checklist and the primary source is a figure, not text

FM 21-76 carries the test entirely inside **Figure 9-5, "Universal Edibility Test", printed page
103**. The caption is a bitmap and the table is a bitmap, so `pdftotext` returns nothing for it;
the steps were read by rendering the page (`pdftoppm -f 103 -r 200`). This is the same extraction
finding already recorded in `process-node-sources.md`, and it means the checklist cannot be pulled
from the text layer.

### The 1992 steps and timings, verbatim from figure 9-5

1. Test only one part of a potential food plant at a time.
2. Separate the plant into its basic components: leaves, stems, roots, buds, and flowers.
3. Smell the food for strong or acid odors. Remember, smell alone does not indicate a plant is
   edible or inedible.
4. **Do not eat for 8 hours before starting the test.**
5. During the 8 hours you abstain from eating, test for contact poisoning by placing a piece of the
   plant part you are testing on the inside of your elbow or wrist. **Usually 15 minutes is enough
   time to allow for a reaction.**
6. During the test period, take nothing by mouth except purified water and the plant part you are
   testing.
7. Select a small portion of a single part and prepare it the way you plan to eat it.
8. Before placing the prepared plant part in your mouth, touch a small portion (a pinch) to the
   outer surface of your lip to test for burning or itching.
9. **If after 3 minutes** there is no reaction on your lip, place the plant part on your tongue,
   **holding it there for 15 minutes**.
10. If there is no reaction, thoroughly chew a pinch and hold it in your mouth **for 15 minutes.
    Do not swallow.**
11. If no burning, itching, numbing, stinging, or other irritation occurs during the 15 minutes,
    swallow the food.
12. **Wait 8 hours.** If any ill effects occur during this period, induce vomiting and drink a lot
    of water.
13. If no ill effects occur, **eat 0.25 cup** of the same plant part prepared the same way. **Wait
    another 8 hours.** If no ill effects occur, the plant part as prepared is safe for eating.

CAUTION block, verbatim: "Test all parts of the plant for edibility, as some plants have both edible
and inedible parts. Do not assume that a part that proved edible when cooked is also edible when
raw. Test the part raw to ensure edibility before eating raw. The same part or plant may produce
varying reactions in different individuals."

Chapter 9 body text adds the budget: "Each part of a plant (roots, leaves, flowers, and so on)
requires more than 24 hours to test." The timings sum to about 24 hours 33 minutes, so the manual is
internally consistent.

**Total elapsed time per plant part: 8 h fast + 15 min contact + 3 min lip + 15 min tongue + 15 min
chew + 8 h + 8 h = 24 h 48 min at the outside, and the manual rounds it to "more than 24 hours".**

Licence: public domain, US Government work. Cite the Commons scan, not the local reprint.

### Where FM 21-76 diverges, and it diverges three ways

**Divergence 1: against the 1999 multiservice edition, which is also public domain.**
FM 21-76-1, *Multiservice Procedures for Survival, Evasion, and Recovery*, June 1999, section VIII,
was fetched in full from archive.org `Fm21-76-1`, file `Fm21-76-1_djvu.txt`. It is also on Commons
as `File:FM 21-76-1 (Multiservice Procedures for) Survival, Evasion, and Recovery June 1999.pdf`.
Public domain. Its test is **12 steps, not 13**, with **identical timings** (8 h fast, 15 min
contact, 3 min lip, 15 min tongue, 15 min chew, 8 h, 8 h, quarter cup). Four substantive
differences:

- Step 5 adds a completion condition the 1992 version omits: "**The sap or juice should contact the
  skin.**" That turns the contact test from an action into a checkable state, which is exactly what a
  node needs.
- Step 10 adds a failure action: "If any ill effects occur, **rinse out your mouth with water**."
- Step 11 changes the remedy from "induce vomiting and drink a lot of water" to "induce vomiting and
  drink **a water and charcoal mixture**."
- The avoid-list is rewritten and is a much better fit for a camera walk, because every item is a
  visible trait and the exceptions are named: milky sap ("dandelion has milky sap but is safe to eat
  and easily recognizable"); spines, fine hairs and thorns ("Prickly pear and thistles are
  exceptions. Bracken fern fiddleheads also violate this guideline"); mushrooms and fungus; umbrella
  shaped flowers ("hemlock is eliminated"); bulbs ("only onions smell like onions"); grain heads
  with pink, purplish or black spurs; beans, bulbs or seeds inside pods; old or wilted leaves; shiny
  leaves; white and yellow berries ("Aggregate berries such as black and dewberries are always
  edible, test all others before eating"); almond scent in woody parts and leaves.

The 1992 avoid-list by contrast has "bitter or soapy taste" (not visible), "dill, carrot, parsnip,
or parsleylike foliage" and "three-leaved growth pattern". **Ship the 1999 avoid-list, cite both.**
Note the 1999 list drops "three-leaved growth pattern", which is the *Toxicodendron* rule and is
worth keeping from 1992.

**Divergence 2: "induce vomiting" is against current first-aid guidance.**
Both editions instruct the user to induce vomiting if ill effects appear. Current consumer first-aid
guidance for suspected poisoning is the opposite: do not induce vomiting unless a poison centre or
clinician directs it, with the stated reason that a corrosive substance damages the throat again on
the way back up. Verified by fetching the MedlinePlus poisoning first-aid encyclopedia article at
`https://medlineplus.gov/ency/article/007579.htm`. **Licence: the MedlinePlus Medical Encyclopedia
text is A.D.A.M. Inc, "Any duplication or distribution of the information contained herein is
strictly prohibited". Reference only. Do not quote it in the app.** State the divergence in the
product's own words and route the user to a poison centre, the same pattern already used for the
tourniquet divergence in `process-node-sources.md`.

**Divergence 3: the test does not detect the toxins that actually kill.**
The known critique is that an 8-hour observation window cannot catch amatoxin (6 to 24 h latent),
and that a taste-and-wait protocol gives no warning for cicutoxin or coniine, which act fast and at
small doses. **No authoritative, openly licensed source for this was found.** Every source located
is a commercial outdoor blog or a subscription magazine. Mark this **UNVERIFIED** and do not author
a claim from it. What *can* be shipped is the manual's own admission, which says most of the same
thing and is public domain:

> FM 21-76 Ch 9, on the avoid-list: "Using the above criteria as eliminators when choosing plants
> for the Universal Edibility Test will cause you to avoid some edible plants. More important, these
> criteria will often help you avoid plants that are potentially toxic to eat or touch."

> FM 21-76 Ch 9, WARNING: "Do not eat mushrooms in a survival situation! The only way to tell if a
> mushroom is edible is by positive identification. There is no room for experimentation. Symptoms
> of the most dangerous mushrooms affecting the central nervous system may show up after several
> days have passed when it is too late to reverse their effects."

> FM 21-76-1 (1999) note: "If you cannot positively identify an edible plant and choose to try an
> unknown plant, these guidelines may help determine edibility."

That last line is the honest scope statement for the feature, in the source's own voice: the test is
a fallback for a plant that could not be identified, not a substitute for identification. It belongs
in the scope banner (PRD 1.5).

**UNVERIFIED:** whether the current Army publication, ATP 3-50.21 *Survival* (September 2018), still
carries the test and with what changes. armypubs serves it only from the gated tree and no
fetchable copy was located; every reachable copy is a commercial reprint.

### What the node shape has to be

PRD 1.4 already settles this: "A question no camera can judge, such as the eight-hour edibility
test, is a timed checklist the user answers." Nothing found in this pass changes that. Two of the
thirteen steps have a camera-answerable component, and both are weak:

- Step 2, separating the plant into leaves, stems, roots, buds and flowers, is checkable against the
  28-character walk's `leafComplexity` and `rootOnSection` states.
- Step 5's 1999 wording, "the sap or juice should contact the skin", is a visible state.

Everything else is a timer, a sensation the user reports, or a swallow. The right build is a
persistent timed checklist with a wall-clock budget stated up front ("more than 24 hours per part"),
not a camera session, and it must survive the app being backgrounded for 8 hours at a stretch.

## Per-species edibility sources, ranked by verdict

| Source | Coverage | Fields | Licence, as verified | Verdict |
| --- | --- | --- | --- | --- |
| **FM 21-76 Appendix B** (1992) | 111 species, global | Description, Habitat and Distribution, **Edible Parts with preparation inline**, Other Uses, CAUTION | Public domain, US Government work. Commons scan is 646 pp, tagged Public domain | **Shippable. The best source verified in this pass** |
| **USDA PLANTS characteristics** | **2,186 species** carry any characteristics data, measured by `GET /api/characteristicSearchResults` returning 2,186 rows. 77 characteristics on a sampled record | `Palatable Human` (Yes/No), `Toxicity` (None/Slight/Moderate/Severe), `Bloom Period`, `Fruit/Seed Period Begin`/`End`, `Active Growth Period` | US federal work, uncopyrightable under 17 U.S.C. 105 | **Shippable, for season and as a cross-check. Not an edibility verdict on its own** |
| **Yanovsky, *Food Plants of the North American Indians*, USDA Miscellaneous Publication 237, July 1936** | **1,112 species, 444 genera, 120 families** | Edible part and preparation in one phrase per species, plus a numbered citation to the original ethnobotanical source | USDA publication, public domain. archive.org `foodplantsofnort237yano`, `rights: The contributing institution believes that this item is not in copyright`, collection `usda-miscellaneouspublication` | **Shippable with a caveat**, see below |
| Saunders, *Useful Wild Plants of the United States and Canada* (1920) | book-length | prose, per species | archive.org `usefulwildplants00saun`, `NOT_IN_COPYRIGHT` | **Shippable, unread.** UNVERIFIED: its per-species schema |
| **Plants For A Future** | 7,400 plants, Edibility Rating out of 5, Edible Parts with preparation, Known Hazards | the richest schema of any candidate | The copyright page says CC BY 4.0 and then glosses it as "Share Alike (GNUish/copyleft)". CC BY 4.0 has no ShareAlike term, so the page contradicts itself. Already flagged in `synoptic-characters-fungi-plants.md` | **Blocked.** Resolve the contradiction in writing with PFAF or buy the Commercial Edition. Do not plan the Food tile around it |
| Mississippi State University Extension, *Forgotten Foods: Introduction to Wild Edible Plants* (Publication 4173) | ~30 species | common name, botanical name, edible part, culinary use. No season, no preparation, no lookalikes, per species | Fetched; **no copyright statement of any kind on the page or footer**, which means default all-rights-reserved | **Reference only.** Representative of state extension foraging guides generally |
| Penn State Extension, NC State Extension, Colorado State Extension foraging pages | varies | varies | land-grant units hold their own copyright | **Reference only.** Consistent with the NC State Extension verdict already in `synoptic-characters-fungi-plants.md` |

### The Yanovsky caveat, which USDA states itself

Yanovsky 1936 is an **ethnobotanical use record, not an edibility verdict**, and USDA says so on the
page. From the foreword by Frederick V. Coville, Curator of the United States National Herbarium:

> "In a compilation of this sort, in which it is impossible to authenticate most of the botanical
> identifications because of the unavailability of the specimens on which they were based,
> occasional errors are unavoidable. ... The list finds its justification as a convenient summary of
> the extensive literature and is to be used subject to confirmation and correction."

The scan also carries the standard NAL banner: "Historic, archived document. Do not assume content
reflects current scientific knowledge, policies, or practices." A record that says a plant was
"cooked as greens on California coast" with a citation is evidence that someone ate it, and the
1936 name still has to be mapped to the GBIF backbone. Use it to widen coverage past Appendix B's
111 species, never as the sole basis for an edible verdict, and carry its citation through to the
node the way the fungi table carries the McIlvaine page reference.

---

# Readiness summary

| Item | Form | Step or character source | Completion criteria | Figure | Verdict |
| --- | --- | --- | --- | --- | --- |
| Simple snare | process | FM 21-76 Ch 8 + Harding 1907 | Dimensional: 7 in loop, 6 to 10 in set height | Harding `SNARE LOOP.jpg`, `PATH SET SNARE.jpg`, `SnareSpringPole.jpg`, all PD | **Author today** |
| Paiute deadfall | process | FM 21-76 Ch 8 | 5 cm catch stick, 90-degree angle | `Paiute Deadfall.gif`, PD-USGov | **Author today** |
| Figure-four deadfall | process | Harding 1907 Ch V; the FM has no steps | Dimensional, two variants, plus one set-stability test | `Figure 4 deadfall.gif` PD-USGov, `TriggerDeadfall.jpg` PD | **Author today**, after the Paiute |
| Bottle trap | process | FM 21-76 Ch 8 | 30 to 45 cm depth, 2.5 to 5 cm cover standoff | `Bottle trap.gif`, PD-USGov | **Author today** |
| Improvised fishing: gorge hook | process | FM 21-76 Ch 8 | none; 2.5 cm x 6 mm shank only | `Gorge hook and baiting needle.png` and two FMIB plates, all PD | **Author today** |
| Improvised fishing: hand line | process | **no source** | | | **Do not author.** FM 21-76 has no hand-line procedure |
| Fish trap, basket | process | FM 21-76 Ch 8, one sentence | none | `FMIB 33830 Fish Basket Trap.jpeg`, PD, Cobb 1904 | **Partial** |
| Fish trap, tidal stone weir | process | FM 21-76 Ch 8 | tide sequencing only | **none found** | **Ships without camera judgement** |
| Skinning and gutting small game | process | FM 21-76 Ch 8 + USDA FB 2131 (1961) | liver inspection is a real pass/fail | FB 2131 figure 18 is a **per-step series**, PD | **Author today** |
| Fish cleaning | process | FM 21-76 Ch 8 + USDA *Home Curing Fish* (1967) | **6-point spoilage checklist, 3 of them camera-answerable** | *Home Curing Fish* line art, PD; **UNVERIFIED** per-figure | **Author today** |
| Smoking and drying | process | FM 21-76 Ch 8 + USDA *Home Curing Fish* (1967) | **the strongest in the tile**: thumb-dent dry test, hand-in-smoke heat test, timings throughout | FM figs 8-27, 8-28 need a render; `Simple crane.gif` PD covers the cooking crane | **Author today**, with a food-safety divergence flag |
| Cooking without utensils | process | FM 21-76 Ch 8 and Ch 7, scattered | none | `Simple crane.gif`, PD-USGov | **Partial.** Assemble the steps first |
| Universal edibility test | timed checklist | FM 21-76 fig 9-5 (13 steps) and FM 21-76-1 1999 (12 steps), both PD | the checklist **is** the criteria | none needed | **Author today**, with two divergence flags |
| Edible plants | identification | the 28-character plant set, unchanged | not applicable | Appendix B plates, **UNVERIFIED** | **Author today for the walk**; edibility verdict data from Appendix B |

### Lacking a figure source

- **Tidal stone weir.** No public-domain figure found on Commons. Ships as text.
- **FM figures 8-5 through 8-11, 8-17 through 8-22, 8-24 through 8-28.** None on Commons. Each needs
  one render-and-crop of the local PDF at the printed page listed in the table at the top of this
  brief. Harding and the FMIB plates cover snares, deadfalls and fishing gear in the meantime.
- **Appendix B species plates.** 110 of 111 need render-and-crop from the 646-page Commons scan.
  Page numbers not yet established.
- **Cooking without utensils.** One PD crane figure and nothing else.

### Licence ledger, additions

| Source | Verdict |
| --- | --- |
| FM 21-76 (1992) Appendices A through H, Commons scan, 646 pp | Public domain, US Government work |
| FM 21-76-1 (1999) multiservice SERE | Public domain, on Commons and archive.org |
| MCRP 3-02F reprint of FM 21-76, archive.org | Public domain, useful because its OCR carries the appendix text |
| A. R. Harding, *Deadfalls and Snares* (1907) | Public domain by date. archive.org `NOT_IN_COPYRIGHT`, Gutenberg 34110. 10 PD plates already on Commons |
| W. H. Gibson, *Camp Life in the Woods* (1881) | Public domain by date, archive.org `NOT_IN_COPYRIGHT`. **Unread** |
| USDA Farmers' Bulletin 2131, *Raising Rabbits* (rev. 1961) | Public domain, USDA work |
| USDA, *Home Curing Fish* (Federal Extension Service with USAID, 1967) | Public domain, US federal work. Commons tags it Public domain. Carries the NAL historic-document banner |
| USDA Misc. Publication 237, Yanovsky (1936) | Public domain, USDA work. Use as evidence of use, not as a verdict |
| USDA PLANTS characteristics API | Public domain, 17 U.S.C. 105 |
| Saunders, *Useful Wild Plants* (1920) | Public domain by date. Unread |
| FMIB (Freshwater and Marine Image Bank) files on Commons | Public domain per file, verified on two files. **UNVERIFIED** across the collection |
| **USDA FSIS** *Smoking Meat and Poultry* | Public domain, but **fsis.usda.gov returns 403 to fetchers**. Numbers UNVERIFIED at source |
| **NCHFP (University of Georgia)** | **Unusable.** "All rights reserved", verified |
| **MedlinePlus Medical Encyclopedia** | **Reference only.** A.D.A.M. Inc, duplication and distribution prohibited. The underlying fact is usable, its wording is not |
| **State fish and wildlife agencies, land-grant extension services** | **Reference only.** Not federal, no open grant. Verified on one (Mississippi State Extension, no statement at all) |
| **Plants For A Future** | **Blocked**, unchanged from the fungi brief |
| Commons user-contributed trap photos (`Paiute Deadfall Trap.JPG`, `BranchTriggerDeadfall.png`) | CC BY-SA 3.0. Usable with attribution and share-alike; prefer the PD plates |

### Consolidated UNVERIFIED list for this tile

- FSIS *Smoking Meat and Poultry* at source: the 40 to 140 F Danger Zone and the 225 to 300 F smoker
  range come from search extracts only. fsis.usda.gov 403s to plain and browser user agents, and
  web.archive.org is unreachable from this environment.
- Whether ATP 3-50.21 (Sept 2018) still carries the universal edibility test, and with what changes.
- The toxicological critique of the test. No authoritative or openly licensed source exists that
  could be found; every hit is a commercial outdoor publication.
- Gibson 1881 text and figures. Metadata only.
- Saunders 1920 per-species schema. Metadata only.
- USDA FB 2131 figures 17 to 19 at render resolution. OCR only.
- *Home Curing Fish* figure captions and page numbers. OCR only, and the OCR drops captions.
- Page numbers of the Harding 1907 plates inside `deadfallssnaresb00harduoft`.
- Appendix B page numbers inside the 646-page Commons scan.
- Per-file licences across the whole FMIB Commons collection.
- USDA *Complete Guide to Home Canning*: never fetched. The NAL landing page 404s.
- FAO fisheries documents: never fetched. Expect CC BY-NC-SA 3.0 IGO, which the NC clause blocks.
- Individual terms pages for ADF&G, TPWD, NC WRC and NH Fish and Game.

### Host notes, additions for the pipeline

- `fsis.usda.gov`: 403 to both plain and browser user agents. Add to the blocked list.
- `web.archive.org`: not reachable from this environment at all, so the usual 403 workaround is gone.
- `plantsservices.sc.egov.usda.gov`: open, no key. `GET /api/PlantProfile?symbol=XXXX` resolves a
  symbol to the numeric id that `GET /api/PlantCharacteristics/{id}` needs. `POST` to
  `/api/PlantSearch` returns 405; it is a GET endpoint. Swagger at `/swagger/v1/swagger.json`.
- `plants.usda.gov` 301s to `plants.sc.egov.usda.gov`; follow the redirect explicitly.
- Commons `insource:` search matches the file page wikitext, so a figure credited "U.S. Army Field
  Manual, No. 21-76" is invisible to `insource:"FM 21-76"`. Prefer `list=categorymembers` on the
  category for an authoritative set.
