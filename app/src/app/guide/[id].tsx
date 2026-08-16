import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { type Guide, type GuideCandidate, guideById, narrow } from '@/data/synoptic';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

/**
 * One guide, walked a node at a time (PRD 1.4). The reference picture leads,
 * the question is a fragment, and the source sits under every node with the
 * full list linked at the foot. A process node asks whether a step is done; an
 * identification node asks one trait and narrows the candidates below it.
 */
export default function GuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = id === undefined ? undefined : guideById(id);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (guide === undefined) {
    return (
      <View style={styles.screen}>
        <TopBar title="Guide" back />
        <Text style={styles.pad}>No guide by that name</Text>
      </View>
    );
  }

  const node = guide.nodes[step];
  const done = node === undefined;
  const matches = guide.form === 'identification' ? narrow(guide, answers) : [];

  return (
    <View style={styles.screen}>
      <TopBar title={guide.title} back />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={typography.annotation}>{guide.scope}</Text>

        <View style={styles.dots}>
          {guide.nodes.map((n, i) => (
            <View key={n.id} style={[styles.dot, i <= step && styles.dotOn]} />
          ))}
        </View>

        {done ? (
          <View style={styles.card}>
            <Text style={typography.surfaceTitle}>
              {guide.form === 'process' ? 'Done' : `${matches.length} match`}
            </Text>
            <Pressable style={styles.secondary} onPress={() => { setStep(0); setAnswers({}); }}>
              <Text style={styles.secondaryText}>Start over</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {node.image !== undefined && <Image source={node.image} style={styles.figure} />}
            <Text style={typography.surfaceTitle}>{node.ask}</Text>
            {node.cue !== undefined && <Text style={typography.annotation}>{node.cue}</Text>}

            {node.wait !== undefined && <Countdown seconds={node.wait} />}

            {node.states === undefined ? (
              <View style={styles.row}>
                <Pressable style={styles.primary} onPress={() => setStep(step + 1)}>
                  <Text style={typography.button}>Done</Text>
                </Pressable>
                {step > 0 && (
                  <Pressable style={styles.secondary} onPress={() => setStep(step - 1)}>
                    <Text style={styles.secondaryText}>Back</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={styles.row}>
                {node.states.map((state) => (
                  <Pressable
                    key={state}
                    style={styles.chip}
                    onPress={() => {
                      setAnswers({ ...answers, [node.trait ?? node.id]: state });
                      setStep(step + 1);
                    }}
                  >
                    <Text style={styles.chipText}>{state}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={typography.annotation}>{node.cite}</Text>
          </View>
        )}

        {guide.form === 'identification' && Object.keys(answers).length > 0 && (
          <MatchList matches={matches} />
        )}

        <Sources guide={guide} />
      </ScrollView>
    </View>
  );
}

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      return;
    }
    timer.current = setInterval(() => setLeft((v) => (v <= 1 ? 0 : v - 1)), 1000);
    return () => {
      if (timer.current !== null) {
        clearInterval(timer.current);
      }
    };
  }, [running]);

  const label = useMemo(() => {
    const m = Math.floor(left / 60);
    const s = left % 60;
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  }, [left]);

  return (
    <Pressable style={styles.timer} onPress={() => setRunning((v) => !v)}>
      <Feather name={running ? 'pause' : 'clock'} size={16} color={colors.signature} />
      <Text style={styles.timerText}>{left === 0 ? 'Time is up' : label}</Text>
    </Pressable>
  );
}

function MatchList({ matches }: { matches: GuideCandidate[] }) {
  return (
    <View style={styles.matches}>
      <Text style={typography.annotation}>{matches.length} match</Text>
      {matches.slice(0, 4).map((m) => (
        <View key={m.name} style={styles.matchCard}>
          {m.image !== undefined && <Image source={m.image} style={styles.matchImage} />}
          <View style={styles.matchBody}>
            <Text style={typography.surfaceTitle}>{m.name}</Text>
            <Text style={typography.annotation}>{m.means}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Sources({ guide }: { guide: Guide }) {
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesHead}>Sources</Text>
      {guide.sources.map((s, i) => (
        <Pressable key={s.id} onPress={() => void Linking.openURL(s.url)}>
          <Text style={styles.sourceLine}>
            [{i + 1}] {s.title}
          </Text>
          <Text style={typography.annotation}>{s.licence}</Text>
        </Pressable>
      ))}
      <Tag label="Reference only. The decision stays with you." tone="gray" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { ...typography.body, padding: spacing.l },
  body: { padding: spacing.l, gap: spacing.m },
  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.line,
  },
  dotOn: { backgroundColor: colors.signature },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.m,
  },
  figure: {
    width: '100%',
    height: 190,
    resizeMode: 'contain',
    borderRadius: radius.control,
    backgroundColor: colors.gray.softBg,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  primary: {
    height: sizes.control,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
  },
  secondary: {
    height: sizes.control,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.steel[2],
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
  },
  secondaryText: { ...typography.listBody, color: colors.ink },
  chip: {
    height: sizes.chip,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.steel[1],
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
  },
  chipText: { ...typography.listBody, color: colors.ink },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    alignSelf: 'flex-start',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.signature,
    paddingHorizontal: spacing.m,
    height: sizes.chip,
  },
  timerText: { ...typography.listBody, color: colors.signature },
  matches: { gap: spacing.s },
  matchCard: {
    flexDirection: 'row',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.m,
  },
  matchImage: { width: 72, height: 72, borderRadius: radius.control },
  matchBody: { flex: 1, gap: spacing.xs },
  sources: { gap: spacing.xs, marginTop: spacing.l },
  sourcesHead: {
    ...typography.annotation,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sourceLine: { ...typography.listBody, color: colors.signature },
});
