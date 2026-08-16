import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { DirectoryList, PARCHMENT } from '@/components/Directory';
import { TopBar } from '@/components/TopBar';
import { TILES } from '@/data/encyclopedia';
import { spacing, typography } from '@/theme/tokens';

/**
 * The encyclopedia's table of contents, in the shared book-directory style
 * (components/Directory.tsx) on the warm paper shade: numeral, title,
 * dotted leader, tile icon. One row per tile, in priority order.
 */
export default function Encyclopedia() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <TopBar title="Encyclopedia" back />
      <DirectoryList
        entries={TILES.map((tile) => ({
          id: String(tile.id),
          number: String(tile.id),
          title: tile.title,
          detail: tile.scope,
          icon: tile.icon,
        }))}
        onPress={(entry) => router.push(`/encyclopedia/${entry.id}`)}
        header={<Text style={[typography.annotation, styles.contents]}>Contents</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PARCHMENT.background,
  },
  contents: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.s,
  },
});
