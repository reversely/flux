/**
 * Aeonik is a commercial font, so its binaries stay out of this public repo.
 * scripts/sync-fonts.mjs (postinstall) copies the weights from the local
 * machine when present and writes fonts.generated.ts; with no fonts installed
 * the map stays empty and every role falls back to the system font at an
 * equivalent weight.
 */
import type { TextStyle } from 'react-native';

import { fontMap } from './fonts.generated';

export const fontAssets = fontMap;

const aeonikInstalled = Object.keys(fontMap).length > 0;

const systemWeights: Record<AeonikWeight, TextStyle['fontWeight']> = {
  light: '300',
  regular: '400',
  medium: '500',
};

type AeonikWeight = 'light' | 'regular' | 'medium';

const familyNames: Record<AeonikWeight, string> = {
  light: 'Aeonik-Light',
  regular: 'Aeonik-Regular',
  medium: 'Aeonik-Medium',
};

export function aeonikFace(weight: AeonikWeight): TextStyle {
  if (aeonikInstalled) {
    return { fontFamily: familyNames[weight] };
  }
  return { fontWeight: systemWeights[weight] };
}

export const monoFamily = 'Menlo';
