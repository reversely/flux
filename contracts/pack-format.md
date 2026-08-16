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
| license | TEXT | License of the image, `public-domain` for US Army manuals. |

## Walkthrough tables

`uv run flux-pipeline walkthrough <mycomorphbox.tsv> <content.db>` writes four `walk_` tables
into the pack database from the mycomorphbox trait extraction. The fungi edibility walkthrough
reads them: the server asks the questions in `ask_order`, the user answers with a state, and the
candidate set narrows by the filter rule below. Rebuilding drops and recreates the four tables
and leaves every other table alone.

### The filter rule

A species survives an answered question when it either records a matching state for that
character in `walk_trait` or records no state for that character at all. A species with no row
for a character stays in every branch of that question, so missing data can never eliminate a
species; only a confirmed answer that contradicts a recorded state can. The server computes the
danger subset of the surviving candidates (`edibility = 'danger'`) at every step and shows it
before any verdict.

### Table: walk_question

One row per observable character, in the order a guide examines a specimen.

| column | type | notes |
| --- | --- | --- |
| character | TEXT, primary key | The mycomorphbox parameter name, such as `sporePrintColor`. |
| ask_order | INTEGER, unique | Position in the walk, 1 upward. |
| question | TEXT | The question the app shows, field-guide minimal. |
| citation | TEXT | Source of the character definition. |

### Table: walk_state

One row per answer state observed in the data for a character. The app offers these states as
the answer choices.

| column | type | notes |
| --- | --- | --- |
| character | TEXT, references walk_question(character) | Owning question. |
| state | TEXT | Canonical lowercase state, such as `ring and volva`. |

### Table: walk_species

One row per species page in the trait extraction.

| column | type | notes |
| --- | --- | --- |
| species | TEXT, primary key | The Wikipedia page title; genus and group pages appear as themselves. |
| edibility | TEXT | One of `edible`, `inedible`, `caution`, `danger`, `unknown`; the worst raw value wins when the source records two. |
| edibility_raw | TEXT | The raw template values joined with `\|`, such as `choice\|poisonous`. |
| source_title | TEXT | Wikipedia page title for CC BY-SA attribution. |
| source_revid | TEXT | Wikipedia revision id the traits were read from. |

### Table: walk_trait

One row per state a species records for a character. A species missing a character has no row
for it, which the filter rule treats as compatible with every answer.

| column | type | notes |
| --- | --- | --- |
| species | TEXT, references walk_species(species) | The species. |
| character | TEXT, references walk_question(character) | The character. |
| state | TEXT | A canonical state; the template's primary and secondary values each produce a row. |
