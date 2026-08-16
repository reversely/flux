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

const aeonikInstalled = 'Aeonik-Regular' in fontMap;
const argentInstalled = 'ArgentPixelCF-Italic' in fontMap;

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

/** Argent Pixel CF Italic, the display face for wordmarks and directory
 * numerals; a clone without it falls back to the system serif italic. */
export function displayFace(): TextStyle {
  if (argentInstalled) {
    return { fontFamily: 'ArgentPixelCF-Italic' };
  }
  return { fontStyle: 'italic', fontWeight: '600' };
}
