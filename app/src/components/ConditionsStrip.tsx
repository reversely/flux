import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { buildReadings } from '@/data/conditions-readings';
import { useConditions } from '@/store/conditions';
import { darkHome } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

/**
 * The conditions readout on the home scroll: every reading the sensors
 * carry, compact, from the same builder as the full screen. Tapping a
 * chip opens the screen with the consequence lines.
 */
export function ConditionsStrip() {
  const router = useRouter();
  const readings = buildReadings(useConditions());
  if (readings.length === 0) {
    return null;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {readings.map((r) => (
        <Pressable
          key={r.label}
          accessibilityRole="button"
          accessibilityLabel={`${r.value}, ${r.label}`}
          onPress={() => router.push('/conditions')}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Feather name={r.icon} size={14} color={r.tone === 'yellow' ? darkHome.link : darkHome.ink2} />
          <View>
            <Text style={styles.value}>{r.value}</Text>
            <Text style={styles.label}>{r.label}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: spacing.s,
    paddingHorizontal: spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: radius.control,
    backgroundColor: 'rgba(230, 237, 242, 0.06)',
  },
  chipPressed: {
    backgroundColor: 'rgba(230, 237, 242, 0.12)',
  },
  value: {
    ...typography.listBody,
    color: darkHome.ink,
  },
  label: {
    ...typography.annotation,
    color: darkHome.ink3,
  },
});
