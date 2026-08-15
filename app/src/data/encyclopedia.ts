import type { ComponentProps } from 'react';
import type { Feather } from '@expo/vector-icons';

import type { ApiClient } from '@/api/client';
import type { ChapterDetail, ChapterSummary, SectionDetail } from '@/api/types';

type FeatherName = ComponentProps<typeof Feather>['name'];

/** The PRD 1.3 tile table: twelve tiles in Chapter 1 priority order. */
export interface EncyclopediaTile {
  id: number;
  title: string;
  scope: string;
  chapters: number[];
  icon: FeatherName;
}

export const TILES: EncyclopediaTile[] = [
  {
    id: 1,
    title: 'Survival Medicine',
    scope: 'Lifesaving steps, injuries, bites and stings, wounds',
    chapters: [4],
    icon: 'heart',
  },
  {
    id: 2,
    title: 'Shelter',
    scope: 'Site selection and shelter builds',
    chapters: [5],
    icon: 'home',
  },
  {
    id: 3,
    title: 'Fire',
    scope: 'Site preparation, materials, fire lays, ignition',
    chapters: [7],
    icon: 'zap',
  },
  {
    id: 4,
    title: 'Water',
    scope: 'Sources, stills, purification, filtration, crossings',
    chapters: [6, 17],
    icon: 'droplet',
  },
  {
    id: 5,
    title: 'Food',
    scope: 'Traps, snares, fishing, game preparation, edible plants',
    chapters: [8, 9],
    icon: 'target',
  },
  {
    id: 6,
    title: 'Poisonous Plants',
    scope: 'Poisoning routes, avoidance rules, deadly lookalikes',
    chapters: [10],
    icon: 'alert-octagon',
  },
  {
    id: 7,
    title: 'Dangerous Animals',
    scope: 'Insects, arachnids, snakes, aquatic dangers',
    chapters: [11],
    icon: 'alert-triangle',
  },
  {
    id: 8,
    title: 'Tools & Cordage',
    scope: 'Lashing, cordage, knots, improvised tools',
    chapters: [12],
    icon: 'tool',
  },
  {
    id: 9,
    title: 'Direction Finding',
    scope: 'Celestial methods, improvised compass, offline map',
    chapters: [18],
    icon: 'compass',
  },
  {
    id: 10,
    title: 'Signaling & Rescue',
    scope: 'Signals, codes, ground-air signals, aircraft vectoring',
    chapters: [19],
    icon: 'radio',
  },
  {
    id: 11,
    title: 'Environments',
    scope: 'Desert, tropical, cold weather, and sea modules',
    chapters: [13, 14, 15, 16],
    icon: 'globe',
  },
  {
    id: 12,
    title: 'Man-Made Hazards',
    scope: 'Shielding, decontamination, protected water, chemical release',
    chapters: [23],
    icon: 'shield',
  },
];

export function tileById(id: number): EncyclopediaTile | undefined {
  return TILES.find((t) => t.id === id);
}

/**
 * Sample pack shaped to contracts/pack-format.md, used when no server is
 * reachable. Chapter rows cover every tile so the grid navigates; sections
 * and blocks exist only for Shelter, enough to exercise the block reader.
 * Screens showing sample data label it.
 */
const SAMPLE_CHAPTERS: ChapterSummary[] = [
  { id: 'ch04', tile_id: 1, fm_number: 4, title: 'Basic Survival Medicine', priority_order: 4 },
  { id: 'ch05', tile_id: 2, fm_number: 5, title: 'Shelters', priority_order: 5 },
  { id: 'ch06', tile_id: 4, fm_number: 6, title: 'Water Procurement', priority_order: 6 },
  { id: 'ch07', tile_id: 3, fm_number: 7, title: 'Firecraft', priority_order: 7 },
  { id: 'ch08', tile_id: 5, fm_number: 8, title: 'Food Procurement', priority_order: 8 },
  { id: 'ch09', tile_id: 5, fm_number: 9, title: 'Survival Use of Plants', priority_order: 9 },
  { id: 'ch10', tile_id: 6, fm_number: 10, title: 'Poisonous Plants', priority_order: 10 },
  { id: 'ch11', tile_id: 7, fm_number: 11, title: 'Dangerous Animals', priority_order: 11 },
  {
    id: 'ch12',
    tile_id: 8,
    fm_number: 12,
    title: 'Field-Expedient Weapons, Tools, and Equipment',
    priority_order: 12,
  },
  { id: 'ch13', tile_id: 11, fm_number: 13, title: 'Desert Survival', priority_order: 13 },
  { id: 'ch14', tile_id: 11, fm_number: 14, title: 'Tropical Survival', priority_order: 14 },
  { id: 'ch15', tile_id: 11, fm_number: 15, title: 'Cold Weather Survival', priority_order: 15 },
  { id: 'ch16', tile_id: 11, fm_number: 16, title: 'Sea Survival', priority_order: 16 },
  {
    id: 'ch17',
    tile_id: 4,
    fm_number: 17,
    title: 'Expedient Water Crossings',
    priority_order: 17,
  },
  {
    id: 'ch18',
    tile_id: 9,
    fm_number: 18,
    title: 'Field-Expedient Direction Finding',
    priority_order: 18,
  },
  { id: 'ch19', tile_id: 10, fm_number: 19, title: 'Signaling Techniques', priority_order: 19 },
  {
    id: 'ch23',
    tile_id: 12,
    fm_number: 23,
    title: 'Survival in Man-Made Hazards',
    priority_order: 23,
  },
];

const SAMPLE_SECTIONS: Record<string, SectionDetail> = {
  'ch05.site-selection': {
    id: 'ch05.site-selection',
    chapter_id: 'ch05',
    fm_heading: '5-1',
    title: 'Shelter Site Selection',
    order: 1,
    blocks: [
      {
        id: 'ch05.site-selection.b1',
        order: 1,
        type: 'principle',
        text: 'Look for a shelter site while there is still daylight. The site must contain material to build the shelter and be large and level enough for you to lie down.',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
      {
        id: 'ch05.site-selection.b2',
        order: 2,
        type: 'checklist',
        text: '• Near signaling terrain and a water source\n• Away from dead standing trees that could fall\n• Above the flood line of streams and dry washes',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
      {
        id: 'ch05.site-selection.b3',
        order: 3,
        type: 'warning',
        text: 'Do not shelter in a dry streambed. A storm out of sight upstream can flood the bed with little warning.',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
      {
        id: 'ch05.site-selection.b4',
        order: 4,
        type: 'note',
        text: 'Note: cold air settles into low ground overnight; a site partway up a slope stays warmer than the valley floor.',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
    ],
  },
  'ch05.poncho-lean-to': {
    id: 'ch05.poncho-lean-to',
    chapter_id: 'ch05',
    fm_heading: '5-2',
    title: 'Poncho Lean-To',
    order: 2,
    blocks: [
      {
        id: 'ch05.poncho-lean-to.b1',
        order: 1,
        type: 'materials',
        text: '• Poncho or tarp\n• Two to three meters of cordage\n• Three stakes about 30 centimeters long\n• Two trees two to three meters apart',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
      {
        id: 'ch05.poncho-lean-to.b2',
        order: 2,
        type: 'procedure_step',
        text: 'Poncho lean-to\nTie off the hood, then secure the long side of the poncho to the ridgeline between the two trees, keeping the tied side into the wind.',
        figure_ref: '5-1',
        source: 'FM 21-76',
        review_status: 'auto',
      },
      {
        id: 'ch05.poncho-lean-to.b3',
        order: 3,
        type: 'procedure_step',
        text: 'Stake the free side to the ground and check that the roof sheds water away from the sleeping area.',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
      {
        id: 'ch05.poncho-lean-to.b4',
        order: 4,
        type: 'reference',
        text: 'See Chapter 12 for the taut-line hitch used on the ridgeline.',
        figure_ref: null,
        source: 'FM 21-76',
        review_status: 'auto',
      },
    ],
  },
};

const SAMPLE_CHAPTER_SECTIONS: Record<string, { id: string; title: string; order: number }[]> = {
  ch05: Object.values(SAMPLE_SECTIONS)
    .filter((s) => s.chapter_id === 'ch05')
    .map((s) => ({ id: s.id, title: s.title, order: s.order }))
    .sort((a, b) => a.order - b.order),
};

export interface ContentResult<T> {
  data: T;
  sample: boolean;
}

/**
 * Server-first content access: each call tries /v1/content and falls back to
 * the bundled sample pack when the server is unreachable or has no pack.
 */
export async function loadChapters(api: ApiClient): Promise<ContentResult<ChapterSummary[]>> {
  try {
    return { data: await api.listChapters(), sample: false };
  } catch {
    return { data: SAMPLE_CHAPTERS, sample: true };
  }
}

export async function loadChapter(
  api: ApiClient,
  chapterId: string,
): Promise<ContentResult<ChapterDetail>> {
  try {
    return { data: await api.getChapter(chapterId), sample: false };
  } catch {
    const summary = SAMPLE_CHAPTERS.find((c) => c.id === chapterId);
    if (summary === undefined) {
      throw new Error(`unknown chapter: ${chapterId}`);
    }
    return { data: { ...summary, sections: SAMPLE_CHAPTER_SECTIONS[chapterId] ?? [] }, sample: true };
  }
}

export async function loadSection(
  api: ApiClient,
  sectionId: string,
): Promise<ContentResult<SectionDetail>> {
  try {
    return { data: await api.getSection(sectionId), sample: false };
  } catch {
    const section = SAMPLE_SECTIONS[sectionId];
    if (section === undefined) {
      throw new Error(`unknown section: ${sectionId}`);
    }
    return { data: section, sample: true };
  }
}
