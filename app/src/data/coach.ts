/**
 * Knot coach content: field-guide fragments on screen, a fuller line for the
 * voice (glosses carry their reason in speech, not on screen). Reference
 * images are openly licensed; attribution renders as one bottom line in the
 * coach screen (`source · author · license`). Step text follows the CLAUDE.md
 * UI-copy rules: expert terminology from real sources, plain glosses at first
 * use, no invented paraphrases.
 */

export interface CoachStep {
  /** Short fragment shown on screen. */
  screen: string;
  /** Spoken line; carries the reason behind any glossed term. */
  voice: string;
}

export interface KnotAttribution {
  source: string;
  author: string;
  license: string;
}

export interface Knot {
  id: string;
  name: string;
  /** Encyclopedia tile that owns this knot (8 Tools & Cordage, 5 Food). */
  tileId: number;
  reference: number;
  attribution: KnotAttribution;
  steps: CoachStep[];
}

export const KNOTS: Knot[] = [
  {
    id: 'bowline',
    name: 'Bowline',
    tileId: 8,
    reference: require('../../assets/coach/bowline.png'),
    attribution: {
      source: 'commons.wikimedia.org/…/Bowline_(standard2).svg',
      author: "Phil'enCorse",
      license: 'CC BY-SA 4.0',
    },
    steps: [
      { screen: 'Rope laid out.', voice: 'Rope laid out. Ready.' },
      {
        screen: 'Small overhand loop in the standing part.',
        voice: 'Form a small overhand loop in the standing part.',
      },
      {
        screen: 'Working end: up through the loop, behind the standing part, back down.',
        voice:
          'Thread the working end up through the loop, behind the standing part, and back down through the loop.',
      },
      { screen: 'Pull tight. Loop stays open.', voice: 'Pull tight. The loop stays open.' },
    ],
  },
  {
    id: 'square',
    name: 'Square knot',
    tileId: 8,
    reference: require('../../assets/coach/square.png'),
    attribution: {
      source: 'commons.wikimedia.org/…/Square_knot.svg',
      author: 'CountingPine',
      license: 'Public domain',
    },
    steps: [
      { screen: 'Two rope ends laid out.', voice: 'Two rope ends laid out.' },
      {
        screen: 'Left over right. Tuck under.',
        voice: 'Cross the left end over the right and tuck it under.',
      },
      {
        screen: 'Right over left. Tuck under.',
        voice: 'Cross the right end over the left and tuck it under.',
      },
      {
        screen: 'Pull all four ends. Knot lies flat.',
        voice: 'Pull all four ends tight. The knot lies flat.',
      },
    ],
  },
  {
    id: 'clove',
    name: 'Clove hitch',
    tileId: 8,
    reference: require('../../assets/coach/clove.png'),
    attribution: {
      source: 'commons.wikimedia.org/…/Mastworp.svg',
      author: 'Sawims',
      license: 'Public domain',
    },
    steps: [
      { screen: 'Rope and pole ready.', voice: 'Rope and pole ready.' },
      {
        screen: 'Wrap over the pole. Cross the standing part.',
        voice: 'Wrap the end over the pole and cross it over the standing part.',
      },
      {
        screen: 'Wrap again. Tuck under the last wrap.',
        voice: 'Wrap over the pole again and tuck the end under the last wrap.',
      },
      { screen: 'Pull both ends tight.', voice: 'Pull both ends tight against the pole.' },
    ],
  },
  {
    id: 'fig8',
    name: 'Figure-eight knot',
    tileId: 8,
    reference: require('../../assets/coach/fig8.png'),
    attribution: {
      source: 'commons.wikimedia.org/…/Figure-eight_knot.svg',
      author: 'Lucasbosch',
      license: 'CC BY-SA 3.0',
    },
    steps: [
      { screen: 'Rope laid out straight.', voice: 'Rope laid out straight.' },
      {
        screen: 'Form a loop. End crosses over.',
        voice: 'Form a loop, crossing the end over the standing part.',
      },
      {
        screen: 'Wrap the end behind the standing part.',
        voice: 'Wrap the end behind the standing part.',
      },
      {
        screen: 'End down through the loop.',
        voice: 'Pass the end down through the loop. You get a figure-eight shape.',
      },
      { screen: 'Pull both ends tight.', voice: 'Pull both ends tight.' },
    ],
  },
  {
    id: 'truckers',
    name: "Trucker's hitch",
    tileId: 8,
    reference: require('../../assets/coach/truckers.jpg'),
    attribution: {
      source: "commons.wikimedia.org/…/Truckers'_Hitch_With_Span_Loop.jpg",
      author: 'Cobanyastigi',
      license: 'CC0',
    },
    steps: [
      { screen: 'Rope runs to the tie-off point.', voice: 'Run the rope to the tie-off point.' },
      { screen: 'Small loop in the line.', voice: 'Form a small loop in the line.' },
      {
        screen: 'Pull a fold through. Slipped loop.',
        voice: 'Pull a fold of rope through to make a slipped loop.',
      },
      {
        screen: 'End around the tie-off, up through the loop.',
        voice: 'Pass the working end around the tie-off point and up through the loop.',
      },
      { screen: 'Haul tight.', voice: 'Haul the working end tight.' },
      {
        screen: 'Lock off: two half hitches.',
        voice: 'Lock it off with two half hitches.',
      },
    ],
  },
  {
    id: 'palomar',
    name: 'Palomar knot',
    tileId: 5,
    reference: require('../../assets/coach/palomar.jpg'),
    attribution: {
      source: 'commons.wikimedia.org/…/PalomarKnotSequence.jpg',
      author: 'Vaughan Pratt',
      license: 'CC BY-SA 3.0',
    },
    steps: [
      { screen: 'Line and hook ready.', voice: 'Line and hook ready.' },
      { screen: 'Double the line into a loop.', voice: 'Double the line into a loop.' },
      {
        screen: 'Thread the loop through the hook eye.',
        voice: 'Thread the doubled loop through the hook eye.',
      },
      {
        screen: 'Loose overhand knot. Hook hangs in the middle.',
        voice: 'Tie a loose overhand knot. The hook hangs from the middle.',
      },
      {
        screen: 'Pass the loop over the whole hook.',
        voice: 'Pass the loop over the whole hook.',
      },
      {
        screen: 'Wet the knot (spit works). Pull both lines tight.',
        voice:
          'Wet the knot with spit or water so the line does not weaken from friction. Then pull both lines tight.',
      },
      {
        screen: 'Trim the tag end (the short leftover).',
        voice: 'Trim the tag end, the short leftover line.',
      },
    ],
  },
];

export function knotById(id: string): Knot | undefined {
  return KNOTS.find((k) => k.id === id);
}

export function knotsForTile(tileId: number): Knot[] {
  return KNOTS.filter((k) => k.tileId === tileId);
}
