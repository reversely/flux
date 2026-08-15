/**
 * Mock chat transport. Stands in for POST /v1/chat until the server exposes
 * it; the reply shape is ChatAnswer in types.ts, and answers paraphrase
 * FM 21-76 with citations to the owning tile (PRD 1.3). Swap this module for
 * an ApiClient method when the endpoint reaches the OpenAPI export.
 */
import type { ChatAnswer, Citation } from './types';

interface CannedAnswer {
  keywords: string[];
  text: string;
  citations: Citation[];
}

const cite = (
  chapter_number: number,
  chapter_title: string,
  section_title: string,
  tile_id: number,
): Citation => ({
  anchor: `fm21-76:ch${chapter_number}:${section_title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  chapter_number,
  chapter_title,
  section_title,
  tile_id,
});

// Ordered by Chapter 1 priorities: medicine before shelter, fire, water, food.
const CANNED: CannedAnswer[] = [
  {
    keywords: ['bleed', 'wound', 'cut', 'first aid', 'injur'],
    text: 'Control bleeding first: apply direct pressure on the wound with a dressing or the cleanest cloth available, and keep the pressure continuous rather than dabbing. Elevate the limb above the heart. A tourniquet comes last, only for bleeding that pressure cannot stop.',
    citations: [cite(4, 'Basic Survival Medicine', 'Bleeding control', 1)],
  },
  {
    keywords: ['shelter', 'sleep', 'cold', 'tent'],
    text: 'Pick the site before the build: near materials and water, clear of dead standing trees, drainage paths, and insect nests. A lean-to with an insulating ground bed handles most temperate conditions; ground insulation matters more than overhead cover for warmth.',
    citations: [
      cite(5, 'Shelters', 'Shelter site selection', 2),
      cite(5, 'Shelters', 'Field-expedient lean-to', 2),
    ],
  },
  {
    keywords: ['fire', 'ignite', 'tinder', 'flame'],
    text: 'Prepare the site and all three material stages before striking anything: tinder that catches from a spark, kindling that catches from tinder, and fuel wood. Build a platform on wet ground. A tepee lay lights easiest; switch to a log cabin lay for a longer, steadier burn.',
    citations: [
      cite(7, 'Firecraft', 'Fire site preparation', 3),
      cite(7, 'Firecraft', 'Fire lays', 3),
    ],
  },
  {
    keywords: ['water', 'drink', 'thirst', 'purif', 'boil'],
    text: 'Treat every open water source as contaminated. Boiling is the surest purification: a full rolling boil for one minute kills the pathogens that cause the common waterborne illnesses. Filter cloudy water through cloth first, and collect from moving water over standing water when the choice exists.',
    citations: [
      cite(6, 'Water Procurement', 'Water sources', 4),
      cite(6, 'Water Procurement', 'Water purification', 4),
    ],
  },
  {
    keywords: ['eat', 'food', 'plant', 'berry', 'edib', 'mushroom'],
    text: 'Apply the universal edibility test to any plant you cannot positively identify, and skip fungi entirely: the test does not screen the toxins deadly mushrooms carry. Test one plant part at a time through contact, taste, and a waiting period before swallowing more.',
    citations: [
      cite(9, 'Food Procurement', 'Universal edibility test', 5),
      cite(10, 'Poisonous Plants', 'Avoidance rules', 6),
    ],
  },
  {
    keywords: ['snake', 'bite', 'animal', 'bear', 'sting'],
    text: 'For a snakebite, keep the casualty still and the bitten limb below heart level, remove rings and tight clothing before swelling starts, and get medical help moving toward you. Do not cut the wound, suck the venom, or apply ice; those measures worsen the outcome.',
    citations: [cite(11, 'Dangerous Animals', 'Snakebite response', 7)],
  },
  {
    keywords: ['lost', 'direction', 'navigate', 'compass', 'north'],
    text: 'Stop moving as soon as you suspect you are lost; distance walked while disoriented multiplies the search area. Establish direction with the sun: a shadow-tip line laid over fifteen minutes runs west to east. Then commit to one heading and hold it with back-bearings on landmarks.',
    citations: [cite(18, 'Field-Expedient Direction Finding', 'Shadow-tip method', 9)],
  },
];

const FALLBACK: ChatAnswer = {
  answer_id: 'mock-fallback',
  text: 'Please ask about a specific situation: bleeding, shelter, fire, water, food, animal encounters, or finding your direction. The encyclopedia covers all twelve areas in priority order.',
  citations: [cite(1, 'Introduction', 'Survival priorities', 1)],
};

const MOCK_DELAY_MS = 600;
let counter = 0;

export async function askChat(question: string): Promise<ChatAnswer> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  const q = question.toLowerCase();
  const match = CANNED.find((c) => c.keywords.some((k) => q.includes(k)));
  counter += 1;
  if (!match) {
    return { ...FALLBACK, answer_id: `mock-${counter}` };
  }
  return { answer_id: `mock-${counter}`, text: match.text, citations: match.citations };
}
