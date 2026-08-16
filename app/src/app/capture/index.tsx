import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { PROCEDURES } from '@/data/coach';
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
export default function CameraHub() {
  const { prime, subject } = useLocalSearchParams<{ prime?: string; subject?: string }>();
  const router = useRouter();
  const connection = useSession((s) => s.connection);

  return (
    <View style={dark.screen}>
      <PageBackdrop />
      <TopBar title="Camera" back dark />
      <ScrollView contentContainerStyle={styles.list}>
        <ModeCard icon="target" title="Coach" line="Camera watches. Steps advance as you work.">
          <View style={styles.chipRow}>
            {PROCEDURES.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                onPress={() => router.push(`/coach/${p.id}`)}
                style={({ pressed }) => [dark.chip, pressed && styles.chipPressed]}
              >
                <Text style={dark.chipText}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        </ModeCard>
        <ModeCard
          icon="crosshair"
          title="Identify"
          line="One photo. Species and lookalikes."
          onPress={() => router.push('/capture/identify')}
        />
        <ModeCard
          icon="cloud"
          title="Read the sky"
          line="What the weather will do next."
          onPress={() => router.push('/vss/weather')}
        />
        <ModeCard
          icon="compass"
          title="Find direction"
          line="A bearing from the stars or a shadow."
          onPress={() => router.push('/vss/celestial')}
        />
        <ModeCard
          icon="film"
          title="Record trail"
          line="Continuous clips to the server. Ask about them later."
          onPress={() =>
            router.push({
              pathname: '/capture/trail',
              params: { prime: prime ?? '', subject: subject ?? '' },
            })
          }
        >
          {connection !== 'connected' && <Tag label="Needs a server connection" tone="yellow" />}
        </ModeCard>
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
