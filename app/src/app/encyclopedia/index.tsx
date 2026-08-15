import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { TILES, type EncyclopediaTile } from '@/data/encyclopedia';
import { colors, radius, spacing, typography } from '@/theme/tokens';

function TileCard({ tile }: { tile: EncyclopediaTile }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tile.title}
      onPress={() => router.push(`/encyclopedia/${tile.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Feather name={tile.icon} size={18} color={colors.signature} />
        <Text style={[typography.annotation, styles.tileNumber]}>{tile.id}</Text>
      </View>
      <Text style={typography.surfaceTitle}>{tile.title}</Text>
      <Text style={[typography.annotation, styles.scope]} numberOfLines={2}>
        {tile.scope}
      </Text>
    </Pressable>
  );
}

export default function Encyclopedia() {
  return (
    <View style={styles.screen}>
      <TopBar title="Encyclopedia" back />
      <FlatList
        data={TILES}
        keyExtractor={(tile) => String(tile.id)}
        renderItem={({ item }) => <TileCard tile={item} />}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  grid: {
    padding: spacing.l,
    gap: spacing.m,
  },
  row: {
    gap: spacing.m,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.xs,
  },
  cardPressed: {
    backgroundColor: colors.signatureSoft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  tileNumber: {
    color: colors.ink3,
  },
  scope: {
    marginTop: spacing.xs,
  },
});
