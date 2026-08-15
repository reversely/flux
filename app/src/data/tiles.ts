import corpus from './guide-corpus.json';

/**
 * The twelve encyclopedia tiles from PRD 1.3, ordered by Chapter 1 priority.
 * guide-corpus.json is the source of truth (the server's chat agent loads the
 * same file); ids match tile ids on the wire, and chapter is the tile's home
 * chapter in the full-text reference (not shown in the UI).
 */
export interface Tile {
  id: number;
  title: string;
  chapter: number;
}

export const TILES: Tile[] = corpus.tiles;

export function getTile(id: number): Tile | undefined {
  return TILES.find((t) => t.id === id);
}
