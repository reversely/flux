import { Feather } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, sizes, spacing, typography } from '@/theme/tokens';

/**
 * A book-style table of contents, shared by the app's directory screens:
 * numeral in the display face, title, a dotted leader, and the row's mark.
 * Each directory picks its own paper via `tint` so an index reads as a
 * different material than a working surface, and every directory in the
 * app lays out the same way.
 */

export interface DirectoryEntry {
  id: string;
  /** The printed numeral: a chapter or tile number. */
  number: string;
  title: string;
  /** One fragment under the title; omitted rows stay single-line. */
  detail?: string;
  icon?: keyof typeof Feather.glyphMap;
}

export interface DirectoryTint {
  background: string;
  line: string;
}

export const PARCHMENT: DirectoryTint = {
  background: colors.parchment,
  line: colors.parchmentLine,
};

function Leader({ color }: { color: string }) {
  return <View style={[styles.leader, { borderBottomColor: color }]} />;
}

export function DirectoryRow({
  entry,
  onPress,
  tint = PARCHMENT,
}: {
  entry: DirectoryEntry;
  onPress: (entry: DirectoryEntry) => void;
  tint?: DirectoryTint;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry.title}
      onPress={() => onPress(entry)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: tint.line },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.numeralCell}>
        <Text style={[typography.displaySmall, styles.numeral]}>{entry.number}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={typography.surfaceTitle}>{entry.title}</Text>
          <Leader color={tint.line} />
          {entry.icon !== undefined && (
            <View style={styles.iconCell}>
              <Feather name={entry.icon} size={15} color={colors.ink3} />
            </View>
          )}
        </View>
        {entry.detail !== undefined && (
          <Text style={typography.annotation} numberOfLines={2}>
            {entry.detail}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function DirectoryList({
  entries,
  onPress,
  tint = PARCHMENT,
  header,
}: {
  entries: DirectoryEntry[];
  onPress: (entry: DirectoryEntry) => void;
  tint?: DirectoryTint;
  header?: React.ReactElement;
}) {
  return (
    <FlatList
      style={{ backgroundColor: tint.background }}
      data={entries}
      keyExtractor={(entry) => entry.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <DirectoryRow entry={item} onPress={onPress} tint={tint} />}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.l,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.l,
    paddingVertical: spacing.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowPressed: {
    opacity: 0.6,
  },
  // A fixed cell with tabular figures keeps every numeral column flush and
  // on the title's baseline, whatever the digit count or the row's icon.
  numeralCell: {
    width: 44,
    alignItems: 'flex-end',
  },
  numeral: {
    color: colors.signature,
    fontVariant: ['tabular-nums'],
    lineHeight: 22,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    minHeight: sizes.chip,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.s,
  },
  iconCell: {
    alignSelf: 'center',
    width: 18,
    alignItems: 'center',
  },
  leader: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: 'dotted',
    marginBottom: 4,
  },
});
