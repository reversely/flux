# Synoptic character sets for fungi and plants

A design for the character vocabulary a LifeKit identification walk asks. It replaces the six
mycomorphbox characters currently driving the fungi walk with 26 characters, and specifies 28
characters for a plant walk that has no template backbone to start from.

## Conventions used in the tables

`Camera` column values:

- `direct`: a model can judge the state from one or two photographs of the specimen as found.
- `after action`: the user cuts, digs, or rubs the specimen and photographs it again; the model
  judges the second photograph.
- `user`: no photograph carries the state. Smell, texture, brittleness, and a spore print that
  needs six hours on paper fall here. The app asks and the user answers.

`Split` column values name which existing mycomorphbox parameter the character comes out of, so the
extraction code knows what it is unpacking. `new` means mycomorphbox records nothing for it.

The deadly pairs referenced by shorthand:

| Shorthand | Pair |
| --- | --- |
| P1 | *Amanita phalloides* / *A. virosa* / *A. bisporigera* against *Agaricus campestris* and *A. bisporus* |
| P2 | *Galerina marginata* against *Pholiota* spp., *Armillaria* spp., *Kuehneromyces mutabilis* |
| P3 | *Chlorophyllum molybdites* against *Macrolepiota procera* and *C. rhacodes* |
| P4 | *Cortinarius orellanus* / *C. rubellus* against *Cantharellus cibarius* |
| P5 | *Gyromitra esculenta* and *Verpa* spp. against *Morchella* spp. |
| P6 | *Scleroderma citrinum* against *Lycoperdon* puffballs, and any *Amanita* egg against a puffball |

---

# 1. The fungi character table

Ordered by rank for the dangerous set. Rank 1 asks first.

| Rank | Character | Question shown to the user | States | Camera | Split from | Separates |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `volvaType` | Dig up the whole base, brush the soil off, and look at the very bottom of the stem. What do you find? | `sacklike cup`, `membranous collar`, `friable powdery patches`, `rimmed bulb`, `abrupt basal bulb, no cup`, `none, base plain` | after action | `stipeCharacter` | P1, P6 |
| 2 | `sporePrintColorGroup` | Lay the cap gills down on paper for a few hours. What colour is the dust it leaves? | `white or cream`, `pink`, `rusty brown`, `chocolate or purple brown`, `black`, `green`, `yellow or ochre`, `not taken` | user | `sporePrintColor`, binned from 21 states to 7 | P1, P2, P3, P4 |
| 3 | `gillColorMature` | On a fully opened cap, what colour are the gills right now? | `white`, `cream or pale yellow`, `pink`, `grey brown`, `chocolate brown`, `rusty brown`, `green or grey green`, `black` | direct | new | P1, P3 |
| 4 | `substrate` | What is it growing out of? Push the litter aside and check whether the stem reaches soil or wood. | `soil or humus`, `hardwood`, `conifer wood`, `buried wood or roots`, `grass or lawn`, `dung`, `moss`, `burn site`, `cone`, `another fungus` | direct with a context shot | `ecologicalType`, split from the trophic mode | P2 |
| 5 | `ringType` | Look at the upper stem. Is there a ring, a cobwebby veil, or a band of fibres? | `pendant skirt`, `movable ring`, `ascending or flaring`, `double or belted`, `cortina, cobwebby`, `fibrillose ring zone`, `sheathing`, `none` | direct | `stipeCharacter` | P1, P2, P4 |
| 6 | `hymeniumType` | Turn the cap over. What is on the underside? | `gills`, `pores`, `teeth`, `blunt forking ridges`, `smooth`, `pitted head`, `lobed brain-like head`, `gleba, no underside` | direct | `hymeniumType`, plus two ascomycete states | P4, P5, P6 |
| 7 | `bruisingReaction` | Rub the cap edge and cut the stem base, wait a minute, then look for a colour change. | `none`, `yellow`, `yellow only at the base`, `red then black`, `red or pink`, `blue or green`, `brown`, `black` | after action | new | P1, P3 |
| 8 | `growthHabit` | How is it arranged where it grows? | `single`, `scattered`, `gregarious troop`, `clustered from one base`, `fairy ring or arc`, `tiered on wood` | direct | new | P2 |
| 9 | `capDiameter` | Measure the widest cap across. | `under 2 cm`, `2 to 5 cm`, `5 to 10 cm`, `10 to 20 cm`, `over 20 cm` | direct with a scale object in frame | new | P2, P3 |
| 10 | `rhizomorphs` | Peel the bark or scrape the soil at the base. Are there black or dark cords running away from the stem? | `black shoestring cords`, `white mycelial mat`, `none visible` | after action | new | P2 |
| 11 | `whichGills` | How do the gills meet the stem? | `free`, `adnate`, `adnexed`, `decurrent`, `sinuate`, `emarginate`, `seceding`, `no gills` | direct | `whichGills` | P1, P4 |
| 12 | `capSurfaceTexture` | Feel and look at the cap top. | `smooth`, `viscid or slimy when wet`, `silky fibrillose`, `recurved scales`, `flat appressed scales`, `warty patches`, `granular or powdery`, `cracked` | direct | new | P2, P3 |
| 13 | `universalVeilRemnants` | Are there loose patches or warts sitting on top of the cap that could be wiped off? | `warts`, `one large patch`, `powdery bloom`, `none` | direct | new | P1, P6 |
| 14 | `odour` | Crush a small piece of flesh and smell it. | `mild or none`, `mealy`, `phenolic or inky`, `almond or anise`, `radish`, `garlic`, `spermatic`, `chlorine`, `foetid`, `fruity` | user | new | P1 |
| 15 | `capMarginStriation` | Look at the very edge of the cap against the light. Are there lines running inward? | `smooth, no lines`, `striate`, `deeply sulcate`, `appendiculate with veil fragments` | direct | new | P1, P2 |
| 16 | `stipeBaseShape` | What shape is the stem where it enters the ground? | `equal`, `clavate`, `abrupt marginate bulb`, `rounded bulb`, `rooting`, `narrowed` | after action | `stipeCharacter` | P1 |
| 17 | `interiorOnSection` | Slice the whole mushroom in half from cap top to stem base. What is inside? | `solid white flesh`, `hollow single chamber`, `chambered or wadded`, `stuffed with pith`, `outline of a small mushroom inside`, `solid purple-black interior`, `white powdery interior` | after action | new | P5, P6 |
| 18 | `capStemAttachment` | On a pitted or wrinkled head, is the head joined to the stem all the way down? | `fused full length`, `attached at the top only`, `hanging free like a skirt`, `not applicable` | direct | new | P5 |
| 19 | `gillSpacing` | How close together are the gills? | `crowded`, `close`, `subdistant`, `distant` | direct | new | P2, P4 |
| 20 | `latex` | Break a gill and watch for a few seconds. Does anything ooze out? | `none`, `white`, `white turning yellow`, `orange`, `red`, `watery` | after action | new | none of the six, gates *Lactarius* |
| 21 | `fleshTexture` | Snap the stem. How does it break? | `fibrous, tears in strands`, `brittle, snaps like chalk`, `tough and leathery`, `gelatinous`, `soft and watery` | user | new | P4 |
| 22 | `hygrophanous` | Compare the cap centre with the edge. Is it drying to a paler band from the middle outward? | `yes`, `no` | direct | new | P2 |
| 23 | `stipeSurface` | Look at the stem below the ring. | `smooth`, `fibrillose`, `scaly`, `reticulate netting`, `powdery`, `patterned like snakeskin` | direct | new | P3 |
| 24 | `stipeApexAboveRing` | Above the ring, is the stem lined or smooth? | `striate or grooved`, `smooth`, `no ring present` | direct | new | P1 |
| 25 | `capShape` | What shape is the cap? | `conical`, `convex`, `flat`, `umbonate`, `depressed`, `infundibuliform`, `ovate`, `campanulate`, `offset`, `no cap` | direct | `capShape` | weak on all six |
| 26 | `trophicMode` | What is it living on? | `mycorrhizal`, `saprotrophic`, `parasitic`, `lichenised` | user, or inferred from `substrate` and host | `ecologicalType`, split from the physical substrate | P1 |

## What the six mycomorphbox characters must be split into

`stipeCharacter` carries the entire lethal signal in one field and its five states collapse
distinctions that decide whether a specimen kills. Its state `ring and volva` records that both
structures exist and drops which kind of each. Split it four ways:

- `volvaType` (character 1). A sacklike membranous cup around the base marks *Amanita* section
  Phalloideae. A friable powdery zone of warts marks *A. muscaria* and *A. pantherina*. A rimmed
  bulb with no free cup marks *A. citrina* and the *Lepiota* allies. mycomorphbox records all three
  as the same word.
- `ringType` (character 5). mycomorphbox does carry `cortina`, and it carries it as one of the same
  five values as `ring and volva`, so the field can record a cortina or a volva and never both, and
  it records no ring subtype at all. A thin fibrillose ring zone separates *Galerina marginata* from
  the persistent membranous ring of *Kuehneromyces mutabilis*, and mycomorphbox writes `ring` for
  both.
- `stipeBaseShape` (character 16). The abrupt marginate bulb of *A. phalloides* against the equal
  base of *Agaricus campestris*.
- `stipeApexAboveRing` (character 24) and `stipeSurface` (character 23).

`ecologicalType` mixes the physical thing the mushroom sits on with its trophic relationship.
`mycorrhizal` tells the user nothing they can see. Split it into `substrate` (character 4), which a
photograph answers, and `trophicMode` (character 26), which the database supplies once the host tree
is known. The wood-versus-ground distinction alone removes every *Agaricus* from a *Galerina* walk.

`sporePrintColor` has 21 states, most of them shades no user can distinguish on paper under a
headlamp. Bin them to the 7 states of character 2 and keep the fine value in the database for
reference. Green survives the binning as its own state because *Chlorophyllum molybdites* is the
only common lawn mushroom that prints green.

Characters mycomorphbox has no field for at all, listed by the pair they decide:

| Missing character | Why the walk needs it |
| --- | --- |
| `gillColorMature` | The field-usable proxy for a spore print. *Agaricus* gills run pink then chocolate; *Amanita phalloides* gills stay white through maturity. A user who will not wait six hours for a print still answers this. |
| `bruisingReaction` | Separates *Agaricus xanthodermus* (chrome yellow at the stem base, phenolic smell) from *A. arvensis*, and *Chlorophyllum rhacodes* (flesh reddens) from *C. molybdites*. |
| `rhizomorphs` | Black cords under the bark put a cluster in *Armillaria*. *Galerina marginata* never makes them. |
| `capDiameter` | *Galerina marginata* caps run 1.7 to 4 cm. A 12 cm cap on wood is not *Galerina*. |
| `growthHabit` | Densely caespitose clusters fused at a single base point at *Armillaria* and *Omphalotus*. |
| `interiorOnSection` | *Morchella* is hollow from cap apex to stem base as one chamber; *Gyromitra* is chambered and cottony. An *Amanita* egg shows a small mushroom in outline; a *Lycoperdon* is uniform white; *Scleroderma* is solid purple-black. One cut answers three deadly cases. |
| `capStemAttachment` | *Verpa* attaches at the apex only. *Morchella* is fused down its full length. |
| `universalVeilRemnants` | Warts on the cap plus a bulbous base put a specimen in *Amanita* even when the volva has been left in the ground. |
| `odour` | The phenolic or ink smell of *Agaricus xanthodermus* is the earliest warning in that genus. |
| `capMarginStriation` | *A. phalloides* has a non-striate margin; the edible *A. vaginata* group is deeply sulcate. |
| `hygrophanous` | Marks the small brown mushrooms including *Galerina*. |
| `gillSpacing` | *Cantharellus* ridges are distant, thick and forking; *Cortinarius* gills are close and blade-like. |
| `latex` | Gates *Lactarius* out of every other walk in one question. |
| `fleshTexture` | Brittle chalky flesh marks *Russula* and *Lactarius*. Chanterelle flesh tears in white strands. |

The walk never asks for taste. A nibble-and-spit test is standard in older literature and it does
not belong in a tool aimed at users who cannot already identify the specimen.

## Rank justification for the dangerous set

Rank order above is by how many dangerous species each character removes when the walk asks it
first, against the composition of the dangerous set: amatoxin *Amanita*, amatoxin *Galerina* and
*Lepiota*, *Chlorophyllum molybdites*, orellanine *Cortinarius*, *Gyromitra*, isoxazole *Amanita*,
*Omphalotus*, *Entoloma sinuatum*, *Paxillus*, muscarine *Inocybe* and *Clitocybe*, *Scleroderma*.

- Characters 1 through 3 target the amatoxin *Amanita* group, which accounts for the large majority
  of fatal poisonings worldwide. `volvaType` alone divides the whole dangerous set into a volvate
  branch and a non-volvate branch and no other character does that.
- Character 4, `substrate`, splits the set again at right angles to the volva question, because
  *Galerina*, *Omphalotus*, and *Armillaria* live on wood while every lethal *Amanita* comes out of
  soil.
- Characters 5 and 6 close *Cortinarius* and the ascomycetes.
- Characters 7 through 10 are the cheap discriminators inside the branches the first six create.
- Character 25, `capShape`, ranks last of the retained mycomorphbox characters. Cap shape changes
  with age in nearly every species, so an honest database records two or three states per species and
  the filter removes almost nothing.

The current six-character walk asks the questions that leave 101 candidates and 39 dangerous species
standing on the deadly-Amanita signature. Adding `gillColorMature`, `capMarginStriation`,
`universalVeilRemnants`, `stipeApexAboveRing`, and `capDiameter` to the volva and ring split is what
turns that branch from a genus-level answer into a species-level one.

---

# 2. The fungi source table

Verdicts and licence findings below come from fetching each source.

| Source | What it holds per species | Characters it yields | Licence, as stated | Extraction verdict |
| --- | --- | --- | --- | --- |
| USDA Forest Service GTR-NRS-79 (2011, rev. 2012), Ostry, Anderson and O'Brien, *Field Guide to Common Macrofungi in Eastern Forests and Their Ecosystem Functions* | 61 species, organised by forest ecosystem then by ecological role, with a fixed labelled template per entry: `Identification`, `Season of fruiting`, `Ecosystem function`, `Edibility`, `Fungal note`. No key. The `Identification` field is itself semicolon-delimited by organ | Cap colour and texture, gill colour and attachment, veil, volva, stalk, `substrate`, `trophicMode`, season. Size measurements are largely absent | US government work, public domain. Eight photographs credited "used with permission" to Neil A. Anderson at the University of Minnesota are not covered by that, so the images are not automatically public domain | **Structured template.** The highest extraction confidence of any fungi source and no extraction model required. 61 species is too few to be a spine |
| USDA Bulletin 175 (1915), Patterson and Charles, *Mushrooms and Other Common Fungi* | Roughly 300 species with 9 keys (Agaricaceae, Polyporaceae, *Boletus*, Hydnaceae, Tremellaceae, Clavariaceae, Gasteromycetes, Phallaceae, Lycoperdaceae) and a glossary. The Agaricaceae key is an indented nested key branching on volva and ring presence, stem position, gill attachment, latex, and spore colour | volva (49 mentions), ring (193), gill attachment and colour (214), latex (22), cap surface and colour, size in inches, substrate, odour (13), bruising (8). It records no per-species spore print colour; spore colour appears only as a key-level grouping | US government work, 1915, public domain. archive.org: "The contributing institution believes that this item is not in copyright" | **Regular prose pattern.** The most template-like of the four historic books, with a fixed semicolon-delimited slot order. The descriptive paragraphs OCR cleanly; the key's dot-leader lines OCR badly ("Wolva-audsnimesbothspresent") and need repair. archive.org id `mushroomsotherco175patt` |
| McIlvaine (1902), *One Thousand American Fungi* | Roughly 1,000 species. Pileus 2,097 mentions, Stem 2,587, Gills 1,141, Spores 1,377 with micron measurements, Ring 1,018, Volva 208, latex 122, taste 356, bruising 45. Also per-species US state distribution and edibility verdicts attributed to named authorities. No analytical key | The richest character coverage of the four books | Public domain, 1902, author died 1909 | **Regular prose pattern.** Fixed capitalised slot labels in a fixed order (`Pileus`, `Flesh`, `Stem`, `Ring`, `Gills`, `Spores`), which is close to a template. Budget an OCR normalisation pass for "PileilS", "King deflexed", and hyphenation broken across lines. Use archive.org id `toadstoolsmushro00mcilrich`; the record `onethousandameri0000mcil` is lending-restricted with no open full text |
| Atkinson (1900), *Studies of American Fungi* | A true numbered dichotomous key to the North American genera, split by spore-print colour group, keying on volva and annulus presence, gill attachment, gill edge, stipe texture, veil type, and latex. Per-species descriptions with metric and imperial sizes | The genus key is the most valuable piece. Descriptions give all macroscopic characters | Public domain, 1900, author died 1918. A clean transcription exists at Project Gutenberg #26492 | **Header is regex-extractable** (`Genus (Subgenus) species Author. Edible. —`) and the body is narrative with one sentence per organ, so a regex scopes the sentence and a model reads the value. The Gutenberg transcription removes the OCR problem entirely |
| Hard (1908), *The Mushroom, Edible and Otherwise* | Several hundred Ohio-region species. Gills 751 mentions, volva 130, bruising 58, taste 119, odour 83, latex 11, annulus 11, spore print only 4. One key in the whole book, for the Podaxineae | Organ-per-paragraph descriptions. Lowest yield per token of the four | Public domain, 1908, author died 1914. archive.org marks `mushroomedibleot00harduoft` NOT_IN_COPYRIGHT. Gutenberg #29086 | **Free text needing model-assisted extraction with review.** Paragraph splitting is mechanical; value extraction is not |
| Wikipedia `Mycomorphbox` template | 1,791 mainspace articles transclude it. 8 parameters, each except `name` and `hymeniumType` with a second-value variant | The 7 categorical characters now in the pack. It records no volva flag separate from ring, no gill spacing, no bruising, no latex, no substrate, no size, and no cap surface texture | CC BY-SA 4.0, attribution by page title and revision id | **Structured template.** Already built by `box/scripts/build_mycomorphbox.py` |
| Wikidata properties P783 to P789 | The same 7 characters as mycomorphbox, one for one: hymenium type 1,115 statements, cap shape 910, hymenium attachment 975, stipe character 696, spore print color 1,374, ecological type 1,055, edibility 1,562 | The same 7, at 700 to 1,600 species per property | CC0 | **Structured, and CC0 rather than CC BY-SA.** Its value is as a cross-check on values extracted from prose, because it mirrors mycomorphbox rather than extending it |
| Wikipedia article prose and `Speciesbox` | Free-text Description, Habitat, and Similar species sections on the same 1,791 articles. `Speciesbox` itself carries taxonomy, authority, range map, and conservation status, and no morphology | Every character in the table, unevenly. The Similar species section maps directly onto the deadly pair table | CC BY-SA 4.0, and ShareAlike carries into the derived table | **Model-assisted extraction with review.** The Description section follows a house order (cap, gills, stem, spore print, microscopy) that makes section-scoped prompting workable |
| Mushroom Observer | 618,488 observations and 6,394 name descriptions through an unauthenticated REST API v2. Descriptions carry named fields: `gen_desc`, `diag_desc`, `distribution`, `habitat`, `look_alikes`, `uses`, `notes`, `refs`, `classification`. `diag_desc` is organ-labelled prose with gill spacing, warts, margin striation, and staining stated plainly | Nearly the full character table where `diag_desc` is populated, which was 36 of 100 sampled records | Per record. Sampling 100 description records returned 90 CC BY-NC-SA 3.0 and 10 CC BY-SA 3.0, and none permissive. The GBIF-published occurrence dataset is CC BY-NC 4.0 | **Regular prose pattern, good quality, licence-encumbered.** Usable only if a non-commercial and share-alike obligation is acceptable, and only by propagating the per-record `license` field. The CC BY-SA 3.0 tenth is the shippable slice |
| GBIF | 60.4M fungal occurrence records, taxonomy backbone, distribution | Region and season filters. The Species Profile extension carries only coarse flags such as marine and terrestrial | Per dataset: CC0 22.7M records, CC BY 4.0 21.6M, CC BY-NC 4.0 16.0M | **Structured.** Use it for the region and month filters that shrink the candidate set before the first character question, keeping CC0 and CC BY publishers only |
| MycoBank | Nomenclature, typification, and deposited protologue descriptions | Name reconciliation | The re3data registry record `r3d100011222` lists dataLicense CC BY-NC-ND 4.0. The site itself is an Angular application that serves no terms text to a fetch | **Blocked.** NC plus ND rules out a derived dataset of any kind |
| Index Fungorum | Name, author, year, publication, current status | Name reconciliation only, no morphology | Footer: "© Board of Trustees of the Royal Botanic Gardens, Kew", with terms deferred to kew.org. No open licence stated | **Reference only.** SOAP webservices exist; custom datasets are by collaboration |
| FunFun (`traitecoevo/fungaltraits`) | 51,555 records over 96 trait names | `substrate` (1,147 records), spore dimensions (790), fruiting body size (690), plus imported FUNGuild trophic mode and growth form (1,116). No cap colour, gill attachment, gill spacing, ring, volva, bruising, or spore print colour | MIT, per the R package DESCRIPTION and LICENSE file | **Structured, and carries no identification characters.** Take `substrate` and fruiting body size and nothing else |
| FungalTraits (Põlme et al. 2020) | 10,210 genera against 17 lifestyle traits, including Fruitbody_type with 23 states and Hymenium_type | Coarse fruitbody and hymenium type at genus level | Crossref lists no Creative Commons licence. Springer Nature text-and-data-mining terms apply, "© Mushroom Research Foundation 2021". Not open access | **Unusable.** Genus level, no diagnostic morphology, and no reuse grant |
| MushroomExpert.com | A rigid labelled schema that would suit this table exactly: `Ecology`, `Cap`, `Gills`, `Stem`, `Flesh`, `Odor`, `Spore Print`, `Microscopic Features` | Everything, unusable | Footer reads "© MushroomExpert.Com" with a citation line. No Creative Commons licence anywhere on the site | **Unusable as shipped data.** Use only to check an extraction by hand |
| Funga Nordica, Fungi of Temperate Europe | The best modern keys, roughly 2,800 species in the latter | Everything, unusable | Commercial print monographs from Nordsvamp and Princeton University Press. The keys are the publishers' product | **Unusable as shipped data** |

### Recommended build order for fungi

1. Keep the mycomorphbox table as the species spine and the source of the seven existing characters,
   and add Wikidata P783 to P789 as a CC0 cross-check on those same values.
2. Parse GTR-NRS-79 first. Its 61 entries need no extraction model, so they give a labelled test set
   for every extractor built afterwards, at a known-correct value per species.
3. Run the regex-plus-model pass over McIlvaine 1902 and USDA Bulletin 175 for `volvaType`,
   `ringType`, `stipeBaseShape`, `bruisingReaction`, `gillSpacing`, `latex`, `odour`, and
   `capDiameter`. Both books use fixed capitalised organ labels in a fixed order, so a regex scopes
   the clause and a model reads the value out of it. McIlvaine covers roughly 1,000 species, which is
   most of the mycomorphbox spine.
4. Take Atkinson 1900 from the Project Gutenberg transcription rather than the archive.org OCR, and
   use its numbered genus key to build the `walk_question` ask order for the genus-level part of the
   walk. It already encodes which character a mycologist asks first.
5. Fill the remainder from Wikipedia Description sections under CC BY-SA, recording page title and
   revision id per value so the pack states which values carry ShareAlike.
6. Review every value on a species whose `howEdible` is `deadly` or `poisonous` by hand, against
   MushroomExpert.com as a reference read with no text entering the pack. That set is small enough
   for one person to check and it is the set where a wrong value hurts someone.

The 1900s edibility verdicts in McIlvaine and Hard are of their period and must never ship as the
app's verdict.

---

# 3. The plant character table

Ordered by rank for the dangerous set. The dangerous set here is dominated by Apiaceae (*Conium*,
*Cicuta*, *Aethusa*), Solanaceae (*Atropa*, *Solanum*, *Datura*), *Toxicodendron*, *Ricinus*,
*Aconitum*, *Digitalis*, *Veratrum*, *Colchicum*, *Nerium*, and *Phytolacca*.

Deadly pairs referenced by shorthand:

| Shorthand | Pair |
| --- | --- |
| Q1 | *Conium maculatum* against *Daucus carota* |
| Q2 | *Cicuta maculata* against *Pastinaca sativa* and *Sium suave* |
| Q3 | *Atropa belladonna* and *Solanum* spp. against *Vaccinium*, *Sambucus*, *Ribes* |
| Q4 | *Toxicodendron radicans* against *Acer negundo* and *Rubus* |
| Q5 | *Veratrum* and *Colchicum* against *Allium ursinum* and ramps |
| Q6 | *Digitalis purpurea* against *Symphytum officinale* |

| Rank | Character | Question shown to the user | States | Camera | Separates |
| --- | --- | --- | --- | --- | --- |
| 1 | `leafArrangement` | Look where leaves join the stem. How many leaves come out at each point? | `alternate`, `opposite`, `whorled`, `basal rosette`, `fascicled` | direct | Q4, Q6 |
| 2 | `stemSurfaceMarking` | Look at the lower stem in good light. | `plain green`, `purple blotches or streaks`, `purple throughout`, `waxy bloom`, `red at the nodes` | direct | Q1, Q2 |
| 3 | `stemHairs` | Run a finger up the stem and look closely. | `hairless and smooth`, `finely hairy`, `bristly`, `prickly`, `woolly` | direct at macro range | Q1, Q6 |
| 4 | `crushedOdour` | Crush a leaf between your fingers and smell it. | `none`, `carrot or parsley`, `celery`, `parsnip sweet`, `mousy or musty`, `onion or garlic`, `mint`, `almond`, `foetid`, `tomato-leaf rank` | user | Q1, Q5 |
| 5 | `stemCrossSection` | Cut the stem across with a knife. What does the cut face look like? | `round and solid`, `round and hollow`, `square`, `triangular`, `ridged or grooved`, `winged`, `chambered` | after action | Q1, Q2 |
| 6 | `rootOnSection` | Dig the root and slice it lengthwise. | `single fleshy taproot`, `chambered with cross partitions`, `bulb with tunic`, `corm`, `fibrous`, `rhizome`, `tuber` | after action | Q2, Q5 |
| 7 | `sapOnCut` | Cut a leaf stalk and watch the cut end for ten seconds. | `clear watery`, `white milky`, `yellow or orange`, `red`, `sticky resin`, `none visible` | after action | gates Euphorbiaceae and Apocynaceae |
| 8 | `leafComplexity` | Is each leaf one blade, or is it divided into separate leaflets? | `simple`, `trifoliate`, `palmately compound`, `once pinnate`, `twice pinnate`, `three or more times pinnate` | direct | Q1, Q4 |
| 9 | `leafletCount` | If the leaf is divided, how many leaflets does one leaf carry? | `3`, `5`, `7`, `9 or more`, `not compound` | direct | Q4 |
| 10 | `veinTermination` | Follow a vein on a toothed leaflet out to the edge. Does it reach the point of a tooth or the notch between two teeth? | `ends at the tooth tip`, `ends at the notch`, `margin not toothed` | direct at macro range | Q2 |
| 11 | `inflorescenceType` | How are the flowers arranged on the plant? | `compound umbel`, `simple umbel`, `raceme`, `panicle`, `spike`, `head`, `cyme`, `solitary`, `catkin`, `spadix` | direct | Q1, Q3, Q6 |
| 12 | `involucralBracts` | Look under the flower cluster where all the stalks meet. Are there small leaves there? | `conspicuous and finely three-forked`, `simple and few`, `absent`, `papery` | direct | Q1, Q2 |
| 13 | `fruitType` | What does the plant carry after flowering? | `berry`, `drupe`, `pome`, `capsule`, `pod`, `achene`, `schizocarp`, `nut`, `samara`, `aggregate`, `multiple`, `cone` | direct | Q3, Q4 |
| 14 | `fruitArrangement` | Are the fruits single or in a group? | `solitary`, `paired`, `cluster or raceme`, `flat-topped umbel`, `dense head` | direct | Q3 |
| 15 | `calyxAtFruit` | Look at the base of the fruit where it joins its stalk. | `flared five-lobed star`, `small persistent teeth`, `inflated husk`, `none` | direct | Q3 |
| 16 | `fruitColorMature` | What colour is the ripe fruit? | `black`, `blue`, `red`, `white or cream`, `purple`, `green`, `yellow`, `brown` | direct | Q3, Q4 |
| 17 | `fruitSurface` | Is the fruit smooth or covered? | `smooth`, `ribbed`, `bristly`, `hooked`, `spiny`, `warty`, `winged` | direct | Q1 |
| 18 | `flowerColor` | What colour are the petals? | `white`, `yellow`, `pink`, `purple`, `blue`, `red`, `green`, `brown` | direct | Q2 |
| 19 | `flowerSymmetry` | Fold the flower in your mind. How many ways can it be halved into matching sides? | `radial`, `bilateral`, `no petals` | direct | Q6 |
| 20 | `corollaForm` | What shape is the flower as a whole? | `free petals`, `fused tube`, `bell`, `funnel`, `two-lipped`, `hooded`, `strap`, `urn` | direct | Q6 |
| 21 | `leafMargin` | Look at the edge of one leaf or leaflet. | `entire`, `serrate`, `doubly serrate`, `dentate`, `crenate`, `lobed`, `deeply dissected`, `spiny` | direct | Q4 |
| 22 | `venationPattern` | Look at the vein pattern across the whole leaf. | `pinnate`, `palmate`, `parallel`, `parallel and pleated`, `dichotomous` | direct | Q5 |
| 23 | `armature` | Are there thorns, prickles, or spines, and where? | `none`, `stem prickles`, `stem thorns`, `leaf spines`, `bristles` | direct | Q4 |
| 24 | `growthForm` | What kind of plant is it overall? | `annual herb`, `perennial herb`, `grass or sedge`, `vine`, `shrub`, `tree`, `aquatic` | direct | Q4 |
| 25 | `leafBaseAttachment` | Where the leaf stalk meets the stem, what does it do? | `stalked`, `sessile`, `clasping`, `perfoliate`, `sheathing`, `with stipules`, `with an ochrea` | direct | Q1, Q5 |
| 26 | `woodyStemFeatures` | On a woody stem, check for aerial roots, pith colour, and bud position. | `hairy aerial rootlets`, `smooth bark`, `lenticelled`, `white pith`, `chambered pith`, `opposite buds`, `alternate buds`, `not woody` | direct, pith after action | Q4 |
| 27 | `habitat` | What is the ground like here? | `wet meadow or streambank`, `standing water`, `dry field`, `roadside or disturbed`, `open woodland`, `deep shade`, `coastal`, `garden escape` | direct with a context shot | Q2 |
| 28 | `plantHeight` | How tall is the whole plant? | `under 30 cm`, `30 cm to 1 m`, `1 to 2 m`, `over 2 m`, `woody, over 3 m` | direct with a scale reference | Q1 |

## How the plant characters resolve each deadly pair

- **Q1, poison hemlock against wild carrot.** `stemSurfaceMarking` = `purple blotches` and
  `stemHairs` = `hairless and smooth` put a plant in *Conium*. *Daucus carota* has a solid, bristly,
  unspotted stem. `crushedOdour` = `mousy or musty` confirms *Conium*, `carrot or parsley` confirms
  *Daucus*. `involucralBracts` = `conspicuous and finely three-forked` is diagnostic for *Daucus*.
  `plantHeight` over 2 m is *Conium*. Five independent characters agree, which is what a safety walk
  needs before it says a white-flowered umbel is edible.
- **Q2, water hemlock against parsnips.** `rootOnSection` = `chambered with cross partitions` is the
  single decisive character for *Cicuta*, and it needs the user to dig and cut. `veinTermination` =
  `ends at the notch` separates *Cicuta* from *Sium suave*, whose veins run to the tooth tips.
  `flowerColor` = `yellow` puts a plant in *Pastinaca* and out of both hemlocks. `habitat` =
  `standing water` narrows the whole branch.
- **Q3, deadly nightshade against berry lookalikes.** `fruitArrangement` = `solitary` plus
  `calyxAtFruit` = `flared five-lobed star` is *Atropa*. *Sambucus* carries berries in a flat-topped
  cluster, *Vaccinium* in small groups with a five-toothed crown at the fruit apex rather than a
  flared star at its base, *Ribes* in a hanging raceme. `corollaForm` = `bell` with
  `inflorescenceType` = `solitary` catches *Atropa* in flower.
- **Q4, poison ivy against boxelder.** `leafArrangement` answers it alone: *Toxicodendron radicans*
  is alternate, *Acer negundo* is opposite. `leafletCount` = `3` fits both, so the walk must not ask
  it first. `woodyStemFeatures` = `hairy aerial rootlets` is *Toxicodendron*. `armature` = `stem
  prickles` puts a three-leaflet plant in *Rubus*.
- **Q5, false hellebore and autumn crocus against wild garlic.** `crushedOdour` = `onion or garlic`
  is the fast answer and the one users skip. `venationPattern` = `parallel and pleated` is
  *Veratrum*. `rootOnSection` = `corm` is *Colchicum*, `bulb with tunic` is *Allium*.
  `leafBaseAttachment` = `sheathing` fits *Veratrum*.
- **Q6, foxglove against comfrey.** `leafArrangement` = `basal rosette` then alternate for
  *Digitalis*; *Symphytum* leaves run down the stem as wings. `corollaForm` = `bell` with
  `flowerSymmetry` = `bilateral` in a one-sided raceme is *Digitalis*. `stemHairs` = `bristly` is
  *Symphytum*.

---

# 4. The plant source table

Verdicts below come from fetching each site's own terms page or API. Where a site blocks automated
clients, the row says so and names what was reachable instead.

| Source | What it holds per species | Does it carry identification characters? | Licence, as stated | Access | Verdict |
| --- | --- | --- | --- | --- | --- |
| USDA PLANTS characteristics | 82 fields per species across Morphology and Physiology, Growth Requirements, Reproduction, Suitability and Use. Includes Growth Form, Height Mature, Flower Color, Foliage Color and Texture, Fruit or Seed Color, Bloom Period, Toxicity, and `Palatable Human` | Partly. It gives `growthForm`, `flowerColor`, `fruitColorMature`, `plantHeight`, and bloom timing. It has no leaf arrangement, leaf margin, venation, or sap colour | US federal work, uncopyrightable under 17 USC 105. The USDA-wide policy states most information on USDA sites is public domain. The PLANTS-specific policies page is an Angular shell that serves no text, so no PLANTS page was quotable | Open REST API, no key: `plantsservices.sc.egov.usda.gov/api/PlantCharacteristics/{id}`, with a public Swagger document and a download endpoint | **Usable as shipped data.** Take it as the structured spine for 5 of the 28 characters and for the edibility field |
| Britton and Brown, *Illustrated Flora of the Northern United States* (1913), and Gray's *New Manual of Botany* 7th ed. (1908), on archive.org | Full dichotomous keys and morphological descriptions written for field identification | Yes, and they are the only redistributable source that does. Leaf arrangement, margin, venation, stem section, pubescence, inflorescence, fruit type, habitat | Public domain by publication date. archive.org marks `newmanualofbotan00grayuoft` as `NOT_IN_COPYRIGHT` | `_djvu.txt` plain OCR, `_hocr.html`, and PDFs, all fetchable with no key. Identifiers `illustratedflora02brit` and `newmanualofbotan00grayuoft` | **Usable as shipped data.** The cost is OCR repair and nomenclature mapping, not licence. The raw OCR is heavily hyphenated and the 1908 and 1913 names need mapping to the GBIF backbone |
| Biodiversity Heritage Library | Scans and OCR of the same floras and many more | Through the works it hosts | BHL dedicates its **metadata** to the public domain under CC0 1.0. Each scanned work keeps its own copyright status | API v3 with a free key, OAI-PMH, and bulk OCR exports through the BHL Open Data Collection on Figshare | **Usable as shipped data** for pre-1929 works. Use it as the delivery route for the classic floras |
| NC State Extension Plant Toolbox | Roughly 4,700 plants with leaf arrangement, leaf shape, leaf margin, leaf length and width bands, leaf texture, flower colour and inflorescence type, fruit type and colour, bark colour and surface, stem colour, bud description, habit and size | Yes. It has the closest match to this character table of any structured US source | No licence or copyright statement on the site. The footer carries a nondiscrimination notice and a privacy link. The only licence strings in the page HTML are per-image, `CC BY-NC-ND 4.0`. NC State REG 01.25.03 governs ownership internally and grants the public nothing | Server-rendered pages. No API, no bulk download, no terms page | **Reference only.** Text is all rights reserved by default and the photographs are NC and ND. Worth an email to the toolbox editors, because an extension unit may grant permission for an offline field app |
| Flora of North America | The richest morphological descriptions and keys in scope | Yes, and it is the standard | "Copyright is held by the Flora of North America Association for all volumes except Volumes 24 and 25 (Poaceae)." No open licence is granted anywhere reachable. The `/Copyright` page returns 403 to non-browser clients and efloras.org serves a WAF block page to automated requests | None. No download, no API, and the volumes sell in print | **Reference only.** Shipping FNA text or keys needs a negotiated licence |
| Plants For A Future | 7,400 plants with Edibility Rating out of 5, Medicinal Rating, Known Hazards, Edible Parts with preparation prose, habit, height, flowering and seeding months, soil and shade requirements | Weakly. It gives habit, height, bloom colour and time. Its value is the edible and medicinal use data, not identification | The copyright page states "This work by Plants For A Future is licensed under a Creative Commons Attribution 4.0 License," then glosses it as "Share Alike (GNUish/copyleft)." CC BY 4.0 carries no ShareAlike term, so the page contradicts itself. Images are stated as both CC BY-NC-ND 3.0 and CC BY-NC-SA 3.0 in adjacent sentences | Plain server-rendered HTML. The database sells separately: Home Edition 40 USD, Commercial Edition 120 USD | **Usable as shipped data, conditionally.** Resolve the CC BY against Share Alike contradiction in writing with PFAF, or buy the Commercial Edition. Ship no PFAF images |
| Wikipedia article prose and `Speciesbox` | Description, Habitat, and Similar species sections | Yes, in prose. `Speciesbox` itself carries taxonomy, conservation status and a range map, and no morphology | CC BY-SA 4.0 | Full XML dumps and the live API | **Usable as shipped data.** ShareAlike carries into derived text, so the extracted table inherits CC BY-SA and needs page title and revision id per value, the same attribution the fungi table already records |
| Wikidata | Taxonomy and a few morphology statements | No. `P2827` flower color appears on 1,303 items and `P12616` leaf morphology on 22. No property exists for leaf arrangement, phyllotaxis, or leaf margin | CC0 for structured data in the main, property and lexeme namespaces | JSON and RDF dumps, live SPARQL at query.wikidata.org | **Unusable for traits.** The licence is clean and the data is not there. Keep it for name reconciliation |
| GBIF | Occurrences with coordinates and dates, taxonomy, vernacular names, and free-text descriptions harvested from checklists | No. For *Acer rubrum* the description records were mostly range, notes, and conservation. The one real morphological description was in German from Info Flora Schweiz. 9 of 11 description records carried `license: null` | Per publisher. GBIF accepts CC0, CC BY, and CC BY-NC, and the publisher's licence prevails over GBIF's own terms | Open REST API with no key, DwC-A downloads with DOIs, AWS snapshots | **Unusable for traits.** Usable as shipped data for the region and season filters if you keep only CC0 and CC BY publishers and retain per-record attribution |
| iNaturalist | Annotations from a fixed vocabulary (Life Stage, Leaves, Flowers and Fruits, Sex), plus user-created observation fields | No. The annotations record phenology. Observation fields such as "Leaf Margin teeth" exist on a few hundred records and use no controlled vocabulary | Observations default to CC BY-NC. The terms revised 30 October 2024 add: "Users may not use any iNaturalist data for training artificial intelligence, machine learning models, large language models, or similar networks, algorithms, or systems for commercial purposes." The taxonomy DwC-A `eml.xml` states "Taxonomic information should not represent creative work and thus may not be subject to intellectual property restrictions in many jurisdictions" | Taxonomy DwC-A download, a GBIF-format observation export, an AWS Open Data image bucket | **Unusable as a trait source.** The taxonomy dump is usable as shipped data for names and vernacular names. The AI-training clause makes the observation images a live risk for any camera model trained for a shipped product |
| TRY Plant Trait Database | The Categorical Traits dataset (Archive ID 3) carries PlantGrowthForm, Succulent, Climber, Parasitic, Aquatic, Epiphyte, LeafType, LeafPhenology, PhotosyntheticPathway, Woodiness, LeafCompoundness, NumberOfLeaflets | Two of them. `leafComplexity` and `leafletCount` come straight out of it, and `growthForm` maps to PlantGrowthForm. Everything else in TRY is SLA, leaf N and P, wood density, seed mass | Categorical Traits states "Rights of use: Public, CC.BY.3.0", DOI 10.17871/TRY.3. Other archive datasets say only "Public" with no licence named | Zipped CSV from the File Archive after free registration. The main TRY v6 database needs a request and approval | **Usable as shipped data** for the Categorical Traits dataset only, with attribution and a citation to Kattge et al. 2011 |
| BIEN | Occurrence, plot, taxonomic and functional trait data for the Americas | No. The trait set is the TRY functional set | The R package is MIT. The data page states citation requirements and names no licence. Contributed datasets keep their own access restrictions | PostgreSQL through the `BIEN` R package | **Reference only.** Wrong trait set and no redistribution grant |
| Encyclopedia of Life TraitBank | Roughly 11M trait records over 1.7M taxa from 50+ providers | No key characters. Life history, habitat, distribution, interactions, some morphometrics | Per record, mixing CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA. "Please note that a single page may be made up of many different data elements, each covered by a different license." Taxon-page overview summaries are CC0 | TraitBank download per attribute with a login. The public API returned HTTP 500 during checking | **Reference only.** Per-record licence mixing can put an NC or SA record into a shipped bundle unless every record is filtered |

### Recommended build order for plants

No single source carries the 28 characters. Build the plant table in three layers.

1. **Spine.** USDA PLANTS by symbol, which gives the species list for North America plus
   `growthForm`, `flowerColor`, `fruitColorMature`, `plantHeight`, bloom period, and the toxicity and
   `Palatable Human` fields. Public domain, so nothing constrains how the pack ships it.
2. **Characters.** Britton and Brown 1913 and Gray 1908 OCR from archive.org, read by
   model-assisted extraction against the 28-character vocabulary. A flora description states leaf
   arrangement, margin, venation, stem section, pubescence, inflorescence, and fruit type in a fixed
   clause order per species, which makes section-scoped prompting workable. Two steps make the OCR
   usable: de-hyphenate across line breaks, then map the 1908 and 1913 names to accepted names
   through the GBIF backbone.
3. **Fill and check.** Wikipedia Description sections under CC BY-SA for species the floras miss or
   describe thinly, and TRY Categorical Traits for `leafComplexity` and `leafletCount`. Every value
   on a species in the dangerous set gets checked by hand against NC State Extension or Flora of
   North America as a reference read, without either text entering the pack.

The licence split matters for the pack format. USDA PLANTS and the archive.org floras carry no
attribution obligation beyond a credit line, while Wikipedia-derived values carry CC BY-SA and pull
the derived table into ShareAlike. Record a per-value source column so the pack can state which
values are public domain and which are CC BY-SA, the same way the fungi table already records the
page title and revision id.

---

# 5. Camera-answerable against user-answered

## Fungi

| Camera judges directly | User acts, then the camera judges | User answers, no photograph helps |
| --- | --- | --- |
| `hymeniumType`, `whichGills`, `gillSpacing`, `gillColorMature`, `capShape`, `capSurfaceTexture`, `universalVeilRemnants`, `capMarginStriation`, `ringType`, `stipeSurface`, `stipeApexAboveRing`, `growthHabit`, `substrate`, `capDiameter`, `hygrophanous` | `volvaType`, `stipeBaseShape`, `rhizomorphs`, `bruisingReaction`, `interiorOnSection`, `latex`, `capStemAttachment` | `sporePrintColorGroup`, `odour`, `fleshTexture`, `trophicMode` |

Fifteen of the 26 fungi characters are answerable from photographs of the specimen as found.
Seven more become answerable after the app tells the user to dig, cut, or rub and photograph again,
which is the same instruction a field guide gives. Four stay with the user, and `sporePrintColorGroup`
is the expensive one because it costs hours. The walk should treat a missing spore print as an
unanswered question rather than blocking, which the existing filter rule in `contracts/pack-format.md`
already supports: a species with no recorded state for a character survives every branch of it.

## Plants

| Camera judges directly | User acts, then the camera judges | User answers, no photograph helps |
| --- | --- | --- |
| `leafArrangement`, `leafComplexity`, `leafletCount`, `leafMargin`, `venationPattern`, `veinTermination`, `leafBaseAttachment`, `stemSurfaceMarking`, `stemHairs`, `armature`, `growthForm`, `inflorescenceType`, `involucralBracts`, `flowerColor`, `flowerSymmetry`, `corollaForm`, `fruitType`, `fruitArrangement`, `fruitSurface`, `fruitColorMature`, `calyxAtFruit`, `habitat`, `plantHeight`, `woodyStemFeatures` | `stemCrossSection`, `rootOnSection`, `sapOnCut`, pith colour within `woodyStemFeatures` | `crushedOdour` |

Plants sit better with a camera than fungi. Twenty-four of 28 characters come from photographs of
the standing plant, and the three cut-and-look characters are the ones that decide the two Apiaceae
pairs. `crushedOdour` is the only character a photograph can never supply, and it is rank 4 for the
dangerous set, so the walk must ask it in words.

## What this implies for the app

Two shot types cover most of the fungi walk: a whole-specimen shot in place with something for scale,
and an underside shot of the cap. The app should ask for both before the first question and reuse them
across characters rather than prompting per character. The cut-and-dig characters justify one extra
prompt: dig the base out whole, slice the specimen top to bottom, photograph the cut face. That single
instruction supplies `volvaType`, `stipeBaseShape`, `interiorOnSection`, and `bruisingReaction`, which
is four of the top seven ranked characters.

For plants the equivalent is three shots: whole plant with the ground visible, one leaf laid flat with
its stem junction in frame, and the flower or fruit close up. The cut-stem and dug-root prompt only
fires when the walk has narrowed to Apiaceae or to a monocot with a bulb.
