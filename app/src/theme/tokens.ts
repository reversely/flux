/**
 * Light-enterprise design tokens, transcribed from the design system's
 * tokens.css (see docs/plans/mvp-roadmap-milestone-1.md, "Design language").
 * React Native has no CSS variables, so this module is the single source and
 * components import from here.
 */
import type { TextStyle } from 'react-native';

import { aeonikFace, monoFamily } from './fonts';

export const colors = {
  paper: '#F2F4F5',
  card: '#FFFFFF',
  ink: '#1C2B36',
  ink2: '#51626E',
  ink3: '#74858F',
  line: '#DFE5E9',
  // The one configurable brand slot; steel default until flux has a brand colour.
  signature: '#35576B',
  signatureSoft: '#E5EDF2',
  // Gold is the annotation budget: the selected joint's marker and nothing else.
  annotate: '#B07A10',
  gold: '#F2B21C',
  goldLine: '#C98D12',
  panelNavy: '#204052',
  steel: ['#C9D8E2', '#9DB8C8', '#6F93A8', '#45677C', '#2C4A5C'],
  gray: {
    softBg: '#FCFCFD',
    softBorder: '#ECECEE',
    subtle: '#A5A6AD',
    ink: '#3A3B42',
  },
} as const;

/** Tag palette from the design system; severity mapping resolves in #5. */
export const tagColors = {
  gray: { bg: '#ECEBE8', text: '#55555C' },
  blue: { bg: '#E3EBF3', text: '#2C4A6E' },
  green: { bg: '#E3EEE4', text: '#2F5E3C' },
  yellow: { bg: '#F5EDDC', text: '#7A5A18' },
  orange: { bg: '#F6E7DA', text: '#8A4B1F' },
  red: { bg: '#F7E3E1', text: '#8C3730' },
} as const;

/** 4px grid. */
export const spacing = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** Radius ladder descends with nesting. */
export const radius = { surface: 12, control: 8, chip: 6, tag: 4 } as const;

export const sizes = {
  control: 36,
  focalAction: 40,
  chip: 28,
  tag: 22,
  rowHeight: 44,
  topBar: 56,
} as const;

/** Type roles from the app-screens table. Aeonik when installed, system otherwise. */
export const typography: Record<string, TextStyle> = {
  pageTitle: { ...aeonikFace('medium'), fontSize: 24, lineHeight: 29, color: colors.ink },
  pageSummary: { ...aeonikFace('regular'), fontSize: 15, lineHeight: 23, color: colors.ink2 },
  surfaceTitle: { ...aeonikFace('medium'), fontSize: 17, color: colors.ink },
  body: { ...aeonikFace('regular'), fontSize: 15, lineHeight: 23, color: colors.ink2 },
  listBody: { ...aeonikFace('regular'), fontSize: 14, color: colors.ink },
  tag: { ...aeonikFace('medium'), fontSize: 12, lineHeight: 16 },
  focalStat: { ...aeonikFace('light'), fontSize: 32, lineHeight: 38, color: colors.ink },
  button: { ...aeonikFace('medium'), fontSize: 14, color: colors.card },
  annotation: { fontFamily: monoFamily, fontSize: 11, color: colors.ink3 },
};
