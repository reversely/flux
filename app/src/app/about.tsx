import { Feather } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { dark } from '@/theme/dark';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { radius, spacing } from '@/theme/tokens';

type Link = { label: string; route: Href };

interface Mechanism {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  /** Field-guide fragment: what this mechanism is. */
  line: string;
  /** One short paragraph: how it actually works. */
  how: string;
  demo: Link;
  more: Link[];
  source: string;
}

/**
 * The three mechanisms behind every LifeKit surface (PRD 1.6-1.8), each
 * with a live demo entry. This page is the product explained once: every
 * camera or map screen in the app is one of these three shapes.
 */
const MECHANISMS: Mechanism[] = [
  {
    id: 'process',
    icon: 'tool',
    title: 'Process',
    line: 'VSS walks you through doing a thing.',
    how:
      'A tourniquet, a knot, a fire. The camera watches your hands one clip at a ' +
      'time; the step advances when the model sees it done. Voice carries each ' +
      'step and the manual detail while the box reads. Ask anything mid-task — ' +
      'inference answers aloud.',
    demo: {
      label: 'Improvised tourniquet',
      route: { pathname: '/coach/[knot]', params: { knot: 'tourniquet' } },
    },
    more: [
      { label: 'Bowline', route: { pathname: '/coach/[knot]', params: { knot: 'bowline' } } },
      {
        label: 'Build a fire',
        route: { pathname: '/coach/[knot]', params: { knot: 'fire-tepee' } },
      },
    ],
    source: 'FM 4-25.11 · FM 21-76 · public domain',
  },
  {
    id: 'identify',
    icon: 'search',
    title: 'Identify',
    line: 'VSS runs a checklist and checks it with its own eyes.',
    how:
      'Plants, mushrooms, berries, the sky. One question per feature; the camera ' +
      'takes one look per question and suggests an answer with what it saw — you ' +
      'confirm before anything counts. Dangerous lookalikes stay on screen until ' +
      'ruled out. Point at the wrong thing and it says so.',
    demo: {
      label: 'Mushrooms, by camera',
      route: { pathname: '/walkthrough', params: { camera: '1' } },
    },
    more: [
      {
        label: 'Berries',
        route: { pathname: '/walkthrough', params: { camera: '1', guide: 'berry-edibility' } },
      },
      { label: 'Read the sky', route: { pathname: '/sky' } },
    ],
    source: 'Mycomorphbox (CC BY-SA) · Piper & Beattie 1915 · NOAA normals',
  },
  {
    id: 'find',
    icon: 'map-pin',
    title: 'Find',
    line: 'Offline maps that remember what matters.',
    how:
      'Navigation without a network: bundled map tiles, your position, and notes ' +
      'pinned to places — the camp, the spring, the slope to avoid. Marks stay on ' +
      'the map so the way back is never from memory.',
    demo: { label: 'Open the map', route: { pathname: '/map' } },
    more: [],
    source: 'OpenStreetMap contributors · ODbL',
  },
];

export default function About() {
  const router = useRouter();
  return (
    <View style={dark.screen}>
      <TopBar title="How LifeKit works" back dark />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lede}>
          Everything runs on hardware you carry: the phone, a local server, one
          inference box. No network at answer time. Three mechanisms, every screen
          one of them.
        </Text>

        {MECHANISMS.map((m) => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Feather name={m.icon} size={18} color={HOME_BIOME.glow} />
              <Text style={styles.cardTitle}>{m.title}</Text>
            </View>
            <Text style={styles.cardLine}>{m.line}</Text>
            <Text style={styles.cardHow}>{m.how}</Text>
            <View style={styles.linkRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Demo: ${m.demo.label}`}
                onPress={() => router.push(m.demo.route)}
                style={styles.demoButton}
              >
                <Feather name="play" size={14} color={darkHome.field} />
                <Text style={styles.demoText}>{m.demo.label}</Text>
              </Pressable>
              {m.more.map((link) => (
                <Pressable
                  key={link.label}
                  accessibilityRole="button"
                  accessibilityLabel={link.label}
                  onPress={() => router.push(link.route)}
                  style={styles.moreButton}
                >
                  <Text style={styles.moreText}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.source}>{m.source}</Text>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the full reference"
          onPress={() => router.push('/reference')}
          style={styles.referenceRow}
        >
          <Feather name="book-open" size={16} color={darkHome.ink2} />
          <Text style={styles.referenceText}>
            Every answer cites its source. The full library is on board.
          </Text>
          <Feather name="chevron-right" size={16} color={darkHome.ink3} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.l,
    gap: spacing.l,
  },
  lede: {
    ...dark.body,
    color: darkHome.ink2,
    lineHeight: 21,
  },
  card: {
    backgroundColor: darkHome.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
    borderRadius: radius.surface,
    padding: spacing.l,
    gap: spacing.s,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  cardTitle: {
    ...dark.title,
    fontSize: 18,
  },
  cardLine: {
    ...dark.body,
    color: darkHome.ink,
  },
  cardHow: {
    ...dark.body,
    color: darkHome.ink2,
    fontSize: 13,
    lineHeight: 19,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: HOME_BIOME.glow,
    borderRadius: radius.control,
    paddingHorizontal: spacing.m,
    height: 34,
  },
  demoText: {
    ...dark.body,
    color: darkHome.field,
    fontWeight: '600',
    fontSize: 13,
  },
  moreButton: {
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: darkHome.line,
    borderRadius: radius.control,
    paddingHorizontal: spacing.m,
    height: 34,
  },
  moreText: {
    ...dark.body,
    fontSize: 13,
  },
  source: {
    ...dark.note,
    fontSize: 10,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.m,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
  },
  referenceText: {
    ...dark.body,
    flex: 1,
    fontSize: 13,
    color: darkHome.ink2,
  },
});
