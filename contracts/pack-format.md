# Pack content database

The pipeline parses FM 21-76 into one SQLite file, `content.db`. The server reads this file to
answer content and retrieval requests. `uv run flux-pipeline parse <pdf> <out.db>` builds it and
prints row counts per table and per block type. This document defines the schema the build writes,
so the server codes against it without reading the pipeline source.

## Conventions

- An **anchor ID** names a record with a string derived from FM numbering, so the same record keeps
  the same ID across pack versions built from the same manual. Every `id` column holds an anchor ID.
- A **block** holds one unit of manual text: a paragraph, a bullet list, a warning, or a note.
- Column order in each table below matches the column order in the database.
- The `order` columns count from 1 within their parent, except the introduction section, which
  takes order 0. Rows read in `order` sequence reproduce the manual's reading order.
- A NULL column states that the source defines no value for that row; each NULL case is named in
  the column notes below.

## Anchor ID derivation

- Chapter: `fm21-76-ch{NN}`, from the chapter number. Example: `fm21-76-ch04`.
- Section: the chapter ID plus a slug of the printed heading. Example:
  `fm21-76-ch04-lifesaving-steps`. Text before a chapter's first heading forms an introduction
  section with the slug `intro`. A heading repeated inside one chapter takes an ordinal suffix:
  `fm21-76-ch15-shelters-2`.
- Block: the section ID plus a per-section counter. Example: `fm21-76-ch04-lifesaving-steps-b016`.
- Figure: `fm21-76-fig-{ref}`, from the FM figure number. Example: `fm21-76-fig-4-2`.

## Table: chapter

One row per manual chapter, 23 rows for the abridged edition.

| column | type | notes |
| --- | --- | --- |
| id | TEXT, primary key | Chapter anchor ID. |
| tile_id | INTEGER, nullable | Encyclopedia tile number 1 to 12 per the PRD 1.3 tile table. NULL for chapters 1 to 3, which frame the app, and for chapters 20 to 22, which archive. |
| fm_number | INTEGER, unique | The chapter number as printed. |
| title | TEXT | The chapter title as printed, in capitals. |
| priority_order | INTEGER | Chapter ordering for priority ranking; equals `fm_number`, since the manual orders chapters by survival priority. |

## Table: section

One row per all-caps section heading, plus one introduction section per chapter that opens with
text before its first heading.

| column | type | notes |
| --- | --- | --- |
| id | TEXT, primary key | Section anchor ID. |
| chapter_id | TEXT, references chapter(id) | Owning chapter. |
| fm_heading | TEXT, nullable | The heading as printed, in capitals. NULL for an introduction section. |
| title | TEXT | The heading in title case; `Introduction` for an introduction section. |
| order | INTEGER | Position within the chapter; 0 for the introduction section, then 1 upward. |

## Table: block

One row per text unit, in reading order within its section.

| column | type | notes |
| --- | --- | --- |
| id | TEXT, primary key | Block anchor ID. |
| section_id | TEXT, references section(id) | Owning section. |
| order | INTEGER | Position within the section, from 1. |
| type | TEXT, checked | One of the nine block types below. |
| text | TEXT | The block text. A procedure or mnemonic block opens with its printed method name on the first line, then a newline, then the body. A checklist or materials block holds one bullet item per line, each starting with `•`. |
| figure_ref | TEXT, nullable | FM figure numbers the text cites, comma separated in order of first mention, such as `4-2` or `8-6,8-7`. NULL when the block cites no figure. |
| source | TEXT | The source manual, `FM 21-76` for every row this build writes. |
| review_status | TEXT, checked | `auto`, `needs_review`, or `edited`; see the review states section. |

### Block types

A CHECK constraint restricts `type` to these nine values.

| type | content |
| --- | --- |
| principle | A paragraph outside any procedure: selection criteria, background, or guidance. |
| checklist | A bullet list. |
| procedure_step | A paragraph under a bold method name; the first such block carries the name on its first line. |
| materials | A bullet list whose lead-in paragraph names materials and ends with a colon or dash. |
| warning | The paragraph under a printed `WARNING` or `CAUTION` line. |
| note | A paragraph opening with `Note:`. |
| reference | A short cross reference opening with `See` or `Refer to`. |
| mnemonic | A paragraph under a letter heading of the SURVIVAL keyword, such as `S -Size Up the Situation`. |
| military_archive | Any block in chapters 20 to 22. The archive tag replaces the content type for these chapters, per PRD 1.3. |

### Review states

A CHECK constraint restricts `review_status` to three values.

- `auto`: the parser accepted the block without conditions, or an editor approved a flagged
  block as printed (figurative military language carries no transfer).
- `needs_review`: an editor must confirm civilian transfer before the block publishes (PRD 8.1).
  Every block in chapters 20 to 22 takes this state, and so does any block elsewhere containing a
  sentence with a military term such as enemy, combat, camouflage, evasion, or weapon.
- `edited`: an editor rewrote the block for civilian transfer, so its text no longer matches the
  source manual verbatim. The replacement text lives in the pipeline's committed edits file
  (`pipeline/edits/civilian_edits.json`), which the parse build applies; a block a purely military
  clause could not transfer is dropped there rather than rewritten.

## Table: figure

One row per distinct FM figure number cited in block text. The parser records the citation; pack
assembly attaches the image.

| column | type | notes |
| --- | --- | --- |
| id | TEXT, primary key | Figure anchor ID. |
| block_id | TEXT, references block(id) | The first block that cites the figure. |
| fm_figure_ref | TEXT | The FM figure number, such as `4-2`. |
| image_path | TEXT, nullable | Pack-relative path to the image file. NULL until pack assembly attaches one. |
| source_manual | TEXT | The manual the image comes from; `FM 21-76` until a clearer printing substitutes a figure (PRD 4.1). |
| license | TEXT | License of the attached image file, `public-domain` for US Army manuals. Commons-harvested imagery is largely CC BY-SA or GFDL, so the value is per file, never per manual. |
| attribution | TEXT, nullable | Source URL and author for the attached image file, in the app's attribution-line form (`source-url, author`). NULL until pack assembly attaches an image; packs built before this column omit it, and the server reads both. |

## Guide tables

One node format serves both guide kinds (#65). An identification guide's answers eliminate
candidates by the filter rule below; a process guide's answers advance an ordered node
sequence. Many guides coexist in one pack; each compiler rebuilds only its own guide's rows.

`uv run flux-pipeline walkthrough <mycomorphbox.tsv> <content.db>` compiles the fungi
edibility identification guide (`guide_id` `fungi-edibility`) from the mycomorphbox trait
extraction. `uv run flux-pipeline guide <guide.json> <content.db>` compiles an authored
guide source of either kind; `pipeline/data/guides/bowline.json` is the first process guide.

A pre-#65 pack has these tables without `guide_id` and carries exactly the mushroom walk;
the server detects the column and reads both vintages identically.

### Table: guide

One row per guide in the pack.

| column | type | notes |
| --- | --- | --- |
| id | TEXT, primary key | Guide id, such as `fungi-edibility` or `knot-bowline`. |
| kind | TEXT | `identification` or `process`. |
| title | TEXT | Display title. |
| tile_id | INTEGER, nullable | Encyclopedia tile that owns the guide. |
| source | TEXT | Attribution line for the guide's source. |

### The filter rule (identification guides)

A species survives an answered question when it either records a matching state for that
character in `walk_trait` or records no state for that character at all. A species with no row
for a character stays in every branch of that question, so missing data can never eliminate a
species; only a confirmed answer that contradicts a recorded state can. The server computes the
danger subset of the surviving candidates (`edibility = 'danger'`) at every step and shows it
before any verdict.

### Table: walk_question

One row per node. For an identification guide a node is an observable character; for a
process guide it is a step. Columns beyond `citation` are #65 additions: nullable unless
stated, and an existing row without them keeps its meaning.

| column | type | notes |
| --- | --- | --- |
| guide_id | TEXT, references guide(id) | Owning guide. Defaults to `fungi-edibility`. |
| character | TEXT | Node id within the guide. Primary key with guide_id. |
| ask_order | INTEGER | Position in the walk, 1 upward, unique per guide. |
| question | TEXT | The question the app shows, field-guide minimal. |
| citation | TEXT | Free-text source attribution (pre-#65 field, unchanged). |
| screen | TEXT, nullable | Screen fragment for the overlay; a stressed user scans it. |
| voice | TEXT, nullable | Narration line; carries the reason behind any glossed term. |
| block_id | TEXT, nullable | `block` row that grounds the node. |
| figure_id | TEXT, nullable | `figure` row that grounds the node. |
| anchor | TEXT, nullable | Deep-link fragment into the cited source (page, section, record). |
| answer_source | TEXT | `user`, `camera`, or `both`. Defaults to `user`. |
| capture_condition | TEXT, nullable | Authored statement of when the frame plausibly holds the evidence. NULL means user-answered: a node without one can never cause a capture. |
| evidence_kind | TEXT, nullable | `frame` or `clip`; NULL on user-answered nodes. |
| reference_image | TEXT, nullable | Pack-relative image shown beside the live feed. |

The compiler refuses a `camera` or `both` node without a `capture_condition`, so an
unmigrated or under-authored row degrades to user-answered rather than over-capturing.

### Table: walk_state

One row per acceptable answer per node: trait states for identification, `done` /
`not yet` / `unsure` for process. These states are the tappable options the overlay
renders, so no node depends on voice.

| column | type | notes |
| --- | --- | --- |
| guide_id | TEXT | Owning guide. Defaults to `fungi-edibility`. |
| character | TEXT | Owning node. |
| state | TEXT | Canonical lowercase state. |
| implication | TEXT, nullable | For an end state, the consequence the user acts on ("this will hold under load"); the step or taxon reached is evidence under it. |

### Table: walk_species

One row per species page in an identification guide's trait extraction.

| column | type | notes |
| --- | --- | --- |
| guide_id | TEXT | Owning guide. Defaults to `fungi-edibility`. |
| species | TEXT | The Wikipedia page title; genus and group pages appear as themselves. Primary key with guide_id. |
| edibility | TEXT | One of `edible`, `inedible`, `caution`, `danger`, `unknown`; the worst raw value wins when the source records two. |
| edibility_raw | TEXT | The raw template values joined with `\|`, such as `choice\|poisonous`. |
| source_title | TEXT | Wikipedia page title for CC BY-SA attribution. |
| source_revid | TEXT | Wikipedia revision id the traits were read from. |
| implication | TEXT, nullable | The consequence carried by an end state naming this species. |

### Table: walk_trait

One row per state a species records for a character. A species missing a character has no row
for it, which the filter rule treats as compatible with every answer.

| column | type | notes |
| --- | --- | --- |
| guide_id | TEXT | Owning guide. Defaults to `fungi-edibility`. |
| species | TEXT | The species. |
| character | TEXT, references walk_question(character) | The character. |
| state | TEXT | A canonical state; the template's primary and secondary values each produce a row. |

## Natural-feature layer

A separate SQLite file, `features.db`, beside the content database. It answers
"how far am I from water" (#223) offline: the app scans a latitude and
longitude window around the GPS fix and takes the nearest sampled point. The
build is `flux-pipeline features <region.osm.pbf> <features.db>` (#222) from
the region's OSM extract.

Geometry is sampled, not carried: a water outline keeps vertices at least
100 m apart, a linear waterway at least 250 m apart, so a nearest-vertex scan
approximates nearest-feature distance at walking scale (worst-case ~125 m on
a waterway). A spring is one point. Waterways tagged `intermittent=yes` are
excluded: a seasonal streambed is a wrong "nearest water" answer for most of
the year.

The layer carries inland water. OSM models the sea as `natural=coastline`,
which this build does not read, so marine shoreline joins as its own class
later rather than silently standing in for fresh water.

The source is ODbL-licensed OpenStreetMap data. The `meta` table carries the
attribution a consumer must display beside results.

### Table: meta

| column | type | notes |
| --- | --- | --- |
| key | TEXT | Primary key. `license` (`ODbL-1.0`), `attribution` (`© OpenStreetMap contributors`), `source` (the extract URL or filename). |
| value | TEXT | |

### Table: feature

One row per extracted feature.

| column | type | notes |
| --- | --- | --- |
| id | INTEGER | Primary key. |
| osm_id | TEXT | `node/<id>`, `way/<id>`, or `relation/<id>` in the source extract. |
| class | TEXT | One of `water` (lakes and ponds, from `natural=water` areas), `river`, `stream`, `canal` (linear waterways), `spring`. The set is open: later classes (peaks, shelters) add rows, never repurpose these. |
| name | TEXT, nullable | The OSM name when tagged. |

### Table: feature_point

Sampled geometry, one row per kept vertex, indexed on `lat`. Coordinates are
integer microdegrees (WGS84 degrees times 1,000,000, ~11 cm resolution),
which keeps 1.9M Washington points phone-sized where REAL storage measured
123 MB.

| column | type | notes |
| --- | --- | --- |
| feature_id | INTEGER, references feature(id) | Owning feature. |
| lat | INTEGER | Microdegrees. |
| lon | INTEGER | Microdegrees. |
