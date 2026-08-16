import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useVideoWidgets, type VideoWidgetKind } from '@/data/widgets';
import { useSession } from '@/store/session';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { spacing } from '@/theme/tokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

function ModeCard({
  icon,
  title,
  line,
  onPress,
  children,
}: {
  icon: FeatherName;
  title: string;
  line: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [dark.card, pressed && onPress !== undefined && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <Feather name={icon} size={18} color={darkHome.link} />
        <Text style={dark.title}>{title}</Text>
      </View>
      <Text style={dark.note}>{line}</Text>
      {children}
    </Pressable>
  );
}

/**
 * The camera hub: every camera use starts from a declared intent (PRD 1.2),
 * never a bare recorder. Chat tool launches land here with prime/subject
 * params, which pass through to the trail recorder.
 */
const KIND_ICON: Record<VideoWidgetKind, FeatherName> = {
  walk: 'crosshair',
  coach: 'target',
  vss: 'cloud',
  trail: 'film',
};

const GROUP_LINES: Record<VideoWidgetKind, string> = {
  walk: 'One question at a time. The checklist decides, you confirm.',
  coach: 'Camera watches. Steps advance as you work.',
  vss: 'Short clip. Spoken interview while it reads.',
  trail: 'Continuous clips to the server. Ask about them later.',
};

export default function CameraHub() {
  const { prime, subject } = useLocalSearchParams<{ prime?: string; subject?: string }>();
  const router = useRouter();
  const connection = useSession((s) => s.connection);
  const groups = useVideoWidgets();

  return (
    <View style={dark.screen}>
      <PageBackdrop />
      <TopBar title="Camera" back dark />
      <ScrollView contentContainerStyle={styles.list}>
        {/* Every card renders from the widget registry, so this hub and the
            home directory always list the same surfaces. */}
        {groups.map((group) => {
          const [first] = group.widgets;
          if (group.widgets.length === 1 && first !== undefined) {
            return (
              <ModeCard
                key={group.id}
                icon={KIND_ICON[group.kind]}
                title={first.title}
                line={first.line}
                onPress={() =>
                  router.push({
                    pathname: first.route.pathname as never,
                    params:
                      group.kind === 'trail'
                        ? { prime: prime ?? '', subject: subject ?? '' }
                        : (first.route.params ?? {}),
                  })
                }
              >
                {group.kind === 'trail' && connection !== 'connected' && (
                  <Tag label="Needs a server connection" tone="yellow" />
                )}
              </ModeCard>
            );
          }
          return (
            <ModeCard
              key={group.id}
              icon={KIND_ICON[group.kind]}
              title={group.title}
              line={GROUP_LINES[group.kind]}
            >
              <View style={styles.chipRow}>
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
                    style={({ pressed }) => [dark.chip, pressed && styles.chipPressed]}
                  >
                    <Text style={dark.chipText}>{widget.title}</Text>
                  </Pressable>
                ))}
              </View>
            </ModeCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  cardPressed: {
    backgroundColor: 'rgba(230, 237, 242, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  chipPressed: {
    backgroundColor: 'rgba(230, 237, 242, 0.12)',
  },
});
