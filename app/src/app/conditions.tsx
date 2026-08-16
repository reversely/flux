import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { buildReadings, type Reading } from '@/data/conditions-readings';
import { useConditions } from '@/store/conditions';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { spacing } from '@/theme/tokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

function Row({ reading }: { reading: Reading }) {
  return (
    <View style={[dark.card, styles.row]}>
      <Feather name={reading.icon} size={18} color={darkHome.link} style={styles.icon} />
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={dark.title}>{reading.value}</Text>
          <Text style={dark.note}>{reading.label}</Text>
        </View>
        <Text style={dark.note}>{reading.means}</Text>
      </View>
      {reading.tone !== undefined && <Tag label="watch" tone={reading.tone} />}
    </View>
  );
}

/**
 * The control centre: every signal the phone can measure, each read for its
 * consequence. A sensor that is missing says so plainly rather than showing
 * a zero, since a wrong reading here is worse than a missing one.
 */
export default function ConditionsScreen() {
  const c = useConditions();
  const readings = buildReadings(c);

  const router = useRouter();
  return (
    <View style={dark.screen}>
      <PageBackdrop />
      <TopBar title="Conditions" back dark />
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Read the sky for the outlook"
          onPress={() => router.push('/sky')}
          style={styles.skyRow}
        >
          <Feather name="cloud" size={18} color={darkHome.ink} />
          <Text style={styles.skyRowText}>What's coming? Read the sky.</Text>
          <Feather name="chevron-right" size={18} color={darkHome.ink3} />
        </Pressable>
        {readings.map((r) => (
          <Row key={r.label} reading={r} />
        ))}
        {c.pressure === undefined && (
          <Text style={dark.note}>
            No barometer on this device, so pressure trend is missing. The weather session asks you
            instead.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  skyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 32, 48, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(140, 163, 184, 0.3)',
  },
  skyRowText: {
    flex: 1,
    color: darkHome.ink,
    fontSize: 16,
  },
  body: { padding: spacing.l, gap: spacing.m },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: { marginTop: 2 },
  rowBody: { flex: 1, gap: spacing.xs },
  rowHead: { gap: 2 },
});
