# Library holdings: shape and consumer of each fetched source

Every document and dataset fetched for the local library, the measured shape of its bytes, and the
code that consumes it. The fetch manifests are `box/data/universal.tsv` and
`box/data/regions/washington.tsv`; each holding below names its manifest row, and the row's name
doubles as its directory under the box data root. Shapes were measured on the fetched files on
2026-08-16, so a page count or word count here describes the copy we hold rather than a catalog
entry.

A holding reaches the user through one of three consumers. `flux-pipeline parse` turns manual text
into pack blocks. A library ingest (#162 for carrying sources in the pack, #163 for retrieval over
them in chat) chunks book text into pack blocks with a source and licence per block, which the
server's FTS index at `/v1/content/search` already covers. The weather aggregation (#165 carries
the monthly baseline into the pack) turns daily station records into per-month base rates for the
weather VSS session.

## The manual family

| row | work | pages | text | consumer |
| --- | --- | --- | --- | --- |
| universal/fm21-76-full | FM 21-76 Survival, June 1992, Commons scan | 646 | embedded layer, 110,300 words | flux-pipeline parse; pdftoppm figure crops (#137) |
| universal/fm-5-125 | FM 5-125 Rigging Techniques | 169 | embedded layer | knot and lashing step figures, replacing the wikiHow CC BY-NC-SA photos |

The 646-page scan carries the appendices the 233-page reprint in the repo root lacks. Verified in
the extracted text: Appendix B's edible-plant entries (Cattail, Sassafras), Appendix E's snake
entries (Cottonmouth), and Appendix G's cloud terms. Reparsing from this copy widens the Food tile
by roughly 111 species entries and gives the weather session its manual anchor. Both manuals are
US Army works in the public domain.

## The fungi shelf

| row | work | shape | text quality |
| --- | --- | --- | --- |
| universal/fungi-marshall-1901 | Marshall, The Mushroom Book, 1901 | 342-page PDF, 11 MB | companion OCR row below |
| universal/fungi-marshall-1901-ocr | Archive.org DjVu text of the same scan | 42,657 words | readable OCR, occasional scan noise |
| universal/fungi-atkinson-1900 | Atkinson, Studies of American Fungi, 1900 | Gutenberg HTML zip, 497 files | clean proofread HTML |
| universal/fungi-hard-1908 | Hard, The Mushroom Edible and Otherwise, 1908 | Gutenberg HTML zip | clean proofread HTML |
| universal/fungi-mcilvaine-1902 | McIlvaine, One Thousand American Fungi, 1902 | 910-page PDF | embedded OCR, readable |
| universal/fungi-usda-bulletin-175 | USDA Bulletin 175, Mushrooms and Other Common Fungi | 108-page PDF | embedded OCR |
| universal/fungi-usfs-gtr-nrs79 | USFS GTR-NRS-79, Field Guide to Common Macrofungi | 90-page PDF | born-digital text |
| universal/fungi-mycomorphbox | Wikipedia Mycomorphbox trait table | 1,791-row TSV | structured |

The five books published before 1930 sit in the public domain; the two federal publications are
US Government works; the trait table carries CC BY-SA with per-article revision ids for
attribution. The trait table already builds the walk. The six books feed the library ingest, and
each book's species chapters anchor to `walk_species` names so the walk's closing step can link
the surviving candidates to the page that describes them.

## The protocol shelf

| row | work | pages | licence | tile |
| --- | --- | --- | --- | --- |
| universal/who-basic-emergency-care | WHO Basic Emergency Care participant workbook, 2018 | 240 | CC BY-NC-SA 3.0 IGO | 1 Survival Medicine |
| universal/hazards-nwss-ornl5037 | Kearny, Nuclear War Survival Skills, ORNL-5037, 1979 DTIC scan | 232 | US Government work | 12 Man-Made Hazards |
| universal/hazards-fema-are-you-ready | FEMA, Are You Ready?, circa-2004 edition | 204 | US Government work | 12 Man-Made Hazards, kit checklists |

The two scans carry companion `-ocr` rows holding the Archive.org DjVu text. The ORNL scan's OCR
runs noisy (it renders ORNL as ORKL), so quotations from it need a check against the page image.
The WHO row fetches through the IRIS DSpace bitstream endpoint because the handle URL now serves
the site's JavaScript shell; the FEMA row fetches from an Archive.org mirror because ready.gov
returns 403 to the box. WHO's NonCommercial term is satisfied by the project's non-profit posture
(see `coverage.md`).

## The tile shelves

One shelf per encyclopedia tile beyond the fungi and hazard shelves above, fetched 2026-08-16.
Page counts are measured with pdfinfo on the fetched files. Licence basis: `PD-date` means
published before 1930, `US-Gov` means a US Government work, `CC` names the licence. Rows whose
scan carries a separate Archive.org OCR text have a companion `-ocr` row in the manifest, not
repeated here. The two Gutenberg-hosted shelves ship as proofread HTML zips with images
(`-h.zip`), which need no OCR companion.

| row | work | pages | basis | tile |
| --- | --- | --- | --- | --- |
| universal/fm-4-25-11-first-aid | FM 4-25.11 First Aid (2002) | 227 | US-Gov | 1 |
| universal/red-cross-first-aid-1917 | Lynch, American Red Cross Abridged Textbook on First Aid (1917) | 168 | PD-date | 1 |
| universal/who-prehospital-pocket-reference | WHO, Prehospital emergency care pocket reference (2026) | 22 | CC BY-NC-SA 3.0 IGO | 1 |
| universal/poisonous-snakes-of-the-world | US Navy, Poisonous Snakes of the World (NAVMED P-5099, 1968 printing) | 228 | US-Gov | 7 |
| universal/ditmars-reptile-book | Ditmars, The Reptile Book (1907) | 662 | PD-date | 7 |
| universal/crotaline-snakebite-algorithm | Lavonas et al., unified crotaline snakebite algorithm (BMC Emerg Med 2011) | 16 | CC BY 2.0 | 7 |
| universal/kephart-camping-and-woodcraft | Kephart, Camping and Woodcraft vol. 1 (1916 ed.) | 416 | PD-date | 2, 3 |
| universal/beard-shelters-shacks-and-shanties | Beard, Shelters, Shacks and Shanties (1914), Gutenberg HTML | 327 files | PD-date | 2 |
| universal/nessmuk-woodcraft | Nessmuk, Woodcraft (1884), Gutenberg HTML | 2 files | PD-date | 2 |
| universal/beard-camp-lore-and-woodcraft | Beard, The Book of Camp-Lore and Woodcraft (1920), Gutenberg HTML | 70 files | PD-date | 3 |
| universal/boy-scouts-handbook-1911 | Boy Scouts Handbook, 1st ed. (1911), Gutenberg HTML | 364 files | PD-date | 3, 8 |
| universal/hasluck-knotting-and-splicing | Hasluck, Knotting and Splicing Ropes and Cordage (1907), Gutenberg HTML | 205 files | PD-date | 8 |
| universal/verrill-knots-splices-and-rope-work | Verrill, Knots, Splices and Rope Work (1912), Gutenberg HTML | 150 files | PD-date | 8 |
| universal/tc-3-97-61-military-mountaineering | TC 3-97.61 Military Mountaineering (2025) | 33.6 MB | US-Gov | 8 |
| universal/epa-emergency-disinfection | EPA, Emergency Disinfection of Drinking Water (2017) | 2 | US-Gov | 4 |
| universal/tb-med-577-field-water | TB MED 577 / NAVMED P-5010-10, field water supplies (2010) | 200 | US-Gov | 4 |
| universal/sturtevant-edible-plants | Sturtevant's Notes on Edible Plants (Hedrick ed., 1919) | 704 | PD-date | 5 |
| universal/yanovsky-food-plants | Yanovsky, Food Plants of the North American Indians (USDA 1936) | 90 | US-Gov | 5 |
| universal/harding-deadfalls-snares | Harding, Deadfalls and Snares (1907), Gutenberg HTML | 3.1 MB | PD-date | 5 |
| universal/chesnut-poisonous-plants | Chesnut, Principal Poisonous Plants of the United States (USDA 1898) | 72 | US-Gov | 6 |
| universal/pammel-poisonous-plants | Pammel, A Manual of Poisonous Plants (1911) | 1058 | PD-date | 6 |
| universal/britton-brown-flora-v1 to -v3 | Britton and Brown, Illustrated Flora of the Northern United States, 2nd ed. (1913) | 720, 748, 654 | PD-date | 5, 6 |
| universal/bowditch-navigator-v1-2019 | Bowditch, American Practical Navigator vol. 1 (NGA Pub 9, 2019) | 744 | US-Gov | 9 |
| universal/fm-3-25-26-land-navigation | FM 3-25.26 Map Reading and Land Navigation (2001) | 209 | US-Gov | 9 |
| universal/faa-aim | FAA Aeronautical Information Manual | 732 | US-Gov | 10 |
| universal/international-code-of-signals | International Code of Signals (NGA Pub 102) | 159 | US-Gov | 10 |
| universal/fm-21-60-visual-signals | FM 21-60 Visual Signals (1987) | 72 | US-Gov | 10 |
| universal/afr-64-4-survival-training | AFR 64-4 Survival Training vol. 1 (USAF 1985) | 582 | US-Gov | 11 |
| universal/tm-1-240-arctic-manual | TM 1-240 Arctic Manual (War Dept 1942) | 98 | US-Gov | 11 |
| universal/afoot-in-the-desert | Afoot in the Desert (USAF ADTIC 1956) | 63 | US-Gov | 11 |
| universal/faa-phak-ch12-weather | FAA Pilot's Handbook ch. 12 Weather Theory (2023 ed.) | 26 | US-Gov | 11, weather |
| universal/faa-aviation-weather-handbook | FAA Aviation Weather Handbook (FAA-H-8083-28A) | 539 | US-Gov | weather |
| universal/cloud-studies-clayden-1905 | Clayden, Cloud Studies (1905) | 334 | PD-date | weather |

The two NGA rows download through `msi.nga.mil/api/publications/download`, whose basename is not
the filename; the fetched files are renamed on the box to `Bowditch_Vol_1_LoRes_2019.pdf` and
`Pub102bk.pdf` and the rows carry hand-touched `.done` markers.

## Regional floras and the berry walk

| row | work | pages | basis |
| --- | --- | --- | --- |
| regions/washington/flora-piper-1906 | Piper, Flora of the State of Washington (1906) | 694 | US-Gov, PD-date |
| regions/washington/flora-nw-coast-1915 | Piper and Beattie, Flora of the Northwest Coast (1915) | 444 | PD-date |

These two floras supply the trait descriptions behind `pipeline/data/walks/berries.tsv`: 152
Washington species chosen from the GBIF checklist (every fleshy-fruited genus with at least 250
occurrences, plus every species of the dangerous genera at 25), one row per species, each trait
and verdict cell transcribed from a named page of the floras, Chesnut, Pammel, Sturtevant,
Yanovsky, or FM 21-76 Appendix B. `flux-pipeline walkthrough pipeline/data/walks/berries.tsv
<pack> --spec pipeline/data/walks/berry.json` compiles it into the pack's walk tables; the
compiled demo pack carries 152 species with 26 on the danger tier. Verdict rules: a danger tier
requires a toxicity statement in a named source, an edible tier requires an edibility statement,
and a species with neither ships as unknown, so 57 of the 152 read unknown rather than guessed.

## Weather history

Five GHCN-Daily station files, one CSV row per day per station, from
`ncei.noaa.gov/data/global-historical-climatology-network-daily/access/`. Public-domain US
Government data.

| row | station | id | daily rows | range |
| --- | --- | --- | --- | --- |
| regions/washington/ghcn-daily/seatac | Seattle-Tacoma Airport | USW00024233 | 28,713 | 1948 to present |
| regions/washington/ghcn-daily/spokane | Spokane International Airport | USW00024157 | 50,039 | 1889 to present |
| regions/washington/ghcn-daily/olympia | Olympia Airport | USW00024227 | 31,137 | 1941 to present |
| regions/washington/ghcn-daily/quillayute | Quillayute Airport | USW00094240 | 21,915 | 1966 to present |
| regions/washington/ghcn-daily/yakima | Yakima Airport | USW00024243 | 29,195 | 1946 to present |

Core columns: PRCP, SNOW, SNWD, TMAX, TMIN, plus AWND and the WT01-WT22 weather-type flags on
airport stations. Values use GHCN units: tenths of a degree Celsius and tenths of a millimetre,
each with a paired `_ATTRIBUTES` quality column. The aggregation reduces each station to
per-calendar-month wet-day counts, temperature normals, and record extremes, which extends the
12-station monthly file at `app/assets/guides/climate-normals.json` and lets the weather session
answer with a dated base rate ("Seattle Augusts since 1948 average N wet days") that chat can cite
by station and period.
