/**
 * Biome derivation from the scroll-journey-world skill: one accent in, six
 * environmental roles out, mixed in sRGB against one shared deep base so
 * every colour on the dark home screen has the same black in its blood
 * (colour-theory depth-palette ladder). Values feed both RN styles and the
 * Skia shader uniforms, so this module is the single mirror.
 */

const DEEP_TOP = '#0B1118';
const DEEP_BASE = '#060A0D';

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

function mix(a: string, b: string, t: number): string {
  const c = [0, 1, 2].map((i) =>
    Math.round(channel(a, i) * (1 - t) + channel(b, i) * t),
  );
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface Biome {
  top: string;
  bottom: string;
  glow: string;
  fog: string;
  terrain: string;
  mote: string;
}

export function biomeFor(accent: string): Biome {
  return {
    top: mix(accent, DEEP_TOP, 0.72),
    bottom: mix(accent, DEEP_BASE, 0.88),
    glow: mix(accent, '#FFFFFF', 0.2),
    fog: mix(accent, DEEP_BASE, 0.8),
    terrain: mix(accent, DEEP_BASE, 0.82),
    mote: mix(accent, '#FFFFFF', 0.35),
  };
}

/** Hand-tuned arrival biome (the skill reserves home for art direction). */
export const HOME_BIOME: Biome = {
  ...biomeFor('#35576B'),
  glow: '#8FC6BF',
  mote: '#B5E3DC',
};

/** Text and surface tiers shared across biomes (they never carry the hue). */
export const darkHome = {
  field: DEEP_TOP,
  surface: 'rgba(13, 20, 28, 0.72)',
  ink: '#E6EDF2',
  ink2: '#AFC0CB',
  ink3: '#7F929E',
  line: 'rgba(230, 237, 242, 0.10)',
  link: mix('#35576B', '#FFFFFF', 0.55),
} as const;

/** Shader uniform form: 0-1 float triples. */
export function rgb(hex: string): number[] {
  return [0, 1, 2].map((i) => channel(hex, i) / 255);
}
