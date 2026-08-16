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
    name: "Bowline",
    tileId: 8,
    watchable: true,
    reference: require('../../assets/coach/steps/bowline_4.jpg'),
    attribution: {
      source: 'wikihow.com/Tie-a-Bowline',
      author: 'wikiHow',
      license: 'CC BY-NC-SA 3.0',
    },
    steps: [
      {
        screen: "Small overhand loop in the standing part.",
        voice: "Form a small overhand loop in the standing part. Leave a long working end.",
        figure: require('../../assets/coach/steps/bowline_1.jpg'),
      },
      {
        screen: "Working end up through the loop.",
        voice: "Bring the working end up through the loop, from underneath.",
        figure: require('../../assets/coach/steps/bowline_2.jpg'),
      },
      {
        screen: "Behind the standing part.",
        voice: "Wrap the working end behind the standing part.",
        figure: require('../../assets/coach/steps/bowline_3.jpg'),
      },
      {
        screen: "Back down through the loop. Pull tight.",
        voice: "Pass the working end back down through the loop and pull tight. The loop stays open.",
        figure: require('../../assets/coach/steps/bowline_4.jpg'),
      },
    ],
  },
  {
    id: 'square',
    name: "Square knot",
    tileId: 8,
    watchable: true,
    reference: require('../../assets/coach/steps/square_3.jpg'),
    attribution: {
      source: 'wikihow.com/Tie-a-Square-Knot',
      author: 'wikiHow',
      license: 'CC BY-NC-SA 3.0',
    },
    steps: [
      {
        screen: "Left end over right. Tuck under.",
        voice: "Cross the left end over the right and tuck it under.",
        figure: require('../../assets/coach/steps/square_1.jpg'),
      },
      {
        screen: "Right end over left. Tuck under.",
        voice: "Cross the right end over the left and tuck it under.",
        figure: require('../../assets/coach/steps/square_2.jpg'),
      },
      {
        screen: "Pull all four ends tight. Knot lies flat.",
        voice: "Pull all four ends tight with even tension. The knot lies flat.",
        figure: require('../../assets/coach/steps/square_3.jpg'),
      },
    ],
  },
  {
    id: 'clove',
    name: "Clove hitch",
    tileId: 8,
    watchable: true,
    reference: require('../../assets/coach/steps/clove_5.jpg'),
    attribution: {
      source: 'wikihow.com/Tie-a-Clove-Hitch-Knot',
      author: 'wikiHow',
      license: 'CC BY-NC-SA 3.0',
    },
    steps: [
      {
        screen: "Wrap the end over the pole.",
        voice: "Wrap the end halfway over the pole, front to back.",
        figure: require('../../assets/coach/steps/clove_1.jpg'),
      },
      {
        screen: "Cross over the standing part.",
        voice: "Cross the running end over the standing part and bring it under the pole.",
        figure: require('../../assets/coach/steps/clove_2.jpg'),
      },
      {
        screen: "Wrap over the pole again.",
        voice: "Wrap the end over the pole a second time, next to the first wrap.",
        figure: require('../../assets/coach/steps/clove_3.jpg'),
      },
      {
        screen: "Slip the end under the last wrap.",
        voice: "Slip the end under the wrap you just made.",
        figure: require('../../assets/coach/steps/clove_4.jpg'),
      },
      {
        screen: "Pull both ends tight.",
        voice: "Pull both ends tight against the pole.",
        figure: require('../../assets/coach/steps/clove_5.jpg'),
      },
    ],
  },
  {
    id: 'fig8',
    name: "Figure-eight knot",
    tileId: 8,
    watchable: true,
    reference: require('../../assets/coach/steps/fig8_2.jpg'),
    attribution: {
      source: 'wikihow.com/Tie-a-Figure-Eight-Knot',
      author: 'wikiHow',
      license: 'CC BY-NC-SA 3.0',
    },
    steps: [
      {
        screen: "Fold the end back over itself.",
        voice: "Fold the end of the rope back over itself.",
        figure: require('../../assets/coach/steps/fig8_1.jpg'),
      },
      {
        screen: "Twist a loop. End through. Tighten.",
        voice: "Twist the end over the rope to form a loop, pass the end through the loop, and tighten.",
        figure: require('../../assets/coach/steps/fig8_2.jpg'),
      },
    ],
  },
  {
    id: 'truckers',
    name: "Trucker's hitch",
    tileId: 8,
    watchable: true,
    reference: require('../../assets/coach/steps/truckers_6.jpg'),
    attribution: {
      source: "wikihow.com/Tie-a-Trucker's-Hitch",
      author: 'wikiHow',
      license: 'CC BY-NC-SA 3.0',
    },
    steps: [
      {
        screen: "Tie off the rope at one end.",
        voice: "Tie off the rope at one end. The working end stays free.",
        figure: require('../../assets/coach/steps/truckers_1.jpg'),
      },
      {
        screen: "Form a loop in the line.",
        voice: "Form a loop in the line and hold it.",
        figure: require('../../assets/coach/steps/truckers_2.jpg'),
      },
      {
        screen: "Cinch the slipped loop.",
        voice: "Pull a fold of rope through the loop and cinch it, so a loop hangs in the line.",
        figure: require('../../assets/coach/steps/truckers_3.jpg'),
      },
      {
        screen: "Working end around the anchor.",
        voice: "Pass the working end around the tie-off point.",
        figure: require('../../assets/coach/steps/truckers_4.jpg'),
      },
      {
        screen: "Up through the loop. Haul tight.",
        voice: "Pass the working end up through the hanging loop and haul it tight. The loop works like a pulley.",
        figure: require('../../assets/coach/steps/truckers_5.jpg'),
      },
      {
        screen: "Lock off: two half hitches.",
        voice: "Lock it off with two half hitches.",
        figure: require('../../assets/coach/steps/truckers_6.jpg'),
      },
    ],
  },
  {
    id: 'palomar',
    name: "Palomar knot",
    tileId: 8,
    watchable: true,
    reference: require('../../assets/coach/steps/palomar_6.jpg'),
    attribution: {
      source: 'wikihow.com/Tie-a-Palomar-Knot',
      author: 'wikiHow',
      license: 'CC BY-NC-SA 3.0',
    },
    steps: [
      {
        screen: "Thread the line through the hook eye.",
        voice: "Thread the line through the hook eye.",
        figure: require('../../assets/coach/steps/palomar_1.jpg'),
      },
      {
        screen: "Thread it back. Doubled line.",
        voice: "Thread the line back through the hook eye, so the line is doubled.",
        figure: require('../../assets/coach/steps/palomar_2.jpg'),
      },
      {
        screen: "Loose overhand knot. Hook hangs in the middle.",
        voice: "Tie a loose overhand knot in the doubled line. The hook hangs from the middle.",
        figure: require('../../assets/coach/steps/palomar_3.jpg'),
      },
      {
        screen: "Pass the hook through the loop.",
        voice: "Pass the hook through the loop of the doubled line.",
        figure: require('../../assets/coach/steps/palomar_4.jpg'),
      },
      {
        screen: "Wet the knot (spit works). Pull tight to the eye.",
        voice: "Wet the knot with spit or water so the line does not weaken from friction. Then pull it tight against the eye.",
        figure: require('../../assets/coach/steps/palomar_5.jpg'),
      },
      {
        screen: "Trim the tag end (the short leftover).",
        voice: "Trim the tag end, the short leftover line.",
        figure: require('../../assets/coach/steps/palomar_6.jpg'),
      },
    ],
  },
  {
    id: 'tourniquet',
    name: 'Improvised tourniquet',
    tileId: 1,
    watchable: true,
    manualChapter: 4,
    reference: require('../../assets/coach/steps/tourniquet_4.jpg'),
    attribution: {
      source: 'FM 4-25.11 figs 2-32 to 2-36',
      author: 'US Army',
      license: 'public domain',
    },
    steps: [
      {
        screen: 'Find the bleed. Expose the limb.',
        voice:
          'Find where the bright red bleeding comes from and expose it. A tourniquet is a last resort, for an arm or leg, when a pressure dressing has failed to stop the bleeding.',
        manual:
          'The tourniquet should not be used unless a pressure dressing has failed to stop the bleeding or an arm or leg has been cut off.',
      },
      {
        screen: 'Band above the wound. Wrap and tie tight.',
        voice:
          'Place a band at least two inches wide around the limb, between the wound and the heart, never over a wound, a fracture, or a joint. Tie a half-knot, place a stick on top, and tie a full knot over the stick.',
        manual:
          'Place the tourniquet around the limb, between the wound and the body trunk (or between the wound and the heart). Never place it directly over a wound, a fracture, or joint. Tie a half-knot. Place a stick (or similar rigid object) on top of the half-knot. Tie a full knot over the stick.',
        figure: require('../../assets/coach/steps/tourniquet_2.jpg'),
      },
      {
        screen: 'Twist until bleeding stops. Tie off the stick.',
        voice:
          'Twist the stick until the tourniquet is tight around the limb and the bright red bleeding has stopped. Loop the free ends over the stick and tie them on the side of the limb, so it cannot unwind.',
        manual:
          'Twist the stick until the tourniquet is tight around the limb and/or the bright red bleeding has stopped. Fasten the tourniquet to the limb by looping the free ends of the tourniquet over the ends of the stick. Then bring the ends around the limb to prevent the stick from loosening. Tie them together on the side of the limb.',
        figure: require('../../assets/coach/steps/tourniquet_4.jpg'),
      },
      {
        screen: 'Leave in full view. Mark a T and the time.',
        voice:
          'Check that the bright red bleeding has stopped. Leave the tourniquet in full view and mark the forehead with a T and the time. Once applied, it stays on until medical care takes over; loosening it can restart bleeding and lead to shock.',
        manual:
          'DO NOT loosen or release a tourniquet after it has been applied as release could precipitate bleeding and potentially lead to shock. Mark the casualty’s forehead with a “T” and the time.',
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
