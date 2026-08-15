/**
 * Mock chat transport. Stands in for POST /v1/chat until the server exposes
 * it; the reply shape is ChatAnswer in types.ts. Answers paraphrase FM 21-76,
 * name their chapter in prose (the client links the mention into the full
 * text), and may carry a tool launch that opens a widget preloaded for the
 * subject. Swap this module for an ApiClient method when the endpoint
 * reaches the OpenAPI export.
 */
import type { ChatAnswer } from './types';

type Canned = Omit<ChatAnswer, 'answer_id'> & { keywords: string[] };

// Ordered by Chapter 1 priorities: medicine before shelter, fire, water, food.
const CANNED: Canned[] = [
  {
    keywords: ['bleed', 'wound', 'cut', 'first aid', 'injur'],
    text: 'Control bleeding first: apply direct pressure on the wound with a dressing or the cleanest cloth available, and keep the pressure continuous rather than dabbing. Elevate the limb above the heart. A tourniquet comes last, only for bleeding that pressure cannot stop. Chapter 4 covers wound care and bone injuries in full.',
  },
  {
    keywords: ['shelter', 'sleep', 'cold', 'tent'],
    text: 'Pick the site before the build: near materials and water, clear of dead standing trees, drainage paths, and insect nests. A lean-to with an insulating ground bed handles most temperate conditions, and ground insulation matters more than overhead cover for warmth. Chapter 5 walks through the builds.',
  },
  {
    keywords: ['fire', 'ignite', 'tinder', 'flame'],
    text: 'Prepare the site and all three material stages before striking anything: tinder that catches from a spark, kindling that catches from tinder, and fuel wood. Build a platform on wet ground. A tepee lay lights easiest; switch to a log cabin lay for a longer burn. Chapter 7 covers lays and ignition methods.',
  },
  {
    keywords: ['water', 'drink', 'thirst', 'purif', 'boil'],
    text: 'Treat every open water source as contaminated. Boiling is the surest purification: a full rolling boil for one minute kills the pathogens behind the common waterborne illnesses. Filter cloudy water through cloth first, and prefer moving water to standing water. Chapter 6 covers sources, stills, and filtration.',
  },
  {
    keywords: ['eat', 'food', 'plant', 'berry', 'edib', 'mushroom'],
    text: 'Apply the universal edibility test to any plant you cannot positively identify, and skip fungi entirely: the test does not screen the toxins deadly mushrooms carry. Chapter 9 gives the test; chapter 10 covers the poisonous lookalikes. The camera can identify a specimen against the regional species list.',
    tool: { kind: 'camera', label: 'Identify a plant', prime: 'species-id' },
  },
  {
    keywords: ['snake', 'bite', 'animal', 'bear', 'sting'],
    text: 'For a snakebite, keep the casualty still and the bitten limb below heart level, remove rings and tight clothing before swelling starts, and get help moving toward you. Do not cut the wound, suck the venom, or apply ice. Chapter 11 covers encounter behavior by species; the camera can identify an animal from a safe distance.',
    tool: { kind: 'camera', label: 'Identify an animal', prime: 'wildlife-id' },
  },
  {
    keywords: ['knot', 'rope', 'lash', 'cord'],
    text: 'Six knots cover most field work: bowline for a fixed loop, taut-line hitch for adjustable tension, clove hitch to start a lashing, figure-eight as a stopper, square knot for binding, and the trucker’s hitch to cinch a load. Chapter 12 has the rope work; the camera can check a tied knot.',
    tool: { kind: 'camera', label: 'Check my knot', prime: 'knot-verification' },
  },
  {
    keywords: ['lost', 'direction', 'navigate', 'compass', 'north'],
    text: 'Stop moving as soon as you suspect you are lost; distance walked while disoriented multiplies the search area. Establish direction with the sun: a shadow-tip line laid over fifteen minutes runs west to east. Then commit to one heading and hold it with back-bearings on landmarks. Chapter 18 covers every method.',
  },
];

const FALLBACK: Omit<ChatAnswer, 'answer_id'> = {
  text: 'Please ask about a specific situation: bleeding, shelter, fire, water, food, animal encounters, rope work, or finding your direction. The encyclopedia covers all twelve areas in priority order, and chapter 1 sets the priorities.',
};

const MOCK_DELAY_MS = 600;
let counter = 0;

export async function askChat(question: string): Promise<ChatAnswer> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
  const q = question.toLowerCase();
  const match = CANNED.find((c) => c.keywords.some((k) => q.includes(k)));
  counter += 1;
  const { keywords: _unused, ...answer } = match ?? { keywords: [], ...FALLBACK };
  return { answer_id: `mock-${counter}`, ...answer };
}
