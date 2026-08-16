import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { darkHome } from '@/theme/biome';

/**
 * Web build of the home backdrop (#173): Skia's shader runtime never loads
 * on web (no CanvasKit setup), and its module crashes the router's node
 * prerender, so web renders the biome field as a flat color instead.
 */
export function HomeBackdrop(_props: { scrollY: SharedValue<number> }) {
  return <View pointerEvents="none" style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkHome.field,
  },
});
