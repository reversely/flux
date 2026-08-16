import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme/tokens';

/**
 * The sources an entry draws on, as an inset grouped card of link rows at
 * the foot of the entry: the same documents the chat agent retrieves, so
 * a reader can open the file behind the text. A row without an href shows
 * its attribution without a chevron and does not press.
 */

export interface ReferenceRow {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  /** Attribution fragment under the title (`source-url · author · license`). */
  note?: string;
  /** In-app route the row opens; a row without one is display-only. */
  href?: string;
}

export function References({ rows }: { rows: ReferenceRow[] }) {
  const router = useRouter();
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={styles.group}>
      <Text style={[typography.annotation, styles.heading]}>References</Text>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 && <View style={styles.separator} />}
            <Pressable
              accessibilityRole={row.href === undefined ? undefined : 'link'}
              accessibilityLabel={row.title}
              disabled={row.href === undefined}
              onPress={row.href === undefined ? undefined : () => router.push(row.href as never)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconCell}>
                <Feather name={row.icon} size={16} color={colors.signature} />
              </View>
              <View style={styles.body}>
                <Text style={[typography.surfaceTitle, styles.title]}>{row.title}</Text>
                {row.note !== undefined && (
                  <Text style={typography.annotation} numberOfLines={2}>
                    {row.note}
                  </Text>
                )}
              </View>
              {row.href !== undefined && (
                <Feather name="chevron-right" size={16} color={colors.ink3} />
              )}
            </Pressable>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.s,
    marginTop: spacing.m,
  },
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: spacing.l,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginLeft: spacing.l + 16 + spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  rowPressed: {
    backgroundColor: colors.paper,
  },
  iconCell: {
    width: 16,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.signature,
  },
});
