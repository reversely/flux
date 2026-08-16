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
  /** Verbatim manual excerpt shown small under the fragment. */
  manual?: string;
  /** Per-step diagram; the procedure's reference shows when absent. */
  figure?: number;
}

export interface KnotAttribution {
  source: string;
  author: string;
  license: string;
}

export interface Procedure {
  id: string;
  name: string;
  /** Encyclopedia tile that owns this procedure (8 Tools, 5 Food, 3 Fire). */
  tileId: number;
  reference: number;
  attribution: KnotAttribution;
  steps: CoachStep[];
  /** The server can watch this procedure through /v1/coach (benched knots only). */
  watchable: boolean;
  /** FM 21-76 chapter behind the manual excerpts, linked from the screen. */
  manualChapter?: number;
}

/** @deprecated alias kept while call sites migrate. */
export type Knot = Procedure;

export const PROCEDURES: Procedure[] = [
  {
    id: 'bowline',
    watchable: true,
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
    watchable: true,
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
    watchable: true,
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
    watchable: true,
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
    watchable: true,
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
    watchable: true,
    name: 'Palomar knot',
    tileId: 8,
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
        figure: require('../../assets/coach/palomar_overhand.jpg'),
      },
      {
        screen: 'Pass the loop over the whole hook.',
        voice: 'Pass the loop over the whole hook.',
        figure: require('../../assets/coach/palomar_loop_over.jpg'),
      },
      {
        screen: 'Wet the knot (spit works). Pull both lines tight.',
        voice:
          'Wet the knot with spit or water so the line does not weaken from friction. Then pull both lines tight.',
        figure: require('../../assets/coach/palomar_drawn.jpg'),
      },
      {
        screen: 'Trim the tag end (the short leftover).',
        voice: 'Trim the tag end, the short leftover line.',
        figure: require('../../assets/coach/palomar_cinch.jpg'),
      },
    ],
  },
  {
    id: 'fire-tepee',
    name: 'Build a fire',
    tileId: 3,
    watchable: false,
    manualChapter: 7,
    reference: require('../../assets/coach/fire_tepee.png'),
    attribution: {
      source: 'FM 21-76 Ch 7 figures',
      author: 'US Army',
      license: 'Public domain',
    },
    steps: [
      {
        screen: 'Dry spot. Out of the wind. Fuel nearby.',
        voice:
          'Find a dry spot protected from the wind, placed well against your shelter, with wood or other fuel available.',
        manual:
          'Look for a dry spot that is protected from the wind, is suitably placed in relation to your shelter, will concentrate the heat in the direction you desire, and has a supply of wood or other fuel available.',
      },
      {
        screen: 'Clear a 1 m circle to bare soil.',
        voice:
          'Clear the brush and scrape the surface soil away in a circle at least one meter across, so the fire cannot spread.',
        manual:
          'Clear the brush and scrape the surface soil from the spot you have selected. Clear a circle at least 1 meter in diameter so there is little chance of the fire spreading. If time allows, construct a fire wall using logs or rocks. Caution: do not use wet or porous rocks as they may explode when heated.',
        figure: require('../../assets/coach/fire_walls.png'),
      },
      {
        screen: 'Three piles: tinder, kindling, fuel.',
        voice:
          'Gather three piles before you strike anything. Tinder that ignites from a spark, kindling, and fuel.',
        manual:
          'You need three types of materials: tinder, kindling, and fuel. Tinder is dry material that ignites with little heat. Kindling is readily combustible material that you add to the burning tinder. Fuel is less combustible material that burns slowly and steadily once ignited.',
        figure: require('../../assets/coach/fire_materials.png'),
      },
      {
        screen: 'Tinder center. Kindling cone over it.',
        voice:
          'Arrange the tinder and a few sticks of kindling in the shape of a tepee, or cone.',
        manual:
          'Arrange the tinder and a few sticks of kindling in the shape of a tepee or cone. As the tepee burns, the outside logs will fall inward, feeding the fire. This type of fire burns well even with wet wood.',
        figure: require('../../assets/coach/fire_tepee.png'),
      },
      {
        screen: 'Light the tinder. Upwind side.',
        voice: 'Always light your fire from the upwind side. Light the center of the tinder.',
        manual:
          'Always light your fire from the upwind side. Make sure to lay your tinder, kindling, and fuel so that your fire will burn as long as you need it.',
        figure: require('../../assets/coach/fire_lens.png'),
      },
      {
        screen: 'Feed it: kindling first, then fuel.',
        voice:
          'As the kindling catches from the tinder, add more kindling, then fuel. Dry damp firewood near the fire.',
        manual:
          'As the kindling catches fire from the tinder, add more kindling. Bank the fire to keep the coals alive overnight, and be sure the fire is out before leaving camp.',
        figure: require('../../assets/coach/fire_lays.png'),
      },
    ],
  },
];

export function procedureById(id: string): Procedure | undefined {
  return PROCEDURES.find((p) => p.id === id);
}

export function proceduresForTile(tileId: number): Procedure[] {
  return PROCEDURES.filter((p) => p.tileId === tileId);
}
