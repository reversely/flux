import type { ImageSourcePropType } from 'react-native';

import normals from '../../assets/guides/climate-normals.json';

/**
 * VSS sessions follow one shape (PRD 1.6): a short clip of the conditions,
 * a spoken interview while the box infers, tappable options for every
 * question, then a result that leads with the implication, quotes the source
 * line behind it, and links the source deeply.
 *
 * The interview is not filler. Each question gathers something the clip
 * cannot show, so the answer ends up specific to this user, here, now.
 */

export interface VssSource {
  id: string;
  title: string;
  /** Deep link: a page in a document, a section anchor, a record. */
  url: string;
  licence: string;
}

export interface VssQuestion {
  id: string;
  /** Spoken and shown. One short question. */
  ask: string;
  options: string[];
  /** Why this is asked, one fragment, shown small. */
  because: string;
}

export interface VssFinding {
  /** Fires when every listed answer matches. */
  when: Record<string, string>;
  /** The consequence, in plain words. This is the answer. */
  means: string;
  /** Verbatim from the source, with its id. */
  quote: string;
  source: string;
  image?: ImageSourcePropType;
  /** A step whose completion is a wait, in seconds, shown as a timer. */
  wait?: number;
  /** What to do when the timer ends. */
  waitLabel?: string;
}

export interface VssSession {
  id: string;
  title: string;
  /** What the clip should show, spoken before recording. */
  capture: string;
  /** Seconds of video. Short: the model reads motion, not a film. */
  clipSeconds: number;
  questions: VssQuestion[];
  findings: VssFinding[];
  /** Shown when no finding matches, so the session never dead-ends. */
  fallback: VssFinding;
  sources: VssSource[];
}

const FAA: VssSource = {
  id: 'faa-phak-12',
  title: 'FAA Pilot Handbook, chapter 12, Weather Theory',
  url: 'https://www.faa.gov/sites/faa.gov/files/14_phak_ch12.pdf#page=5',
  licence: 'Public domain, US government work',
};

const FAA_CB: VssSource = {
  id: 'faa-phak-12-cb',
  title: 'FAA Pilot Handbook, chapter 12, thunderstorms',
  url: 'https://www.faa.gov/sites/faa.gov/files/14_phak_ch12.pdf#page=16',
  licence: 'Public domain, US government work',
};

const NOAA: VssSource = {
  id: 'noaa-ten-clouds',
  title: 'NOAA JetStream, the ten basic clouds',
  url: 'https://www.noaa.gov/jetstream/clouds/ten-basic-clouds',
  licence: 'Public domain, US government work',
};

const FM18: VssSource = {
  id: 'fm21-76-ch18',
  title: 'FM 21-76 Survival, chapter 18, field-expedient direction finding',
  url: 'https://commons.wikimedia.org/wiki/File:FM_21-76_Survival_June_1992.pdf?page=185',
  licence: 'Public domain, US government work',
};

const WEATHER: VssSession = {
  id: 'weather',
  title: 'What the weather will do',
  capture: 'Pan slowly across the sky, horizon to overhead.',
  clipSeconds: 4,
  questions: [
    {
      id: 'trend',
      ask: 'Sky thickening or clearing since you last looked?',
      options: ['thickening', 'clearing', 'no change'],
      because: 'Direction of change matters more than the sky right now.',
    },
    {
      id: 'wind',
      ask: 'Wind picked up or shifted?',
      options: ['picked up', 'shifted', 'steady'],
      because: 'A shift often arrives before the weather does.',
    },
    {
      id: 'halo',
      ask: 'Ring around the sun or moon?',
      options: ['yes', 'no'],
      because: 'A halo means ice cloud thickening overhead.',
    },
    {
      id: 'towers',
      ask: 'Any cloud growing tall and hard-edged?',
      options: ['yes', 'no'],
      because: 'Vertical growth is the thunderstorm signal.',
    },
  ],
  findings: [
    {
      when: { towers: 'yes' },
      means: 'Thunderstorm building. Get off ridges and open water, away from lone trees.',
      quote:
        'Cumulonimbus clouds contain large amounts of moisture and unstable air and usually produce hazardous weather phenomena, such as lightning, hail, tornadoes, gusty winds, and wind shear.',
      source: FAA_CB.id,
    },
    {
      when: { halo: 'yes', trend: 'thickening' },
      means: 'Rain or snow likely within a day. Set up shelter and water while it is dry.',
      quote:
        'Cirrostratus ... is distinguished by a halo phenomena nearly always produced around the Sun or Moon shining through a layer of cirrostratus.',
      source: NOAA.id,
    },
    {
      when: { trend: 'thickening', wind: 'shifted' },
      means: 'Front arriving. Expect wind and rain within hours.',
      quote:
        'Conversely, decreasing or rapidly falling pressure usually indicates approaching bad weather and, possibly, severe storms.',
      source: FAA.id,
    },
    {
      when: { trend: 'clearing' },
      means: 'Improving. Good window for travel or drying gear.',
      quote:
        'For example, tracking a pattern of rising pressure at a single weather station generally indicates the approach of fair weather.',
      source: FAA.id,
    },
  ],
  fallback: {
    when: {},
    means: 'No strong signal. Watch for thickening cloud or a wind shift, and check again in an hour.',
    quote:
      'Clouds in this family create low ceilings, hamper visibility, and can change rapidly.',
    source: FAA.id,
  },
  sources: [FAA, FAA_CB, NOAA],
};

const CELESTIAL: VssSession = {
  id: 'celestial',
  title: 'Find your direction',
  capture: 'Hold steady on the clearest part of the sky for a few seconds.',
  clipSeconds: 5,
  questions: [
    {
      id: 'time',
      ask: 'Day or night?',
      options: ['night', 'day'],
      because: 'Stars by night, shadows by day.',
    },
    {
      id: 'hemisphere',
      ask: 'North or south of the equator?',
      options: ['north', 'south', 'not sure'],
      because: 'The method changes at the equator.',
    },
    {
      id: 'seen',
      ask: 'What can you pick out?',
      options: ['big dipper', 'cassiopeia', 'southern cross', 'nothing yet'],
      because: 'Each shape points a different way.',
    },
  ],
  findings: [
    {
      when: { time: 'night', seen: 'big dipper' },
      means:
        'The two stars at the end of the cup point at the North Star, about five times their spacing. Face it: that is north.',
      quote:
        'The North Star is the last star of the Big Dipper handle. The two stars at the end of the Big Dipper bucket point to it.',
      source: FM18.id,
      image: require('../../assets/guides/sky-north-star-big-dipper-and-cassiopeia.jpg'),
    },
    {
      when: { time: 'night', seen: 'cassiopeia' },
      means:
        'Cassiopeia sits opposite the Big Dipper across the North Star. The middle star of its W points roughly north.',
      quote:
        'Cassiopeia has five stars that form a shape like a lopsided M or W on its side.',
      source: FM18.id,
      image: require('../../assets/guides/sky-north-star-big-dipper-and-cassiopeia.jpg'),
    },
    {
      when: { time: 'night', seen: 'southern cross' },
      means:
        'Run the long axis of the cross out about four and a half times its length. That point is south.',
      quote:
        'The Southern Cross ... an imaginary line ... will point toward the south.',
      source: FM18.id,
      image: require('../../assets/guides/sky-southern-cross.jpg'),
    },
    {
      when: { time: 'day' },
      means:
        'Push a stick upright. Mark the shadow tip now, wait, then mark it again. First mark is west, second is east, and you are facing north with west on your left.',
      wait: 900,
      waitLabel: 'Mark the shadow tip again, then stand with the first mark on your left.',
      quote:
        'The shadow-tip method ... the first mark is always west and the second mark is always east.',
      source: FM18.id,
      image: require('../../assets/guides/sky-shadow-tip-method.gif'),
    },
  ],
  fallback: {
    when: {},
    means:
      'Nothing to sight yet. Wait for a clear patch, or use a shadow once the sun is out.',
    quote: 'The shadow-tip method ... the first mark is always west and the second mark is always east.',
    source: FM18.id,
    image: require('../../assets/guides/sky-shadow-tip-method.gif'),
  },
  sources: [FM18],
};

export const VSS_SESSIONS: VssSession[] = [WEATHER, CELESTIAL];

export function vssById(id: string): VssSession | undefined {
  return VSS_SESSIONS.find((s) => s.id === id);
}

/** The first finding whose conditions all match the answers so far. */
export function findingFor(session: VssSession, answers: Record<string, string>): VssFinding {
  return (
    session.findings.find((f) =>
      Object.entries(f.when).every(([q, a]) => answers[q] === a),
    ) ?? session.fallback
  );
}

export function sourceById(session: VssSession, id: string): VssSource | undefined {
  return session.sources.find((s) => s.id === id);
}

export const NORMALS_SOURCE: VssSource = {
  id: 'noaa-normals',
  title: 'NOAA monthly climate normals, 1991 to 2020',
  url: 'https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/access/',
  licence: 'Public domain, US government work',
};

interface MonthNormal {
  m: number;
  wetDays: number | null;
  tavg: number | null;
  prcp: number | null;
}

interface StationNormal {
  id: string;
  name: string;
  lat: number;
  lon: number;
  months: MonthNormal[];
}

/**
 * What this place usually does this month, from the nearest station's
 * normals. The sky says what is coming; the base rate says how unusual that
 * is here, which is the difference between naming a cloud and forecasting.
 */
export function localBaseline(
  lat: number,
  lon: number,
  month: number,
): { station: string; line: string } | undefined {
  const stations = normals as StationNormal[];
  let best: StationNormal | undefined;
  let bestDistance = Infinity;
  for (const station of stations) {
    const distance = (station.lat - lat) ** 2 + (station.lon - lon) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  const record = best?.months.find((m) => m.m === month);
  if (best === undefined || record === undefined || record.wetDays === null) {
    return undefined;
  }
  const wet = record.wetDays;
  const usual =
    wet < 2 ? 'a dry month here' : wet < 6 ? 'a mixed month here' : 'a wet month here';
  return {
    station: best.name,
    line: `${usual}: about ${wet} days of rain in an average ${MONTHS[month - 1]}, ${record.tavg ?? '?'} degrees average.`,
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
