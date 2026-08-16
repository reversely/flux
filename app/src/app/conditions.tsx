import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { localBaseline } from '@/data/vss';
import { cardinal, useConditions } from '@/store/conditions';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { spacing } from '@/theme/tokens';

type FeatherName = ComponentProps<typeof Feather>['name'];

interface Reading {
  icon: FeatherName;
  label: string;
  /** The measurement. */
  value: string;
  /** What it means for the user. This is the point of the row. */
  means: string;
  tone?: TagTone;
}

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
  const readings: Reading[] = [];

  if (c.pressureTrend !== undefined && c.pressure !== undefined) {
    readings.push({
      icon: 'trending-down',
      label: `${Math.round(c.pressure)} hPa, ${c.pressureTrend}`,
      value:
        c.pressureTrend === 'falling'
          ? 'Weather turning'
          : c.pressureTrend === 'rising'
            ? 'Weather improving'
            : 'Holding steady',
      means:
        c.pressureTrend === 'falling'
          ? 'Falling pressure runs ahead of wind and rain. Set up shelter while it is dry.'
          : c.pressureTrend === 'rising'
            ? 'Rising pressure runs ahead of fair weather. Good window to travel or dry gear.'
            : 'No pressure change worth acting on yet.',
      tone: c.pressureTrend === 'falling' ? 'yellow' : undefined,
    });
  }

  if (c.daylight !== undefined) {
    const hours = Math.floor(Math.abs(c.daylight.remainingMinutes) / 60);
    const minutes = Math.abs(c.daylight.remainingMinutes) % 60;
    const before = c.daylight.remainingMinutes > 0;
    readings.push({
      icon: 'sun',
      label: `sunset ${c.daylight.sunset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
      value: before ? `${hours}h ${minutes}m of light` : 'Dark now',
      means: before
        ? c.daylight.remainingMinutes < 120
          ? 'Under two hours. Make camp and gather firewood now, not later.'
          : 'Enough light to travel or build.'
        : 'Shelter and fire before anything else.',
      tone: before && c.daylight.remainingMinutes < 120 ? 'yellow' : undefined,
    });
  }

  if (c.heading !== undefined) {
    readings.push({
      icon: 'compass',
      label: `${Math.round(c.heading)} degrees magnetic`,
      value: `Facing ${cardinal(c.heading)}`,
      means: 'Magnetic, not true. Check it against the sun or the stars before you commit.',
    });
  }

  const altitude = c.position?.altitude ?? c.relativeAltitude;
  // Exactly zero with no barometer is an unknown reading, not sea level.
  if (altitude !== undefined && (altitude !== 0 || c.relativeAltitude !== undefined)) {
    const feet = Math.round(altitude * 3.28084);
    readings.push({
      icon: 'triangle',
      label: `${Math.round(altitude)} m, about ${feet} ft`,
      value: feet > 5000 ? 'Boil three minutes' : 'Boil one minute',
      means:
        feet > 5000
          ? 'Above 5,000 feet water boils cooler, so it needs the longer boil.'
          : 'Below 5,000 feet a one minute rolling boil is enough.',
    });
  }

  if (c.position !== undefined) {
    const baseline = localBaseline(c.position.lat, c.position.lon, new Date().getMonth() + 1);
    if (baseline !== undefined) {
      readings.push({
        icon: 'bar-chart-2',
        label: baseline.station,
        value: 'Normal for here',
        means: baseline.line,
      });
    }
  }

  // A negative level means the platform does not know, which the simulator
  // reports as -1; a wrong number here is worse than no row.
  if (c.battery !== undefined && c.battery.level >= 0) {
    const percent = Math.round(c.battery.level * 100);
    readings.push({
      icon: 'battery',
      label: `${percent}%${c.battery.charging ? ', charging' : ''}`,
      value: percent < 25 ? 'Power is short' : 'Power is fine',
      means:
        percent < 25
          ? 'Drop the camera work and keep the map and compass. Low power mode helps.'
          : 'Enough for camera sessions.',
      tone: percent < 25 ? 'yellow' : undefined,
    });
  }

  readings.push({
    icon: c.online === true ? 'wifi' : 'wifi-off',
    label: c.online === true ? 'network reachable' : 'no network',
    value: c.online === true ? 'Online' : 'Offline',
    means:
      c.online === true
        ? 'Source links open. The box can answer if it is on this network.'
        : 'Everything on this screen still works. Source links wait for a connection.',
  });

  return (
    <View style={dark.screen}>
      <PageBackdrop />
      <TopBar title="Conditions" back dark />
      <ScrollView contentContainerStyle={styles.body}>
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
  body: { padding: spacing.l, gap: spacing.m },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: { marginTop: 2 },
  rowBody: { flex: 1, gap: spacing.xs },
  rowHead: { gap: 2 },
});
