import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useVideoWidgets, type VideoWidget, type VideoWidgetKind } from '@/data/widgets';
import { darkHome } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

const KIND_ICON: Record<VideoWidgetKind, FeatherName> = {
  walk: 'crosshair',
  coach: 'target',
  vss: 'cloud',
  trail: 'film',
};

// How many panels a group shows on home; the rest live behind its All
// link, which opens the camera hub's full list.
const SHOWCASE = 2;

function Panel({ widget, wide }: { widget: VideoWidget; wide?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={widget.title}
      onPress={() =>
        router.push({
          pathname: widget.route.pathname as never,
          params: widget.route.params ?? {},
        })
      }
      style={({ pressed }) => [styles.panel, wide && styles.panelWide, pressed && styles.panelPressed]}
    >
      <Text style={styles.panelTitle} numberOfLines={1}>
        {widget.title}
      </Text>
      <Text style={styles.panelLine} numberOfLines={2}>
        {widget.line}
      </Text>
    </Pressable>
  );
}

/**
 * The video-widget showcase: each category leads with its two panels and
 * an All link into the camera hub's complete list, so home reads as a
 * shelf, never an inventory.
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
            <View style={styles.headerSpace} />
            {group.widgets.length > SHOWCASE && (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`All ${group.widgets.length} ${group.title.toLowerCase()}`}
                onPress={() => router.push('/capture')}
                hitSlop={8}
              >
                <Text style={styles.allLink}>All {group.widgets.length}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.panelRow}>
            {group.widgets.slice(0, SHOWCASE).map((widget) => (
              <Panel
                key={widget.id}
                widget={widget}
                wide={group.widgets.length === 1}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  group: {
    gap: spacing.s,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  headerSpace: {
    flex: 1,
  },
  groupTitle: {
    ...typography.annotation,
    color: darkHome.ink2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  allLink: {
    ...typography.annotation,
    color: darkHome.link,
  },
  panelRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  panel: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.l,
    borderRadius: radius.surface,
    backgroundColor: 'rgba(230, 237, 242, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
  },
  panelWide: {
    flex: 1,
  },
  panelPressed: {
    backgroundColor: 'rgba(230, 237, 242, 0.12)',
  },
  panelTitle: {
    ...typography.listBody,
    color: darkHome.ink,
  },
  panelLine: {
    ...typography.annotation,
    color: darkHome.ink3,
  },
});
