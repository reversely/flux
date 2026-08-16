# Synoptic characters for the animal identification walks

Research date: 2026-08-15. Subjects: the Dangerous Animals tile (FM 21-76 Ch 11) and the
animal-sign side of Food (Ch 8-9) and Direction Finding (Ch 18).

Frame of reference: the fungi walk already in the repo. `box/scripts/build_mycomorphbox.py`
extracts six characters from Wikipedia's Template:Mycomorphbox,
`pipeline/src/flux_pipeline/walkthrough.py` compiles them into the four `walk_` tables described
in `contracts/pack-format.md`, and the server narrows candidates by the filter rule: a species
survives an answer when it records a matching state or records no state at all for that
character. Every character set below is designed to compile into those same four tables.

## Conventions

- **Character**: the `walk_question.character` key. Lowercase camelCase, as in the fungi tables.
- **Question**: the `walk_question.question` string, field-guide minimal, phrased for a user
  standing at a safe distance.
- **States**: candidate `walk_state.state` values. The compiler emits only the states that
  actually occur in the extracted data, so this column is the design intent rather than the
  final list.
- **Camera**: whether the trait model can answer the node from the live feed.
  `yes` = answerable from a phone frame at a safe distance.
  `zoom` = answerable only with optical or digital zoom, or a macro attachment, on a cooperative
  subject.
  `no` = not answerable by any camera at a safe distance; the user answers it, or it is
  key-only and never asked.
- **Separates**: which venomous-versus-harmless or dangerous-versus-benign confusion the
  character resolves.

Two rules carry over from the fungi walk and one is added.

1. Missing data never eliminates a candidate. A species with no recorded state for a character
   survives every branch of that question.
2. The danger subset of the surviving candidates is shown at every step, before any verdict.
3. **New for animals: a walk never returns "harmless" as an action.** The terminal card states
   the surviving candidate set and the encounter behaviour for the most dangerous member of that
   set. A snake walk that has narrowed to one harmless species still ends on "leave it alone and
   move away", because the cost of a wrong elimination is a bite rather than a bad meal. The
   fungi walk can afford a verdict; these cannot.

Everything below marked UNVERIFIED was not fetched.

---

## 1. Snakes (North America)

### 1.1 Recommended characters

Fourteen asked characters plus one auto-answered filter. Three further characters are recorded in
the data but never asked, because answering them requires handling a live snake.

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 0 | `region` | Auto-answered from the region pack and device location. Not shown as a node. | state or province code | n/a | Removes more candidates than any visual character and costs the user nothing. A copperhead question in Oregon has no copperhead in the candidate set. |
| 1 | `dorsalPattern` | What is the pattern along the back? | `crossbands`, `blotches`, `diamonds`, `complete rings`, `longitudinal stripes`, `unpatterned`, `speckled`, `chevrons` | yes | The coarsest split. Puts coral snake and milk snake into the ringed branch, copperhead and northern watersnake into the crossband branch, rattlesnakes into diamonds and chevrons. |
| 2 | `crossbandShape` | Are the crossbands widest along the sides and pinched narrow over the spine, or widest over the spine? | `wide at sides, pinched at spine (hourglass)`, `wide at spine (saddle)`, `even width`, `not crossbanded` | yes | Copperhead versus juvenile northern watersnake and juvenile racer. The copperhead's hourglass is the single most reliable distance character for that pair, and it survives poor light better than head shape does. |
| 3 | `ringColourOrder` | Where a red ring meets its neighbour, what colour does it touch? | `red touches yellow or white`, `red touches black`, `no red rings`, `rings not complete` | yes | Coral snake versus scarlet kingsnake, milk snake, and scarlet snake. See the caveat in 1.3. |
| 4 | `snoutColour` | What colour is the snout, from the tip back to behind the eyes? | `black`, `red`, `same as body`, `pale or cream` | yes | The same confusion as character 3, without the mnemonic. Every US coral snake has a black snout; the scarlet kingsnake and scarlet snake have a red snout. Two independent characters answering the same question is the point. |
| 5 | `ringsEncircleBody` | Do the rings continue across the belly, or stop at the sides? | `encircle`, `stop at sides`, `belly not visible` | yes | Coral snake (rings encircle) versus milk snake and kingsnake (pattern breaks on a pale, checkered, or blotched belly). |
| 6 | `tailTip` | What is at the end of the tail? | `rattle or button`, `velvet black, distinct from body`, `yellow or green, distinct from body`, `horny spine`, `plain taper` | yes | Rattlesnake versus bullsnake and gophersnake: the visible rattle, never the sound. Also flags juvenile cottonmouth and copperhead, whose yellow-green tail tip is a lure. |
| 7 | `headShape` | Seen from above, is the head much wider than the neck, or does it continue into the neck? | `broad, sharply set off from neck`, `slightly wider than neck`, `continuous with neck` | yes | Weak support only for copperhead versus watersnake and cottonmouth versus watersnake. Watersnakes, hognose, and gartersnakes all flatten the head into a triangle when threatened, which is the failure mode this character is famous for, so it never runs before characters 1, 2, and 6. |
| 8 | `build` | Is the body heavy and thick for its length, or slender? | `heavy`, `moderate`, `slender` | yes | Cottonmouth and copperhead (heavy) versus racers, coachwhips, and ratsnakes (slender). Does not separate cottonmouth from northern watersnake, which is also heavy-bodied. |
| 9 | `facialStripe` | Is there a dark band running through the eye toward the jaw? | `dark eye stripe with pale border above`, `dark eye stripe, no pale border`, `no eye stripe`, `head uniformly dark` | yes | Cottonmouth versus watersnake. The cottonmouth's pale-bordered dark cheek stripe is present on most individuals; adult cottonmouths that have gone uniformly dark answer `head uniformly dark` and stay in the candidate set. |
| 10 | `scaleKeeling` | Does each scale carry a raised ridge down its middle, giving a dull rough look, or is the skin smooth and glossy? | `keeled`, `smooth`, `weakly keeled` | zoom | Racers and kingsnakes (smooth) versus watersnakes and rattlesnakes (keeled). Does not separate cottonmouth from watersnake, since both are keeled. Needs good light and a still animal. |
| 11 | `swimmingPosture` | If it is in the water, how much of the body rides on the surface? | `whole body floats high`, `body submerged, head out`, `not in water` | yes | Cottonmouth versus watersnake, and the best character in that pair that a user can answer from a bank at ten metres. Cottonmouths swim buoyantly with the body on the surface; watersnakes swim with the body largely below it. |
| 12 | `defensiveBehaviour` | What is it doing right now? | `gapes, showing a white mouth lining`, `holds ground, vibrates tail`, `rattles`, `flees to water`, `flees to cover`, `flattens neck and hisses`, `plays dead`, `no reaction` | yes | Cottonmouth (open-mouth gape) versus watersnake (flees, or strikes without gaping). Contingent by nature: a snake that does nothing has ruled nothing out, so this character records a positive observation only and never eliminates on absence. |
| 13 | `microhabitat` | Where is it? | `in or beside permanent water`, `upland rocky slope`, `sandy pine or scrub`, `prairie or grassland`, `arid rock and desert`, `forest floor and leaf litter`, `building or yard` | no (user answers) | Broad support across every pair. Cheap, reliable, and the user always knows the answer. |
| 14 | `adultLength` | Roughly how long, against something you can name? | `under 30 cm`, `30 to 60 cm`, `60 to 120 cm`, `over 120 cm` | zoom | Tiebreaker only. Snakes coil, foreshorten, and are consistently overestimated in the field, and juveniles of large species fall in every bin. |

Recorded but never asked, because each needs the snake in hand:

| Character | Why it is in the data | Why it is not a node |
| --- | --- | --- |
| `pupilShape` | Vertical in pit vipers, round in coral snakes and colubrids. | Requires a face-on view at under a metre. Also fails on its own premise: coral snakes are venomous with round pupils. Ships as a reference note on the species card, not as a question. |
| `lorealPit` | The pit between eye and nostril defines a pit viper. | Same distance problem, aimed at the striking end of the animal. |
| `analPlate` | Divided in most colubrids, single in pit vipers. | A ventral scale count on a live snake. Ships as key data for a future in-hand mode. |

### 1.2 Ask order

Region filter, then `dorsalPattern`, then the branch-specific character that resolves that
branch's worst confusion: `ringColourOrder` and `snoutColour` in the ringed branch,
`crossbandShape` in the crossband branch, `tailTip` in the blotched and diamond branch. Habitat
and behaviour follow. `headShape`, `build`, and `adultLength` run last, because each has a known
failure mode and none should be able to eliminate a venomous candidate while the strong
characters are still unanswered.

### 1.3 The four confusions, and where each character set is fragile

| Confusion | Characters that carry it | Failure mode to encode |
| --- | --- | --- |
| Coral snake versus milk snake and scarlet kingsnake | 3 `ringColourOrder`, 4 `snoutColour`, 5 `ringsEncircleBody` | The red-on-yellow rhyme holds for the three US coral snakes and fails outside the US, and aberrant and melanistic individuals occur. The pack must gate the rhyme on `region`, ship `snoutColour` as an independent confirmation, and never let a single answer to character 3 alone eliminate a coral snake. |
| Copperhead versus northern watersnake | 2 `crossbandShape`, 9 `facialStripe`, 13 `microhabitat` | Juvenile watersnakes are strongly crossbanded and are the usual misidentification. `crossbandShape` is the separator; `headShape` is not, because a threatened watersnake flattens its head. |
| Rattlesnake versus bullsnake and gophersnake | 6 `tailTip`, 1 `dorsalPattern` | Bullsnakes vibrate the tail in dry leaves and hiss, which mimics the sound. The question asks what the tail looks like, never what it sounds like. A rattlesnake that has broken its rattle answers `plain taper`, so the rattlesnake must record both states or record none, and the compiler must not let `plain taper` eliminate it. |
| Cottonmouth versus watersnake | 11 `swimmingPosture`, 12 `defensiveBehaviour`, 9 `facialStripe` | Both are heavy-bodied, keeled, dark, and semi-aquatic, so morphology alone is thin at a safe distance. The behavioural pair carries this confusion, and neither can eliminate on absence. |

### 1.4 Sources

See section 5 for the verdict table covering all four subjects.

---

## 2. Medically important arthropods (North America)

One walk, four branches. The first character routes to a branch and every later character belongs
to exactly one branch, so a session asks at most seven questions after the router. Recommended
total: seventeen characters (one router, four to five per branch), of which twelve are camera
answerable and five need macro range.

### 2.1 Router

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 0 | `region` | Auto-answered from the region pack. | state or province code | n/a | Removes the recluse from most of the northeast and *Centruroides sculpturatus* from everywhere but the southwest. |
| 1 | `bodyPlan` | Count the legs and the body sections. | `8 legs, two body sections, no tail`, `8 legs, pincers and a segmented tail`, `8 legs, one flat oval body, no waist`, `6 legs, waisted body, wings`, `6 legs, waisted body, no wings` | yes | Spider versus scorpion versus tick versus flying hymenopteran versus ant. Larval ticks have six legs and answer the tick branch on `bodyOutline` instead, so the tick branch must accept both. |

### 2.2 Spider branch (widow and recluse)

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 2 | `ventralMarking` | Looking at the underside of the abdomen, is there a red or orange mark? | `red hourglass`, `red or orange spots or bars`, `no marking`, `underside not visible` | yes | Widow versus every other tangle-web spider. The strongest single character in the branch, and the user can see it from below a web without approaching. |
| 3 | `abdomenShape` | Is the abdomen a smooth round ball, or oval and flattened? | `globose`, `oval`, `elongate` | yes | Widow (globose) versus recluse and wolf spiders (oval). |
| 4 | `bodyColour` | Overall colour and finish. | `glossy black`, `brown with pale markings`, `uniform tan to brown, no markings`, `grey mottled and hairy` | yes | Widow (glossy black) versus recluse (uniform tan-brown, no body markings) versus wolf and grass spiders (mottled, hairy). |
| 5 | `dorsalMarking` | Is there a darker violin-shaped mark on the front body section, with its neck pointing back toward the abdomen? | `violin mark present`, `no mark`, `other mark` | zoom | Recluse versus other brown spiders. Reads well on a macro frame and badly at arm's length, and the trait model must be tuned for a high false-positive rate: many harmless brown spiders carry a vaguely violin-like mark, so a positive answer narrows but never confirms. |
| 6 | `legAppearance` | Are the legs banded, spiny, or plain? | `plain, uniform colour, fine hairs only`, `banded`, `conspicuously spiny` | zoom | Recluse (plain, no bands, no stout spines) versus wolf spiders and others. The best available companion to the violin, since it fails independently of it. |
| 7 | `eyeArrangement` | How many eyes, and how are they grouped? | `6 eyes in 3 pairs`, `8 eyes in two rows`, `8 eyes with two large forward eyes` | no | Diagnostic for recluse and effectively unanswerable in the field. A phone camera cannot resolve a 2 mm eye group on a moving spider at any safe distance. It ships as key data and appears on the result card as the confirmation a specialist would use, not as a node. |
| 8 | `webAndPlace` | What is it sitting in, and where? | `irregular tangle web near the ground`, `flat sheet with a funnel retreat`, `round orb web`, `no web, loose sheet in a dark undisturbed space`, `wandering, no web` | yes | Widow (tangle, ground level, sheds and woodpiles) versus recluse (irregular sheet in an undisturbed dark space; the recluse hunts away from its web at night). Environmental, cheap, no approach needed. |

### 2.3 Tick branch

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 9 | `lifeStage` | Legs and size. | `6 legs, pinhead (larva)`, `8 legs, poppy seed (nymph)`, `8 legs, sesame seed or larger (adult)` | zoom | Drives risk more than species does. Nymphal *Ixodes scapularis* transmits most Lyme cases and is the stage users miss. |
| 10 | `scutumPattern` | The shield behind the head: plain or patterned? | `plain dark`, `white or silvery ornate pattern`, `single white or cream dot`, `gold or silver flecked pattern`, `plain reddish brown` | zoom | *Ixodes* (plain dark) versus *Dermacentor* (ornate silvery) versus *Amblyomma americanum* female (single white dot) versus *A. maculatum* (flecked) versus *Rhipicephalus sanguineus* (plain reddish brown). The one tick character with genuinely crisp states. |
| 11 | `mouthpartLength` | Are the mouthparts long and obvious, or short and stubby? | `long`, `short` | zoom | *Ixodes* and *Amblyomma* (long) versus *Dermacentor* and *Rhipicephalus* (short). |
| 12 | `legColour` | Leg colour against the body. | `black, contrasting`, `brown, matching body` | zoom | *Ixodes scapularis* (black legs) versus *Dermacentor variabilis*. |
| 13 | `engorgement` | Is the body flat, or swollen and pale grey? | `flat`, `partly swollen`, `fully engorged` | yes | Not an identification character. It sets the attachment-time estimate that the care record needs, and it warns the walk that pattern characters 10 to 12 are now stretched and unreliable. |

### 2.4 Scorpion branch

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 14 | `pincerVersusTail` | Compare the pincers with the tail: which is heavier? | `slender pincers, thick tail`, `stout heavy pincers, slender tail`, `both moderate` | yes | The one rule that generalises. Slender pincers with a thick tail points at Buthidae, the family holding *Centruroides*; stout pincers with a thin tail points at the large, painful, non-lethal genera. Answerable at a metre. |
| 15 | `colourPattern` | Body colour and stripes. | `uniform tan to yellow`, `two dark longitudinal stripes on the back`, `dark body with yellow legs`, `large and mottled` | yes | *Centruroides sculpturatus* (uniform tan) versus *C. vittatus* (striped) versus *Hadrurus* (large, mottled). |
| 16 | `bodyLength` | Length without the tail, against something you can name. | `under 3 cm`, `3 to 6 cm`, `over 6 cm` | zoom | *Centruroides* is small; the giant hairy scorpions are conspicuously large and much less dangerous, which is the counterintuitive result the card must state plainly. |

`subaculearTubercle`, the small tooth under the sting of *C. sculpturatus*, is recorded and never
asked. It needs a macro view of the underside of a stinger.

### 2.5 Hymenoptera branch

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 17 | `bodyTexture` | Furry or smooth and shiny? | `densely furry`, `sparse hair`, `smooth and shiny` | zoom | Bees (furry) versus wasps, yellowjackets, and hornets (smooth). |
| 18 | `colourPattern` | Colour bands. | `yellow and black bands`, `black and white`, `brown and amber`, `metallic`, `solid red or rust`, `solid black` | yes | Yellowjacket and paper wasp versus bald-faced hornet (black and white) versus honey bee (brown and amber). |
| 19 | `nestForm` | If a nest is visible, what shape? | `exposed umbrella comb on a stalk`, `grey paper ball, fully enclosed`, `hole in the ground or a wall cavity`, `wax comb in a cavity`, `soil mound with no visible opening`, `no nest visible` | yes | Paper wasp versus yellowjacket versus bald-faced hornet versus honey bee versus fire ant. The safest character in the set, since it is answered by pointing the camera at the structure rather than at the insect, and it drives the encounter advice more strongly than the insect's identity does. |
| 20 | `flightAndDefence` | Behaviour. | `foraging on flowers, ignores you`, `investigating food or drink`, `many individuals defending a nest`, `single individual, no nest nearby` | yes | Routes to advice. A foraging bee and a defended yellowjacket nest need opposite responses. |

`stingerRetained`, whether the sting was left in the skin, is answered after a sting rather than
during identification. A barbed sting left behind indicates a honey bee and changes the removal
instruction, so it belongs to the care record in section 4, not to the walk.

---

## 3. Tracks and sign

Recommended: thirteen characters, of which four are measurements. Section 3.3 states honestly
what those four cost.

### 3.1 Characters

| # | Character | Question | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 0 | `region` | Auto-answered from the region pack. | state or province code | n/a | Removes lynx, wolf, grizzly, and moose from most of the country before anything else is asked. |
| 1 | `substrateQuality` | What is the track in? | `wet mud or wet sand`, `dry dust`, `fresh snow`, `old melted-out snow`, `firm ground or leaf litter` | yes | Not an identification character. It is the confidence gate: melted-out snow enlarges a track and can turn a coyote into a wolf, and firm ground drops claw marks that were really there. Every later character's confidence is scaled by this answer. |
| 2 | `printType` | Toes or a hoof? | `toes with pads`, `split hoof`, `bird foot`, `hand-like with long fingers` | yes | The coarsest split: carnivore and rodent versus deer family versus bird versus raccoon and opossum. |
| 3 | `toeCountFront` | How many toes show in the front track? | `2`, `4`, `5`, `3 forward and 1 back`, `4 forward and 1 back` | yes | Canid and felid (4) versus bear, mustelid, raccoon, opossum, and rodents (5). |
| 4 | `toeCountHind` | How many toes in the hind track? | `2`, `4`, `5` | yes | Rabbits and rodents show 4 front and 5 hind, which separates them from canids at a glance. |
| 5 | `clawMarks` | Do claw points show ahead of the toes? | `sharp points ahead of every toe`, `long blunt marks well ahead of the toes`, `no claw marks`, `substrate too firm to tell` | yes | Canid (claws show) versus felid (usually not). The `substrate too firm to tell` state exists so that a firm-ground track cannot eliminate a cougar, and bear claws register far ahead of the toes, which separates them from any large cat. |
| 6 | `toeSymmetry` | Are the toes arranged symmetrically around the midline, or is one toe clearly leading? | `symmetric`, `asymmetric, one leading toe`, `all toes point forward in a fan` | yes | Canid (symmetric, the two front toes paired) versus felid (asymmetric, like a human hand). |
| 7 | `heelPadShape` | The shape of the large pad behind the toes. | `single triangular pad`, `large pad with three lobes at the back and two at the front`, `wide bar`, `C or crescent`, `star or palm with long fingers`, `two pads, not fused`, `no distinct pad` | yes | The strongest single character in the walk. The three-lobed trailing edge of the felid pad, the triangular canid pad, and the wide bar of a bear all read from one clean track. |
| 8 | `negativeSpace` | Draw the gaps between the pads: an X, or a C? | `X-shaped gap`, `C-shaped or H-shaped gap`, `no clear gap` | yes | Canid (X) versus felid (C). It fails independently of characters 5 and 6, which is what makes the coyote-versus-cougar decision safe. |
| 9 | `trackLength` | Track length. | `under 3 cm`, `3 to 5 cm`, `5 to 8 cm`, `8 to 12 cm`, `over 12 cm` | conditional, see 3.3 | Bobcat versus cougar, coyote versus wolf, black bear versus grizzly. These are the pairs where nothing but size decides, so the measurement problem is not an edge case. |
| 10 | `trackWidth` | Track width at the widest point. | same bins as 9 | conditional, see 3.3 | Wolf tracks are proportionally longer than wide; cat tracks are round. The ratio is more robust than either number, and it needs no scale reference at all. |
| 11 | `gaitPattern` | Look at the trail rather than one track. What is the repeating group? | `alternating single prints in a near-straight line`, `pairs, front and hind side by side`, `groups of four with the large hind prints ahead of the front`, `two prints together, then a gap (2x2 bound)`, `wide waddle, prints paired on each side`, `hind print landing in the front print (direct register)` | yes | Fox and cat (direct register, narrow line) versus dog (sloppy, wide) versus rabbit and squirrel (hind ahead of front) versus weasel (2x2) versus bear, raccoon, and opossum (waddle). Answerable from one wide frame with no scale reference, which makes it the highest-value character after 7. |
| 12 | `straddle` | How wide is the trail from the left edge of the left prints to the right edge of the right prints? | `narrow, prints nearly in one line`, `body-width`, `wider than the body` | conditional | Fox versus dog, and cat versus dog. The three coarse states are chosen so the answer survives without a scale reference; absolute straddle in centimetres is recorded per species but only asked when a scale is present. |
| 13 | `signType` | If there is no track, what else is there? | `scat, tubular and tapered with hair or bone`, `scat, tubular and blunt with berries or insect parts`, `pellets`, `chewed stem cut cleanly at an angle`, `chewed stem torn ragged`, `rub or scrape on a tree`, `bed or wallow`, `dig or turned soil`, `feathers or kill remains` | yes | Runs the whole walk when no print exists, which is the common case on firm ground. The clean 45-degree cut versus the ragged tear is the rabbit-versus-deer split, and it is genuinely diagnostic: deer have no upper incisors and tear rather than cut. |

### 3.2 Ask order

Region, `substrateQuality`, then `printType`. With a print: 3, 4, 7, 8, 5, 6, then `gaitPattern`,
then the measurements last. With no print: straight to `signType`.

### 3.3 The measurement problem, stated plainly

Characters 9, 10, and 12 are the only ones that separate bobcat from cougar, coyote from wolf,
and black bear from grizzly. Three honest observations:

1. **A phone camera cannot measure a track without a scale reference in the frame.** A single
   monocular image has no absolute scale. Nothing in the trait model recovers it, and a confident
   number from a scale-free frame would be a fabrication, not a low-confidence estimate.
2. **The available mitigations are unequal.** Asking the user to lay a known object beside the
   track works and is cheap: a credit card is 85.6 by 53.98 mm by ISO/IEC 7810 ID-1, and a US
   banknote is 156 by 66.3 mm. Both are exact, both are in a pocket, and a card gives the model a
   rectangle with known dimensions and known aspect ratio to solve the homography from. ARKit
   depth on a LiDAR-equipped iPhone gives real-world scale without any object, and the app is
   React Native on iOS, so this is reachable; it is also device-gated and needs its own accuracy
   measurement before any number it produces is allowed to eliminate a candidate.
3. **Therefore the measurement characters are gated, not merely low-confidence.** The walk asks
   characters 9, 10, and 12 only after a scale reference is confirmed in frame. Without one it
   skips them, and the walk terminates on a candidate set rather than a species: "bobcat or
   cougar, both present in this region; treat as cougar." That is the correct outcome. The
   dangerous failure is a scale-free frame that returns "bobcat" for a cougar track.

Character 10's aspect ratio, length divided by width, is the exception. It needs no scale at all,
and it should be extracted from the same frame as a first-class character rather than being
derived from two gated numbers.

---

## 4. Mammal and bird encounter advice

This is not a walk. It has no characters, because there is nothing to eliminate: the user already
knows what they are looking at, or the walk in section 1, 2, or 3 has just told them. What it
needs is a routing table from an identification outcome to a short reviewed advice record, and a
second routing table from an injury to a care record.

### 4.1 Record shape

Each advice record is one `block` in the pack with these fields, which reuse the existing content
model rather than adding a table:

| field | content |
| --- | --- |
| `trigger` | The identification outcome that routes here: a species, a candidate set, or a situation such as `bear, species undetermined`. |
| `distance` | The minimum separation the source states, as a number, so the card can show it before any prose. |
| `do` | Three to five imperative lines, in order. |
| `never` | The explicit anti-actions, which is where most bad folk advice lives. |
| `escalate` | The condition that turns this into an evacuation or a call for help. |
| `citation` | Source and licence, per the existing `license` column convention. |

### 4.2 Routing

| Identification outcome | Advice record | Note |
| --- | --- | --- |
| Any bear, species undetermined | `bear-generic` | Species matters for the response, and black bear and grizzly responses differ in a way that a wrong identification inverts. When the walk cannot separate them, the record must state both branches rather than pick one. |
| Black bear confirmed | `bear-black` | |
| Grizzly or brown bear confirmed | `bear-brown` | |
| Cougar | `cougar` | |
| Moose, bison, elk in rut | `large-ungulate` | The distance number is the whole record. |
| Coyote, wolf | `canid` | |
| Any venomous snake, or any snake not confidently excluded | `snakebite-prevention` then `snakebite-firstaid` | The candidate set never has to collapse to one species for the care record to be correct, which is the reason snakebite care can be routed on a set. |
| Widow, recluse | `spider-bite-care` | |
| Scorpion | `scorpion-sting-care` | |
| Tick attached | `tick-removal` | The single most instruction-sensitive item in the tile. |
| Hymenoptera sting | `sting-care`, `anaphylaxis` | |
| Any mammal bite or scratch | `rabies-exposure` | Routes on the injury, not the species, since the exposure rule is species-independent above a threshold. |
| Nesting or brooding bird, raptor | `bird-encounter` | |

### 4.3 What the care records must contradict

Every source below is being fetched for the same three reasons: the distance or dose number, the
ordered actions, and the anti-actions. The anti-actions matter most, because the folk versions
are widespread and actively harmful.

- Snakebite: no cutting, no suction, no tourniquet, no ice, no electric shock, no alcohol, no
  attempt to capture the snake. Photograph from a distance if it is safe, then go.
- Tick: no petroleum jelly, no heat, no nail polish, no twisting. Fine-tipped tweezers, straight
  steady pull, close to the skin.
- Recluse bite: no excision of the lesion.
- Bear: the black bear and brown bear responses differ, and the wrong one is dangerous.

---

## 5. Sources

Licence verdicts use three values.

- **Ship**: the extracted values may go into a pack and onto a user's phone, with the attribution
  the licence requires.
- **Reference**: usable to inform a record that the project writes in its own words, and not
  copied into a pack.
- **Unusable**: not usable for this product at all.

Every row marked UNVERIFIED was not fetched.

### 5.1 Snakes

| Source | URL fetched | Form | Coverage | Licence, verbatim | Verdict |
| --- | --- | --- | --- | --- | --- |
| Wikipedia species articles | `en.wikipedia.org/wiki/Agkistrodon_contortrix`, `/Micrurus_fulvius`, `/Nerodia_sipedon`, `/Crotalus_atrox` | Prose. `Agkistrodon contortrix` gives dorsal scale rows, ventral and subcaudal counts, supralabials, and length. `Micrurus fulvius` gives band order, "divided" anal plate, "smooth, and are in 15 rows at midbody", length, and defensive behaviour. `Nerodia sipedon` gives round pupils, head shape, length, pattern, habitat, and behaviour, and gives no keeling, no anal plate, and no scale rows | About one article per North American species, roughly 130, at uneven depth | "Text is available under the Creative Commons Attribution-ShareAlike 4.0 License; additional terms may apply." (`en.wikipedia.org/wiki/Wikipedia:Copyrights`) | **Ship, after extraction.** The only source with both open licensing and per-species diagnostic characters. Coverage is inconsistent article to article, which the filter rule already tolerates: a species missing a character survives that question. |
| Wikipedia `Template:Speciesbox` | `en.wikipedia.org/wiki/Template:Speciesbox` | Parameters are media, taxon, genus, species, authority, parent taxon, conservation status, and subdivisions | n/a | as above | **Not a trait source.** This is the finding that decides the snake pipeline: there is no snake equivalent of Template:Mycomorphbox. The fungi walk's extraction script has no analogue here, and pretending otherwise would waste a sprint. |
| Wikidata | `wikidata.org/wiki/Special:EntityData/Q222287.json` | 43 claims: taxon rank, name, parent, IUCN status, images, range map, and about 30 external identifiers. No morphology property | Every species has an item | Wikidata is CC0 (licence page UNVERIFIED) | **Not a trait source.** |
| SquamBase (Meiri et al.) | `zenodo.org/records/10602503`, `datadryad.org/api/v2/datasets/doi:10.5061/dryad.76hdr7t3b` | Bulk XLSX: traits, literature, trait metadata, length and mass allometry. The record describes "morphological, ecological, life history, geographic and conservation-related" traits. The actual column list is UNVERIFIED, since both hosts refused the download from this environment | 11,744 squamate species worldwide | Zenodo: "Creative Commons Zero v1.0 Universal". Dryad API: `license: https://spdx.org/licenses/CC0-1.0.html` | **Ship, for what it holds.** The one CC0 structured trait database in reach. Published descriptions point at body size, ecology, and life history, so expect it to fill `adultLength` and possibly `microhabitat`, and not the scale characters. Retry the download before relying on it. |
| CDC NIOSH venomous snakes | `cdc.gov/niosh/outdoor-workers/about/venomous-snakes.html` (403 direct; text read from a snapshot, see 5.4) | Prose bullets per venomous group: copperhead colour, hourglass bands, facial pit, and 1.5 to 3 ft; rattlesnake strike distance and rattle | Four groups, not species | "Most of the information on the CDC and ATSDR websites is not subject to copyright, is in the public domain, and may be freely used or reproduced without obtaining copyright permission." | **Ship, text only, tiny coverage.** Four group-level records, useful as the safety text behind a candidate set rather than as trait data. Excludes third-party photographs. |
| USGS | `usgs.gov/information-policies-and-instructions/copyrights-and-credits`, `nas.er.usgs.gov`, `pubs.usgs.gov/fs/2005/3109/report.pdf` | No North American snake trait resource found. NAS holds nonindigenous aquatic occurrence records; the fact sheet covers the brown treesnake on Guam | Effectively zero for this walk | "USGS-authored or produced data and information are considered to be in the U.S. Public Domain" | **Licence is fine, the data is not there.** Worth recording so nobody searches USGS twice. |
| SREL Herpetology, University of Georgia | `srelherp.uga.edu/snakes/copperhead/` | The best per-species identification prose found: head colour called "a key identification feature", hourglass crossbands with a count of 10 to 18, "Scales are keeled", heat pits, neonate yellow tail tip, habitat, habits, venom, first aid | 46 species of South Carolina and Georgia | Footer: "© University of Georgia, Athens, GA 30602". No licence grant on the page | **Reference.** The single best-written source for this walk and it cannot ship. Use it to decide which characters are worth asking, then take values from Wikipedia. |
| Animal Diversity Web | `animaldiversity.org/accounts/Crotalus_atrox/`, `/about/terms_of_use/` | Prose plus a few structured numeric fields: range length, mass, lifespan. Not identification characters | Most North American snakes, uneven | "© 2025, Regents of the University of Michigan". The terms page carries no licence grant | **Reference.** |
| Missouri Department of Conservation field guide | `mdc.mo.gov/terms-use`, `mdc.mo.gov/field-guide/search?fgSpeciesType=1008` | Species prose | Missouri | "You may not reproduce this site's text, images, or videos without the Department's written permission." / "Copyright ©2026 Conservation Commission of Missouri. All Rights Reserved." | **Unusable.** |
| Texas Parks and Wildlife | `tpwd.texas.gov/site/policies/copyright-policy` | Species prose | Texas | "Content of this site © Copyright Texas Parks and Wildlife Department unless otherwise noted." Republication is granted for news releases; other reuse needs consent, with a non-commercial and educational allowance credited "Information courtesy Texas Parks and Wildlife Department © [year]" | **Reference.** A shipped app is not clearly the non-commercial educational case. |
| Florida FWC | `myfwc.com/wildlifehabitats/profiles/reptiles/snakes/` | Species profile prose | Florida | "Copyright 1999 - 2026 State of Florida." No licence grant found | **Reference.** |
| Virginia DWR | `dwr.virginia.gov/wildlife/reptiles/` | Species information prose | Virginia | "© 2026 Virginia Department of Wildlife Resources". No terms page found | **Reference.** |
| iNaturalist | `api.inaturalist.org/v1/taxa/26159` | The taxon endpoint returns id, rank, ancestry, photos, observation count, conservation statuses, Wikipedia summary, and vision flags. Annotations are observation-level, such as life stage and sex, and never species characters | n/a | "By default, all observation data, images, and sounds posted to iNaturalist have a default license of CC BY-NC" | **Unusable as a trait source.** Photographs default to NonCommercial, which also constrains reference images. |
| Reptile Database | `reptile-database.reptarium.cz/species?genus=Crotalus&species=atrox` | The diagnosis section now reads: "Unfortunately we had to temporarily remove additional information as this was scraped by multiple AI companies who sell that data." | Global | No open licence | **Unusable.** |
| EOL TraitBank | `eol.org/docs/what-is-eol/traitbank`, `/data-licensing`, `opendata.eol.org` | Not retrieved. Cloudflare 403 to the fetch tool, to curl with browser headers, and through a proxy. The v1.0 page API answered and returned no traits | n/a | UNVERIFIED | **UNVERIFIED.** Retry from a different network before writing it off. |
| SSAR and state herpetological society keys | not fetched | n/a | n/a | UNVERIFIED | **UNVERIFIED.** The session web-search budget ran out first. |

### 5.2 Medically important arthropods

Several of these were unreachable directly and were read from a snapshot or a mirror. Each such
row says so, and a licence read from a mirror is weaker evidence than one read from the origin.

| Source | URL fetched | Form | Coverage | Licence, verbatim | Verdict |
| --- | --- | --- | --- | --- | --- |
| CDC materials policy | `cdc.gov/other/agencymaterials.html` (403 direct; read from the snapshot `web.archive.org/web/20260815021831/...`) | Policy prose | n/a | "Most of the information on the CDC and ATSDR websites is not subject to copyright, is in the public domain, and may be freely used or reproduced without obtaining copyright permission." Four conditions follow, including "1) Attribution to the agency that developed the material must be provided", "3) You may not change the substantive content of the materials; and 4) You must state that the material is otherwise available on the agency website for no charge." | **Ship, with the condition-3 problem recorded in section 7.** |
| CDC "Where ticks live" | `cdc.gov/ticks/about/where-ticks-live.html` (read through the `restoredcdc.org` mirror) | Semi-structured per-species blocks: photograph, "Where found", "Transmits", and seasonality or biting-stage notes | *I. scapularis*, *I. pacificus*, *D. variabilis*, *D. similis*, *D. andersoni*, *A. americanum*, *A. maculatum*, *R. sanguineus*, *H. longicornis* | CDC policy above | **Ship, for distribution and vector role.** It carries no morphology at all, so it fills the `region` filter and the disease-risk text and answers none of characters 10 to 12. |
| CDC NIOSH venomous spiders | `cdc.gov/niosh/outdoor-workers/about/venomous-spiders.html` (via the mirror) | Bulleted traits. Widow: "pattern of red coloration on the underside of their abdomen". Recluse: "Brown with a dark violin-shaped marking on its head. Has six equal-sized eyes (most spiders have eight eyes)." Plus habitat bullets | Widow and recluse at genus level | CDC policy above | **Ship.** Thin, and directly on characters 2, 6, and 7. |
| CDC NIOSH insects and scorpions | `cdc.gov/niosh/outdoor-workers/about/insects-and-scorpions.html` (via the mirror) | Prose. Bees, wasps, and hornets grouped together with nest locations; fire ants with mound behaviour and "red bumps... become white fluid-filled pustules"; scorpions as nocturnal, under rocks and wood, in the "Southern and Southwestern United States" | Hymenoptera and scorpions with no species split | CDC policy above | **Reference.** Too coarse to populate characters 14 to 20. |
| Egizi et al. 2019, *ZooKeys* 818:117-128 | `pmc.ncbi.nlm.nih.gov/articles/PMC6353864/` | Illustrated dichotomous couplets by life stage with SEM photomicrographs. Characters include palp segment spurs, basis capituli cornua, hypostomal dental formula, and body shape | *Haemaphysalis* of North America, which is not the target genus set | "This is an open access article distributed under the terms of the CC0 Public Domain Dedication." | **Ship, wrong genus.** The best licence found anywhere in this subject, and it confirms that Pensoft *ZooKeys* tick keys carry CC0. That makes *ZooKeys* the place to look for a key that does cover *Ixodes*, *Dermacentor*, and *Amblyomma*. |
| Frontiers tick morphology paper | `pmc.ncbi.nlm.nih.gov/articles/PMC12371277/` | Table 2 is a genuine per-species and per-sex character matrix: dorsum colour and size, basis capituli shape, leg spur configuration, abdominal features, spiracular plate morphology | *Hyalomma* and Old World *Rhipicephalus* and *Dermacentor* | "This is an open-access article distributed under the terms of the Creative Commons Attribution License (CC BY)." | **Ship by licence, irrelevant by geography.** Its value is as the exact table shape the pack wants. |
| Illinois Adult Tick Key, INHS | `inhs-mel.github.io/Illinois-Adult-Tick-Key/`, `github.com/inhs-mel/Illinois-Adult-Tick-Key` | An interactive character matrix built in TaxonWorks with photographs. Structurally the closest thing found to what the pack needs | Common adult ticks of Illinois | No licence statement on the page and no LICENSE file in the repository | **Unusable as it stands, and the highest-value thing to ask for.** A CC BY grant from the maintainers would hand the tick branch a ready-made matrix. |
| Ixodidae of California larval keys | `pmc.ncbi.nlm.nih.gov/articles/PMC2795641/` | Keys to four genera and 18 *Ixodes*, with drawings and photomicrographs at 100 to 400 times magnification | California *Ixodes* including *I. pacificus* | Licence not displayed; a PMC author manuscript with only a copyright-notice link | **UNVERIFIED, treat as Reference.** The magnification also puts these characters outside anything a phone can see. |
| UC IPM Pest Note 7442 | `ipm.ucanr.edu/PMG/PESTNOTES/pn7442.html` | The best eye-arrangement prose found: recluse "6 eyes, arranged in pairs in a semicircle"; wolf spider "4 small eyes in front in a straight row, one middle pair of larger eyes, and one rear pair of widely spaced eyes"; plus sizes and abdomen markings | Widow, recluse, and the harmless look-alikes: funnel weaver, wolf, jumping, yellow sac, hobo, tarantula | "©1996—2026 Statewide IPM Program, Agriculture and Natural Resources, University of California Regents of the University of California unless otherwise noted." | **Reference.** It covers the look-alikes that decide the branch, and none of it can be copied. |
| Penn State Extension ticks | `extension.psu.edu/common-ticks-and-tick-borne-diseases-in-pennsylvania` | Prose, photographs, distribution maps. Comparative size and the lone star "single white dot in the center of a reddish-brown body". Avoids scutum and mouthpart characters | Pennsylvania ticks | "© 2026 The Pennsylvania State University" | **Reference.** |
| Texas A&M AgriLife spiders | `agrilifeextension.tamu.edu/asset-external/spiders/` | Publication record | Texas spiders | "© 2026 Texas A&M AgriLife. All rights reserved." | **Unusable.** |
| Texas A&M urban entomology, black widow | `urbanentomology.tamu.edu/spiders/black-widow-spider/` | A bulleted trait list, the closest thing to a field-by-field record on any extension page: "Typically jet black"; "Underside of abdomen contains two reddish triangles"; "Adults average 1½ inches long"; "Have 8 eyes in two rows" | Black widow | No copyright footer on the page, and no licence grant either | **Unusable.** Absence of a notice is not a grant. |
| Ohio State Ohioline | `ohioline.osu.edu/factsheet/aex-892271` | Prose: the hourglass, and the recluse's "three pairs of eyes, one pair in the middle and another pair toward each side of their head", with the violin qualified "but not always" | Widow and recluse | "Copyright © 2018, The Ohio State University" | **Unusable.** |
| TickEncounter, University of Rhode Island | `web.uri.edu/tickencounter/` | Photo-based identification tools and a submission service. Nothing structured on the page | n/a | "Copyright © 2026 University of Rhode Island" | **Unusable.** |
| Wikipedia species articles | `en.wikipedia.org/wiki/Latrodectus_mactans`, `/Loxosceles_reclusa`, `/Ixodes_scapularis`, `/Centruroides_sculpturatus`, `/Velvet_ant` | Prose, no trait template. *L. mactans* gives "Female body length: 8-13 mm; males: 3-6 mm", the hourglass, and juvenile variation. *L. reclusa* gives eye count and arrangement, the violin, uniform leg colour, and size. *C. sculpturatus* gives "a small light brown scorpion" and lengths, and gives no comparison with the harmless bark scorpions | One article per species | "Text is available under the Creative Commons Attribution-ShareAlike 4.0 License; additional terms may apply." | **Ship, after extraction.** Same role as in the snake pipeline. |
| USDA ARS | `ars.usda.gov/oc/timeline/tick/` | A historical narrative about cattle tick fever eradication. No identification content, and no copyright statement on the page | n/a | none asserted on the page | **Unusable for this feature.** |
| BugGuide | `bugguide.net/node/view/15740` | Not retrieved; Cloudflare 403 to the fetch tool and to curl with three user agents | n/a | UNVERIFIED | **UNVERIFIED, treat as unusable.** Images are contributor-held regardless of what the site terms say. |
| iNaturalist media licensing | `help.inaturalist.org/en/support/solutions/articles/151000169918-...` | No per-species trait data of any kind | n/a | "By default, all media uploaded to iNaturalist are released under a Creative Commons Attribution-Non-Commercial license." | **Unusable as a trait source.** |
| GBIF | `techdocs.gbif.org/en/openapi/` | Species, occurrence, and literature APIs. No morphological character endpoint | Taxonomy and occurrences | Per-dataset licences | **Unusable as a trait source**, usable for distribution. |
| WHO publishing policy | `who.int/about/policies/publishing/copyright` | Policy page | n/a | The standard licence is CC BY-NC-SA 3.0 IGO. "Permission is required for commercial uses and licensing of WHO materials, such as using the material in the context of a commercial activity." | **Reference.** |
| PAHO venomous animal report | `iris.paho.org/handle/10665.2/69070` | Not retrieved, 403 | Epidemiology rather than morphology | UNVERIFIED | **UNVERIFIED, and the wrong content type.** |

### 5.3 Tracks and sign

| Source | URL fetched | Form | Coverage | Licence, verbatim | Verdict |
| --- | --- | --- | --- | --- | --- |
| NPS Mount Rainier, "Carnivore Tracking in Washington's National Parks" (2021) | `nps.gov/mora/planyourvisit/upload/Carnivore-Tracks-12-20-21_508.pdf` | Per-species measurement blocks: front and hind track length and width in inches and cm, stride and trail width broken out per gait, plus prose on pad shape, claw registration, and negative space | 9 species: gray wolf, coyote, red fox, wolverine, fisher, marten, mountain lion, Canada lynx, bobcat | No licence text in the document. NPS policy: "Copyright law does not protect 'any work of the U.S. Government'... a work prepared by an officer or employee of the U.S. Government as part of that person's official duties", with the caveat "Not all materials appearing on this website... are in the public domain" (`nps.gov/aboutus/disclaimer.htm`) | **Ship, text and numbers only.** The best fit found for this walk's schema: the fields map close to one-to-one onto characters 9 to 12. Track illustrations are credited to a named artist and photographs to a non-federal project, so the figures are not shippable. |
| Taylor and Raphael 1988, "Identification of Mammal Tracks from Sooted Track Stations in the Pacific Northwest", *California Fish and Game* 74(1) | `fs.usda.gov/psw/publications/4251/taylor1.pdf` | A statistical table: mean, N, SD, and 95% confidence interval in millimetres for seven standardized landmarks, fore and hind separately, plus a dichotomous key | 23 species including black bear, cougar, bobcat, coyote, raccoon, skunk, mink, porcupine, opossum, squirrels, marten, fisher | No licence statement in the PDF. Federal-employee authorship. USDA: "Most information presented on the USDA Web site is considered public domain information and may be freely distributed or copied" (statement located by search, the policy page itself UNVERIFIED) | **Ship, with the measurement context attached.** These are sooted aluminium plate impressions, which the paper states are markedly smaller than soil or snow tracks. Storing them without that label would corrupt the size bins. |
| North Dakota Game and Fish, "Tracks and Signs of North Dakota Wildlife" | `gf.nd.gov/sites/default/files/publications/tracks_signs_of_nd_wildlife.pdf` | Per-species front and rear length and width in inches plus walking stride, and a full sign section covering scat, scrapes, rubs, beds, chews, pellets, lodges | The broadest coverage found, including the ungulates, lagomorphs, beaver, wild turkey, pheasant, and waterfowl that no federal source covers | No copyright statement anywhere in the brochure, and no licence grant. Photographs individually credited to named people | **Reference.** The best-coverage document and the one that cannot ship. Absence of a copyright notice is not a licence. |
| Missouri Department of Conservation | `mdc.mo.gov/terms-use` | Terms page only; the tracks guide returned 404, UNVERIFIED | n/a | "Copyright ©2026 Conservation Commission of Missouri. All Rights Reserved." / "You may not reproduce this site's text, images, or videos without the Department's written permission." | **Unusable.** |
| Minnesota DNR | `dnr.state.mn.us/aboutdnr/disclaimers_and_policies.html` | Policy page | n/a | "The Minnesota Department of Natural Resources (DNR) claims copyright on all intellectual property created by the department" / "For commercial uses, including print publications, publication on other websites or in other formats or media, permission is required." | **Unusable.** |
| Washington DFW | `wdfw.wa.gov/species-habitats/living/species-facts` | Prose species pages | Washington species | Footer: "© 2026 All rights reserved." | **Unusable.** |
| New Mexico State University Circular 561 | `pubs.nmsu.edu/_circulars/CR561/index.html` | Prose plus track lengths and widths in inches | 9 species | "Contents of publications may be freely reproduced for educational purposes. All other rights reserved." | **Reference.** An educational-use carve-out is not an open licence and does not cover a shipped app. |
| Jewell et al. 2017, puma footprint identification, *PLOS ONE* | `journals.plos.org/plosone/article?id=10.1371/journal.pone.0172065` | S1 Table: 535 footprints, 35 individual pumas, 128 measured variables as XLSX | Cougar, left hind foot only | "The work is made available under the Creative Commons CC0 public domain dedication." | **Ship, low value.** A morphometric dataset for telling individual pumas apart, not field-guide dimensions. |
| OpenAnimalTracks | `arxiv.org/abs/2406.09647`, `github.com/dahlian00/OpenAnimalTracks` | 3,579 images with species and substrate labels, no measurements | 18 species | arXiv perpetual non-exclusive licence on the paper; MIT on the code; dataset access gated behind a research-verification form | **Reference.** Gated access and no dimensions. Its value is as a bench set for the trait model, not as pack data. |
| Wikimedia Commons animal track categories | `commons.wikimedia.org/wiki/Category:Animal_tracks`, `.../Category:Illustrations_of_animal_tracks` | 68 photographs and 13 illustrations. The illustration set is mostly African species and 18th-century European hunting plates | Poor for the target species | "All structured data from the file namespace is available under the Creative Commons CC0 License; all unstructured text is available under the Creative Commons Attribution-ShareAlike License; additional terms may apply." | **Ship per file, not a data source.** No measurements. |
| iNaturalist | `help.inaturalist.org/en/support/solutions/articles/151000175695-what-licenses-can-i-apply-to-my-content-` (terms page and the tracks project page both returned 403, UNVERIFIED) | Observations and photographs; no standardized measurement fields | n/a | Default "CC BY-NC (Creative Commons: Attribution-NonCommercial)"; per-item licences vary and "all rights reserved" is an option | **Reference.** NonCommercial by default, per-item variation, and no trait fields. |
| CyberTracker and the Wildlife Track Project | searched, no published database or licence grant found | n/a | n/a | n/a | **UNVERIFIED, and no open dataset appears to exist.** A certification programme rather than a data source. |

### 5.4 Encounter and care advice

| Source | URL fetched | Content | Licence, verbatim | Verdict |
| --- | --- | --- | --- | --- |
| NPS bear safety | `nps.gov/subjects/bears/safety.htm` | The black bear and brown bear branches: "If you are attacked by a brown/grizzly bear, leave your pack on and PLAY DEAD." / "If you are attacked by a black bear, DO NOT PLAY DEAD. Try to escape to a secure place such as a car or building." Plus identify yourself, talk calmly, move away slowly and sideways | NPS disclaimer as above | **Ship.** Supplies `bear-black`, `bear-brown`, and the both-branches text for `bear-generic`. |
| NPS mountain lion safety | `nps.gov/articles/mountain-lion-safety.htm` | "Do not run from a lion. Running may stimulate a mountain lion's instinct to chase." / "Do not crouch down or bend over" / "Do all you can to appear larger." / "Fight back if attacked." | NPS disclaimer | **Ship.** |
| FWS mountain lion safety | `fws.gov/story/mountain-lion-safety` | Fuller version of the same, with the reason attached: "Never bend over or crouch down. Doing so causes humans to resemble four-legged prey animals." | "Not all the information on our site is in the public domain. Some images/graphics are licensed for use under the copyright law, and the use of the Service logo is restricted to official publications." (`fws.gov/disclaimer`) | **Ship, text only.** No FWS images or logo. |
| NPS wildlife distance rule | `nps.gov/subjects/watchingwildlife/7ways.htm` | "stay a minimum distance of 25 yards from most wildlife and 100 yards from predators like bears and wolves", with the note that parks vary | NPS disclaimer | **Ship.** Supplies the `distance` field for `large-ungulate` and `canid`. |
| Yellowstone safety | `nps.gov/yell/planyourvisit/safety.htm` | The park-specific numbers: "Keep at least 25 yards (23 meters) from bison at all times and never approach a bison to take a photo", the same for elk, and "at least 100 yards (91 meters) from bears... wolves and cougars" | NPS disclaimer | **Ship.** Resolves the bison number the general page leaves out, and shows why the record needs a park or jurisdiction field rather than one national number. |
| Lavonas et al. 2011, "Unified treatment algorithm for the management of crotaline snakebite", *BMC Emergency Medicine* 11:2 | `pmc.ncbi.nlm.nih.gov/articles/PMC3042971/` | A numbered-box algorithm. Box 15 recommends against wound incision and suction, ice and cryotherapy, NSAIDs, prophylactic antibiotics, prophylactic fasciotomy, electrical current, arterial tourniquets, and pressure immobilization with lymphatic constricting bands | "This is an Open Access article distributed under the terms of the Creative Commons Attribution License" | **Ship.** The strongest licensed snakebite source found, and it covers exactly the North American crotalines. One stated limit: "the panel did not evaluate field first aid or other prehospital therapy", so the anti-action list ships and positive field first aid does not come from here. |
| WHO, *Guidelines for the management of snakebites*, 2nd ed. | `who.int/publications/i/item/9789290225300` and `who.int/about/policies/publishing/copyright` (the full PDF at `iris.who.int` returned 403, UNVERIFIED) | Clinical management guidance for South-East Asian snakes | WHO publications carry CC BY-NC-SA 3.0 IGO, permitting reuse "for non-commercial purposes" | **Reference.** Two blockers. NonCommercial makes it unsafe for anything sold or bundled with a paid device, and ShareAlike would force the derived pack section to carry the same licence. It is also the wrong continent for this tile. This corrects PRD 5.1, which lists "WHO first-aid and snakebite material" as "Open access": open access is not an open licence, and the NC term is the operative fact. |
| CDC and NIOSH pages for ticks, snakes, spiders, and rabies | `cdc.gov/other/agencymaterials.html`, `cdc.gov/ticks/about/where-ticks-live.html`, `cdc.gov/niosh/outdoor-workers/about/venomous-spiders.html`, `.../venomous-snakes.html` | Tick distribution and vector role, spider and snake safety bullets, and the agency reuse policy | "Most of the information on the CDC and ATSDR websites is not subject to copyright, is in the public domain, and may be freely used or reproduced without obtaining copyright permission", subject to four conditions including attribution, a non-endorsement disclaimer, "You may not change the substantive content of the materials", and a statement that the material is free on the agency site | **Ship, with two caveats.** Every `cdc.gov` URL returns HTTP 403 to the fetch tool, to curl with a browser user agent, and through a text proxy, so the policy text above was read from a Wayback snapshot and the content pages from the `restoredcdc.org` mirror. A licence read from a mirror is weaker evidence than one read from the origin, and someone on an unblocked network should confirm it. Condition 3 is the second caveat, and section 7 records it. |
| MedlinePlus, National Library of Medicine | `medlineplus.gov/about/using/usingcontent/` | Health topic summaries, and the A.D.A.M. Medical Encyclopedia articles that cover bite and sting first aid | Federal content: "You may reproduce, redistribute, and link freely to non-copyrighted content". But "A.D.A.M. Medical Encyclopedia articles and videos", drug monographs, and "Most images, illustrations, and photos" require permission, and "You may not ingest and/or brand the copyrighted content found on MedlinePlus in an EHR, patient portal, or other health IT system." | **Split verdict: Ship the health topic summaries, Unusable for A.D.A.M.** The trap is that the A.D.A.M. encyclopedia is exactly where the first-aid procedures live, so a naive scrape of medlineplus.gov pulls the copyrighted half. |
| American Red Cross first aid | `redcross.org/terms-of-use.html` and the first-aid steps page, both returned 403, UNVERIFIED | First aid and CPR procedure | Not retrieved. Reported as "copyrighted by and the exclusive property of The American National Red Cross... All rights reserved" | **Unusable** on any reading, though the exact wording is UNVERIFIED. |
| OSHA *Fatal Facts: Insect Stings* | `osha.gov/sites/default/files/publications/OSHA4137.pdf` | PDF text extraction failed | Not retrieved | **UNVERIFIED.** OSHA is a federal agency, so the expected verdict is Ship. **No verified openly licensed hymenoptera sting or anaphylaxis source was found**, which is the second open gap. |

---

## 6. Extraction: what the fungi pipeline does and does not transfer

The fungi walk works because Wikipedia holds a template whose parameters are the characters. One
API walk over Template:Mycomorphbox transclusions produces a clean per-species trait table with a
revision id per row, and no human reads a sentence. Nothing in this document has an equivalent.

| Subject | Structured source that exists | What has to be extracted from prose | Review needed |
| --- | --- | --- | --- |
| Snakes | SquamBase (CC0), covering body size and some ecology, with the column list UNVERIFIED | Every diagnostic character: pattern, crossband shape, ring order, snout colour, tail, keeling, head shape, behaviour. Source is Wikipedia prose, CC BY-SA 4.0 | Herpetologist review of every venomous species and every look-alike, before the walk ships |
| Arthropods | CDC "Where ticks live" for distribution and vector role, which carries no morphology. The Illinois key is a real matrix with no licence | Every morphological character, from Wikipedia and CDC NIOSH prose | Medical entomologist review of the widow, recluse, and tick branches |
| Tracks | NPS Mount Rainier measurement blocks for 9 carnivores, Taylor and Raphael 1988 for 23 species in a sooted-plate context | Everything for ungulates, lagomorphs, beaver, wild pig, and the three birds, none of which any open source covers | Review by a tracker, and a decision recorded on the state-guide question below |
| Encounter advice | None. Prose is the native form for advice | Nothing, in the mechanical sense: NPS, FWS, and the CC BY snakebite algorithm are already sentences, and the work is selection and ordering | Clinical review of the care records |

Three consequences.

1. **The pipeline is model-assisted extraction with human review, not a scrape.** Budget it as
   the work, not as a preprocessing step. The output shape is unchanged: a TSV of species,
   character, state, and a source revision id, feeding the same `walkthrough` compiler.
2. **A missing value is safe and a wrong value is not.** The filter rule already keeps a species
   with no recorded state in every branch, so an extraction that declines to guess costs a
   longer walk. An extraction that guesses wrong can eliminate a coral snake. The extraction
   prompt should be tuned to abstain, and the review pass should measure the wrong-value rate
   rather than the coverage rate.
3. **ShareAlike needs a decision before the first pack is built.** Individual trait values are
   facts, and US law does not protect facts. A pack systematically derived from Wikipedia prose
   is arguably an adaptation, which would pull the derived tables under CC BY-SA 4.0. Whichever
   way that goes, it should be a recorded decision with the Wikipedia-derived fields kept
   separable from the rest, not an assumption discovered at publication.

## 7. Open items

1. **CDC verification from an unblocked network.** Every `cdc.gov` URL refused this environment.
   The policy text was read from a Wayback snapshot and the content pages from a third-party
   mirror. CDC is the intended source for tick removal, spider and scorpion care, and rabies
   exposure, which is four of the thirteen routes in section 4.2.
2. **CDC condition 3, "You may not change the substantive content of the materials."**
   Decomposing CDC prose into per-species trait rows is arguably exactly that. Public domain
   status means copyright cannot stop it, and shipping under a "Source: CDC" attribution while
   restructuring the content sits outside CDC's stated terms. The likely resolution is to cite
   CDC as a reference behind a record the project writes, rather than presenting the pack rows
   as CDC material.
3. **No verified open source for hymenoptera sting care or anaphylaxis.** The OSHA *Fatal Facts*
   PDF would not extract, and the Red Cross is all rights reserved.
4. **No open source separates *Centruroides sculpturatus* from the harmless bark and devil
   scorpions**, and none splits honey bee, yellowjacket, paper wasp, and bald-faced hornet with
   nest type and sting apparatus at species level. Characters 14 to 20 currently have no
   shippable values behind them.
5. **Ask INHS Medical Entomology for a CC BY grant on the Illinois Adult Tick Key.** It is a
   TaxonWorks character matrix with photographs, which is the exact shape the tick branch needs,
   and it is unlicensed rather than restrictively licensed. One email is the cheapest possible
   route to structured data in this whole document.
6. **Look for a *ZooKeys* tick key covering *Ixodes*, *Dermacentor*, and *Amblyomma*.** The
   *Haemaphysalis* key confirms Pensoft ships these under CC0, so a covering key may already
   exist. Also check `stacks.cdc.gov` for the CDC pictorial keys to arthropods of public health
   significance. Neither search ran, because the session web-search budget was exhausted.
7. **Retry the SquamBase download.** Zenodo and Dryad both refused this environment, so the CC0
   trait columns are asserted from the record description rather than read.
8. **Decide the state-guide question and record it.** The North Dakota brochure is the only
   document covering the ungulates, lagomorphs, and birds, and it carries no licence grant.
   Extracting numeric values as uncopyrightable facts, re-expressed in the project's own words
   with no prose or plates copied, is a defensible reading and it is a legal judgement rather
   than a licence.
9. **Track illustrations must be drawn.** Every openly licensed track illustration set found is
   African species or 18th-century European hunting plates. The reference image beside the live
   feed, which PRD 1.5 requires at every node, has no source for this subject.
10. **EOL TraitBank and BugGuide are UNVERIFIED**, both blocked by Cloudflare from this
    environment.
