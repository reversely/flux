import corpus from '../guide-corpus.json';
import type { TileGuide } from '../guide';

const GUIDES = corpus.guides as TileGuide[];

export function getGuide(tileId: number): TileGuide | undefined {
  return GUIDES.find((g) => g.tileId === tileId);
}
