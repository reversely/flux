import { referencePdf } from './reference.generated';

/**
 * First page of each chapter in the bundled FM 21-76 PDF, extracted from the
 * scan's own headings (chapter 1's heading page resists text extraction, so
 * its entry is the page after the contents). Regenerate if the PDF changes.
 */
const CHAPTER_PAGES: Record<number, number> = {
  1: 5,
  2: 8,
  3: 14,
  4: 16,
  5: 38,
  6: 53,
  7: 63,
  8: 72,
  9: 99,
  10: 109,
  11: 112,
  12: 120,
  13: 131,
  14: 139,
  15: 146,
  16: 162,
  17: 185,
  18: 194,
  19: 200,
  20: 209,
  21: 215,
  22: 219,
  23: 221,
};

import corpus from './guide-corpus.json';

export const REFERENCE_TITLE = corpus.reference.title;

export { referencePdf };

export function chapterPage(chapter: number): number | undefined {
  return CHAPTER_PAGES[chapter];
}
