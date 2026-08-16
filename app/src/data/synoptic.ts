import type { ImageSourcePropType } from 'react-native';

/**
 * Guides are the two synoptic forms of PRD 1.4, authored from the sources in
 * docs/research/. A process guide asks whether a step is done. An
 * identification guide asks one observable trait and narrows candidates.
 * Every node names the source it came from, and each guide lists its full
 * sources at the end so a screen can link them.
 */

export interface GuideSource {
  /** Referenced from a node, and rendered as [1], [2] at the foot of a guide. */
  id: string;
  title: string;
  url: string;
  licence: string;
}

export interface GuideNode {
  id: string;
  /** One short question. Plain words, no full sentences. */
  ask: string;
  image?: ImageSourcePropType;
  /** What the user should see when this step is done. Process guides only. */
  cue?: string;
  /** Seconds to wait, for a step whose completion is a wait. */
  wait?: number;
  /** Answers, for an identification node. */
  states?: string[];
  /** Which trait this node sets, matched against candidate traits. */
  trait?: string;
  source: string;
  /** Where in the source, shown next to the question. */
  cite: string;
}

export interface GuideCandidate {
  name: string;
  image?: ImageSourcePropType;
  traits: Record<string, string>;
  /** One line on what it means for the user. */
  means: string;
}

export interface Guide {
  id: string;
  form: 'process' | 'identification';
  title: string;
  /** One line, shown as the opening banner. */
  scope: string;
  tileId: number;
  nodes: GuideNode[];
  candidates?: GuideCandidate[];
  sources: GuideSource[];
}

const FM = {
  id: 'fm21-76',
  title: 'FM 21-76 Survival, US Army',
  url: 'https://commons.wikimedia.org/wiki/File:FM_21-76_Survival_June_1992.pdf',
  licence: 'Public domain, US government work',
};

const NOAA = {
  id: 'noaa-jetstream',
  title: 'NOAA JetStream, The Ten Basic Cloud Types',
  url: 'https://www.noaa.gov/jetstream/clouds/ten-basic-clouds',
  licence: 'Public domain, US government work',
};

const EPA = {
  id: 'epa-disinfection',
  title: 'EPA, Emergency Disinfection of Drinking Water',
  url: 'https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water',
  licence: 'Public domain, US government work',
};

const FIRE: Guide = {
  id: 'fire-tepee',
  form: 'process',
  title: 'Tepee fire',
  scope: 'Build a fire that catches from one match.',
  tileId: 3,
  nodes: [
    {
      id: 'site',
      ask: 'Ground cleared to bare earth?',
      cue: 'A circle of soil, nothing burnable within a metre.',
      image: require('../../assets/guides/types-of-fire-walls.jpg'),
      source: FM.id,
      cite: 'FM 21-76, 7-1',
    },
    {
      id: 'tinder',
      ask: 'Tinder bundle made?',
      cue: 'A loose nest you can see light through.',
      source: FM.id,
      cite: 'FM 21-76, 7-3',
    },
    {
      id: 'lay',
      ask: 'Kindling stood in a cone over the tinder?',
      cue: 'Sticks leaning together, gaps for air.',
      image: require('../../assets/guides/methods-of-laying-fires.jpg'),
      source: FM.id,
      cite: 'FM 21-76, figure 7-5',
    },
    {
      id: 'light',
      ask: 'Lit from the upwind side?',
      cue: 'Flame carried into the tinder, not away from it.',
      source: FM.id,
      cite: 'FM 21-76, 7-4',
    },
    {
      id: 'feed',
      ask: 'Fire holding on its own?',
      cue: 'Kindling burning through, cone starting to fall in.',
      wait: 120,
      source: FM.id,
      cite: 'FM 21-76, 7-4',
    },
  ],
  sources: [FM],
};

const WATER: Guide = {
  id: 'water-safe',
  form: 'process',
  title: 'Make water safe',
  scope: 'Boiling first. Bleach when you cannot boil.',
  tileId: 4,
  nodes: [
    {
      id: 'clear',
      ask: 'Water cloudy?',
      cue: 'Let it settle, then pour through cloth or a coffee filter.',
      source: EPA.id,
      cite: 'EPA, emergency disinfection',
    },
    {
      id: 'boil',
      ask: 'Can you boil it?',
      cue: 'Rolling boil, one minute. Three minutes above 5,000 feet.',
      wait: 60,
      source: EPA.id,
      cite: 'EPA, emergency disinfection',
    },
    {
      id: 'dose',
      ask: 'Bleach added?',
      cue: '8 drops per gallon at 6%, 6 drops at 8.25%. Double if cloudy or very cold.',
      source: EPA.id,
      cite: 'EPA, emergency disinfection',
    },
    {
      id: 'stand',
      ask: 'Stood 30 minutes?',
      cue: 'Slight chlorine smell. No smell means repeat the dose and wait 15 more.',
      wait: 1800,
      source: EPA.id,
      cite: 'EPA, emergency disinfection',
    },
  ],
  sources: [EPA, FM],
};

const CLOUDS: Guide = {
  id: 'clouds',
  form: 'identification',
  title: 'Read the sky',
  scope: 'Name the cloud, then read what it carries.',
  tileId: 11,
  nodes: [
    {
      id: 'level',
      ask: 'How high?',
      trait: 'level',
      states: ['high', 'middle', 'low', 'towering'],
      source: NOAA.id,
      cite: 'NOAA JetStream, ten basic clouds',
    },
    {
      id: 'shape',
      ask: 'Shape?',
      trait: 'shape',
      states: ['sheet', 'patches', 'heaps', 'wisps'],
      source: NOAA.id,
      cite: 'NOAA JetStream, ten basic clouds',
    },
    {
      id: 'rain',
      ask: 'Rain or snow falling from it?',
      trait: 'rain',
      states: ['yes', 'no'],
      source: NOAA.id,
      cite: 'NOAA JetStream, ten basic clouds',
    },
  ],
  candidates: [
    {
      name: 'Cirrus',
      image: require('../../assets/guides/cloud-cirrus.jpg'),
      traits: { level: 'high', shape: 'wisps', rain: 'no' },
      means: 'Fair now. Weather often changes within a day.',
    },
    {
      name: 'Cirrocumulus',
      image: require('../../assets/guides/cloud-cirrocumulus.jpg'),
      traits: { level: 'high', shape: 'patches', rain: 'no' },
      means: 'Fair and cold.',
    },
    {
      name: 'Cirrostratus',
      image: require('../../assets/guides/cloud-cirrostratus.jpg'),
      traits: { level: 'high', shape: 'sheet', rain: 'no' },
      means: 'Halo round the sun or moon. Rain or snow within a day.',
    },
    {
      name: 'Altocumulus',
      image: require('../../assets/guides/cloud-altocumulus.jpg'),
      traits: { level: 'middle', shape: 'patches', rain: 'no' },
      means: 'On a warm humid morning, thunderstorms by afternoon.',
    },
    {
      name: 'Altostratus',
      image: require('../../assets/guides/cloud-altostratus.jpg'),
      traits: { level: 'middle', shape: 'sheet', rain: 'no' },
      means: 'Sun looks watery. Steady rain coming.',
    },
    {
      name: 'Nimbostratus',
      image: require('../../assets/guides/cloud-nimbostratus.jpg'),
      traits: { level: 'middle', shape: 'sheet', rain: 'yes' },
      means: 'Steady rain or snow, set in for hours.',
    },
    {
      name: 'Stratus',
      image: require('../../assets/guides/cloud-stratus.jpg'),
      traits: { level: 'low', shape: 'sheet', rain: 'no' },
      means: 'Grey and flat. Drizzle at most.',
    },
    {
      name: 'Stratocumulus',
      image: require('../../assets/guides/cloud-stratocumulus.jpg'),
      traits: { level: 'low', shape: 'heaps', rain: 'no' },
      means: 'Lumpy cover. Rain unlikely.',
    },
    {
      name: 'Cumulus',
      image: require('../../assets/guides/cloud-cumulus.jpg'),
      traits: { level: 'low', shape: 'heaps', rain: 'no' },
      means: 'Fair weather. Watch if they grow tall.',
    },
    {
      name: 'Cumulonimbus',
      image: require('../../assets/guides/cloud-cumulonimbus.jpg'),
      traits: { level: 'towering', shape: 'heaps', rain: 'yes' },
      means: 'Thunderstorm. Hail, lightning, sudden wind. Get off high ground.',
    },
  ],
  sources: [NOAA],
};

export const GUIDES: Guide[] = [FIRE, WATER, CLOUDS];

export function guideById(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}

export function guidesForTile(tileId: number): Guide[] {
  return GUIDES.filter((g) => g.tileId === tileId);
}

/** Candidates still matching the answers so far. A missing trait never eliminates. */
export function narrow(guide: Guide, answers: Record<string, string>): GuideCandidate[] {
  return (guide.candidates ?? []).filter((c) =>
    Object.entries(answers).every(([trait, state]) => {
      const value = c.traits[trait];
      return value === undefined || value === state;
    }),
  );
}
