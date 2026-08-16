import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WalkSessionState } from '@/api/types';
import { MushroomDiagram } from '@/components/MushroomDiagram';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

/**
 * The mushroom survey: one visual form over the walk session, and only the
 * form. The emphasis is the per-part guides (diagram, question, states);
 * no species list renders here. The count row stays compact, and See
 * matches opens the catalog filtered by the current answers.
 */
export default function Walkthrough() {
  const { client } = useSession();
  const router = useRouter();
  // A launch may carry a transcript to replay, `answers=char=state,...`:
  // sessions are deterministic, so a replayed link reopens the same walk.
  // `camera=1` opens the preview; the default is the text-only ask.
  const { answers: replay, camera } = useLocalSearchParams<{
    answers?: string;
    camera?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [walk, setWalk] = useState<WalkSessionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = async () => {
    setMessage(null);
    setBusy(true);
    try {
      let state = await client().createWalkthrough();
      for (const pair of (replay ?? '').split(',')) {
        const [character, answer] = pair.split('=');
        if (character && answer) {
          state = await client().answerWalkthrough(state.session_id, character, [answer]);
        }
      }
      setWalk(state);
    } catch {
      setMessage(
        'The server has no walkthrough pack. Please connect on the Server screen first.',
      );
    } finally {
      setBusy(false);
    }
  };

  // A changed replay link restarts the walk; determinism makes that safe.
  useEffect(() => {
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay]);

  const selected = new Map<string, string[]>(
    (walk?.answers ?? []).map((a) => [a.character, a.states ?? []]),
  );

  const toggle = async (character: string, state: string) => {
    if (walk === null) {
      return;
    }
    const current = selected.get(character) ?? [];
    const next = current.includes(state)
      ? current.filter((s) => s !== state)
      : [...current, state];
    setBusy(true);
    try {
      setWalk(await client().answerWalkthrough(walk.session_id, character, next));
    } catch {
      setMessage('The server did not answer. Please check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const anySelected = [...selected.values()].some((states) => states.length > 0);
  const wantCamera = camera === '1';
  const useCamera = wantCamera && Device.isDevice && permission?.granted === true;

  // Camera mode narrates the next unanswered question so hands and eyes can
  // stay on the specimen; the text-only flow stays silent.
  const spokenCharacter = walk?.question?.character;
  useEffect(() => {
    if (!wantCamera || walk === null) {
      return;
    }
    const question = walk.questions.find((q) => q.character === spokenCharacter);
    if (question) {
      Speech.stop();
      Speech.speak(`${question.question} Options: ${question.states.join(', ')}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spokenCharacter, wantCamera]);
  useEffect(() => () => void Speech.stop(), []);

  return (
    <View style={styles.screen}>
      <TopBar title="Mushrooms" back />
      {useCamera && <CameraView style={styles.preview} mode="picture" facing="back" mute />}
      {wantCamera && Device.isDevice && permission !== null && !permission.granted && (
        <Pressable style={styles.cameraAsk} onPress={() => void requestPermission()}>
          <Text style={typography.annotation}>
            Camera off. Tap to allow and keep the mushroom in view.
          </Text>
        </Pressable>
      )}
      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        {message !== null && <Text style={styles.helper}>{message}</Text>}
        {walk && (
          <>
            {anySelected ? (
              <View style={styles.countRow}>
                <Text style={typography.surfaceTitle}>
                  {walk.candidate_count} kinds match
                </Text>
                <Tag label={`${walk.danger_count} dangerous`} tone="red" />
              </View>
            ) : (
              <Text style={typography.body}>
                Select what you can see. The matches narrow with each feature.
              </Text>
            )}
            {walk.questions.map((question) => (
              <View key={question.character} style={styles.questionCard}>
                <MushroomDiagram character={question.character} />
                <Text style={typography.surfaceTitle}>{question.question}</Text>
                <View style={styles.stateWrap}>
                  {question.states.map((state) => {
                    const active = (selected.get(question.character) ?? []).includes(state);
                    return (
                      <Pressable
                        key={state}
                        disabled={busy}
                        style={[styles.stateChip, active && styles.stateChipActive]}
                        onPress={() => void toggle(question.character, state)}
                      >
                        <Text style={[styles.stateChipText, active && styles.stateChipTextActive]}>
                          {state}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={typography.annotation}>{question.citation}</Text>
              </View>
            ))}
            <View style={styles.controlRow}>
              {anySelected && (
                <Pressable
                  disabled={busy}
                  style={styles.primaryButton}
                  onPress={() =>
                    router.push({
                      pathname: '/mushrooms',
                      params: {
                        answers: JSON.stringify(Object.fromEntries(selected)),
                      },
                    })
                  }
                >
                  <Text style={typography.button}>See the matches</Text>
                </Pressable>
              )}
              <Pressable disabled={busy} style={styles.secondaryButton} onPress={() => void start()}>
                <Text style={styles.secondaryButtonText}>Start over</Text>
              </Pressable>
            </View>
            <Text style={typography.annotation}>
              Reference only. The decision stays with you.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  preview: {
    height: 200,
  },
  cameraAsk: {
    padding: spacing.m,
    backgroundColor: colors.signatureSoft,
  },
  panel: {
    flex: 1,
  },
  panelContent: {
    padding: spacing.l,
    gap: spacing.m,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.m,
  },
  stateWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  stateChip: {
    height: sizes.chip,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.steel[1],
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  stateChipActive: {
    backgroundColor: colors.signature,
    borderColor: colors.signature,
  },
  stateChipText: {
    ...typography.listBody,
    color: colors.ink,
  },
  stateChipTextActive: {
    color: colors.card,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  primaryButton: {
    height: sizes.control,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
  },
  secondaryButton: {
    height: sizes.control,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.steel[2],
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    ...typography.listBody,
    color: colors.ink,
  },
  helper: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
