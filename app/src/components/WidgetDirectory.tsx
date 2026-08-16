import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useVideoWidgets, type VideoWidgetKind } from '@/data/widgets';
import { darkHome } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

const KIND_ICON: Record<VideoWidgetKind, FeatherName> = {
  walk: 'crosshair',
  coach: 'target',
  vss: 'cloud',
  trail: 'film',
};

/**
 * The video-widget directory: every camera surface from the registry,
 * grouped by kind, launchable in one tap. Rendered on the home scroll so
 * nothing hides behind the chat face.
 */
export function WidgetDirectory() {
  const router = useRouter();
  const groups = useVideoWidgets();

  return (
    <View style={styles.wrap}>
      {groups.map((group) => (
        <View key={group.kind} style={styles.group}>
          <View style={styles.groupHeader}>
            <Feather name={KIND_ICON[group.kind]} size={14} color={darkHome.ink2} />
            <Text style={styles.groupTitle}>{group.title}</Text>
          </View>
          {group.widgets.map((widget) => (
            <Pressable
              key={widget.id}
              accessibilityRole="button"
              accessibilityLabel={widget.title}
              onPress={() =>
                router.push({
                  pathname: widget.route.pathname as never,
                  params: widget.route.params ?? {},
                })
              }
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{widget.title}</Text>
                <Text style={styles.rowLine}>{widget.line}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={darkHome.ink3} />
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.l,
    alignSelf: 'stretch',
  },
  group: {
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.xs,
  },
  groupTitle: {
    ...typography.annotation,
    color: darkHome.ink2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.control,
    backgroundColor: 'rgba(230, 237, 242, 0.06)',
  },
  rowPressed: {
    backgroundColor: 'rgba(230, 237, 242, 0.12)',
  },
  rowText: {
    gap: 2,
    flexShrink: 1,
  },
  rowTitle: {
    ...typography.listBody,
    color: darkHome.ink,
  },
  rowLine: {
    ...typography.annotation,
    color: darkHome.ink3,
  },
});
