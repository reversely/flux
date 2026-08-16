"""Content store: read the pack database and search it.

Serves the pack-format contract (contracts/pack-format.md): chapters,
sections, blocks, and figures by anchor ID, in manual reading order. The
pack file is hash-verified and opens read-only, so full-text search runs
against an in-memory FTS5 index built from the block table at startup.

The store comes from FLUX_CONTENT_DB. When the variable is unset the
server has no pack installed and the content routes answer 503 instead of
serving fabricated records.
"""

import os
import sqlite3
import threading
from pathlib import Path

SEARCH_SNIPPET_TOKENS = 18

# English function words that carry no evidence about which block answers a
# question. Only `search_any` filters on these; the exact search endpoint
# keeps every word the caller typed.
_QUERY_STOPWORDS = frozenset(
    [
        "a",
        "about",
        "after",
        "all",
        "also",
        "and",
        "any",
        "are",
        "because",
        "been",
        "before",
        "being",
        "but",
        "can",
        "could",
        "did",
        "does",
        "doing",
        "down",
        "for",
        "from",
        "had",
        "has",
        "have",
        "her",
        "him",
        "his",
        "how",
        "into",
        "its",
        "just",
        "like",
        "more",
        "most",
        "much",
        "must",
        "not",
        "now",
        "off",
        "once",
        "only",
        "other",
        "our",
        "out",
        "over",
        "she",
        "should",
        "some",
        "such",
        "than",
        "that",
        "the",
        "their",
        "them",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "under",
        "until",
        "very",
        "was",
        "were",
        "what",
        "when",
        "where",
        "which",
        "while",
        "who",
        "whom",
        "why",
        "will",
        "with",
        "without",
        "would",
        "you",
        "your",
    ]
)


class ContentStore:
    """Read-only view over one pack content database."""

    def __init__(self, db_path: Path) -> None:
        # Pack-relative asset paths (figure images) resolve against the
        # directory that holds the content database.
        self.pack_root = db_path.parent
        self._conn = sqlite3.connect(
            f"file:{db_path}?mode=ro", uri=True, check_same_thread=False
        )
        self._conn.row_factory = sqlite3.Row
        # FastAPI runs sync routes in a threadpool; one connection serves
        # them all, serialized here.
        self._lock = threading.Lock()
        self._build_search_index()

    def _build_search_index(self) -> None:
        self._conn.execute("ATTACH DATABASE ':memory:' AS search")
        # Two indexes over the same blocks. Porter stemming serves the exact
        # search endpoint: it folds inflections ("berries" finds "berry")
        # and still matches one- and two-letter terms ("ax"). Chat retrieval
        # needs more: the manual writes berries as Blackberries, Chinaberry,
        # pokeberries, which no word-level stemmer reaches, so a plural
        # question missed every berry block and chat answered "the guide
        # does not cover". The trigram index matches inside those compounds
        # and bm25's rarity weighting ranks the right chapter first.
        self._conn.execute(
            "CREATE VIRTUAL TABLE search.block_fts USING"
            " fts5(id UNINDEXED, text, tokenize = 'porter unicode61')"
        )
        self._conn.execute(
            "INSERT INTO search.block_fts (id, text) SELECT id, text FROM block"
        )
        self._conn.execute(
            "CREATE VIRTUAL TABLE search.block_trigram USING"
            " fts5(id UNINDEXED, text, tokenize = 'trigram')"
        )
        self._conn.execute(
            "INSERT INTO search.block_trigram (id, text) SELECT id, text FROM block"
        )

    def _rows(self, query: str, params: tuple = ()) -> list[dict]:
        with self._lock:
            return [dict(row) for row in self._conn.execute(query, params)]

    def _row(self, query: str, params: tuple) -> dict | None:
        rows = self._rows(query, params)
        return rows[0] if rows else None

    def chapters(self) -> list[dict]:
        return self._rows(
            "SELECT id, tile_id, fm_number, title, priority_order"
            " FROM chapter ORDER BY priority_order"
        )

    def chapter(self, chapter_id: str) -> dict | None:
        chapter = self._row(
            "SELECT id, tile_id, fm_number, title, priority_order"
            " FROM chapter WHERE id = ?",
            (chapter_id,),
        )
        if chapter is None:
            return None
        chapter["sections"] = self._rows(
            'SELECT id, title, "order" FROM section'
            ' WHERE chapter_id = ? ORDER BY "order"',
            (chapter_id,),
        )
        return chapter

    def section(self, section_id: str) -> dict | None:
        section = self._row(
            'SELECT id, chapter_id, fm_heading, title, "order"'
            " FROM section WHERE id = ?",
            (section_id,),
        )
        if section is None:
            return None
        section["blocks"] = self._rows(
            'SELECT id, "order", type, text, figure_ref, source, review_status'
            ' FROM block WHERE section_id = ? ORDER BY "order"',
            (section_id,),
        )
        return section

    def block(self, block_id: str) -> dict | None:
        return self._row(
            'SELECT id, section_id, "order", type, text, figure_ref,'
            " source, review_status FROM block WHERE id = ?",
            (block_id,),
        )

    def figure(self, figure_id: str) -> dict | None:
        # attribution arrived with #144; a pack built before it has no such
        # column, and the non-breaking rule keeps old packs readable.
        try:
            return self._row(
                "SELECT id, block_id, fm_figure_ref, image_path, source_manual,"
                " license, attribution FROM figure WHERE id = ?",
                (figure_id,),
            )
        except sqlite3.OperationalError:
            return self._row(
                "SELECT id, block_id, fm_figure_ref, image_path, source_manual,"
                " license FROM figure WHERE id = ?",
                (figure_id,),
            )

    def search(self, query: str, limit: int) -> list[dict]:
        # Quote each term so FTS5 operators in user input read as words,
        # not query syntax; terms combine with FTS5's implicit AND.
        terms = " ".join('"{}"'.format(term.replace('"', "")) for term in query.split())
        return self._search_match(terms, limit)

    def search_any(self, query: str, limit: int) -> list[dict]:
        """OR-match for chat retrieval: a natural-language question rarely
        has every word in one block, so any informative term may hit and
        FTS5 rank orders the results. Function words drop out before the
        query: with "with" or "which" included, any block of prose matches
        and the ranked hits drift to unrelated chapters."""
        words = (term.strip(".,!?;:'\"()").lower() for term in query.split())
        terms = " OR ".join(
            '"{}"'.format(word.replace('"', ""))
            for word in words
            if len(word) >= 3 and word not in _QUERY_STOPWORDS
        )
        return self._search_match(terms, limit, table="block_trigram")

    def _search_match(
        self, terms: str, limit: int, table: str = "block_fts"
    ) -> list[dict]:
        if not terms:
            return []
        return self._rows(
            f"SELECT {table}.id AS block_id, block.section_id,"
            " section.chapter_id,"
            f" snippet({table}, 1, '[', ']', '…', ?) AS snippet"
            f" FROM search.{table}"
            f" JOIN block ON block.id = {table}.id"
            " JOIN section ON section.id = block.section_id"
            f" WHERE {table} MATCH ? ORDER BY rank LIMIT ?",
            (SEARCH_SNIPPET_TOKENS, terms, limit),
        )


def content_store_from_env() -> ContentStore | None:
    """Open the pack named by FLUX_CONTENT_DB; unset means no pack installed."""
    db_path = os.environ.get("FLUX_CONTENT_DB")
    if db_path:
        return ContentStore(Path(db_path))
    return None
