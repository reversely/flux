import * as Device from 'expo-device';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WalkEdibility, WalkSessionState, WalkSpeciesCard } from '@/api/types';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

const edibilityTone: Record<WalkEdibility, TagTone> = {
  danger: 'red',
  caution: 'orange',
  inedible: 'gray',
  edible: 'green',
  unknown: 'gray',
};

function attribution(card: WalkSpeciesCard): string {
  const page = card.source_title.replace(/ /g, '_');
  return `en.wikipedia.org/wiki/${page} · rev ${card.source_revid} · CC BY-SA`;
}

function SpeciesRow({ card }: { card: WalkSpeciesCard }) {
  return (
    <View style={styles.speciesRow}>
      <View style={styles.speciesName}>
        <Text style={typography.listBody}>{card.species}</Text>
        <Text style={typography.annotation}>{attribution(card)}</Text>
      </View>
      <Tag label={card.edibility} tone={edibilityTone[card.edibility]} />
    </View>
  );
}

/**
 * The mushroom walkthrough (#87): one observable-feature question per step
 * against the server's walk session. Every answer is the user's confirmed
 * observation; the danger card stays visible whenever dangerous candidates
 * remain, and the verdict lists candidates with their guide attribution
 * rather than a safety claim.
 */
export default function Walkthrough() {
  const { client } = useSession();
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
          state = await client().answerWalkthrough(state.session_id, character, answer);
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

  const send = async (call: () => Promise<WalkSessionState>) => {
    setBusy(true);
    try {
      setWalk(await call());
    } catch {
      setMessage('The server did not answer. Please check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const wantCamera = camera === '1';
  const useCamera = wantCamera && Device.isDevice && permission?.granted === true;
  const question = walk?.question;

  return (
    <View style={styles.screen}>
      <TopBar title="Mushrooms" back />
      {useCamera && (
        <CameraView style={styles.preview} mode="picture" facing="back" mute />
      )}
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
            <View style={styles.countRow}>
              <Text style={typography.surfaceTitle}>
                {walk.candidate_count} possible
              </Text>
              <Tag label={`${walk.danger_count} to avoid`} tone="red" />
            </View>
            {walk.danger_species && walk.danger_species.length > 0 && (
              <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>Still possible. Do not eat.</Text>
                {walk.danger_species.map((card) => (
                  <SpeciesRow key={card.species} card={card} />
                ))}
              </View>
            )}
            {question && (
              <View style={styles.questionCard}>
                <Text style={typography.surfaceTitle}>{question.question}</Text>
                <View style={styles.stateWrap}>
                  {question.states.map((state) => (
                    <Pressable
                      key={state}
                      disabled={busy}
                      style={styles.stateChip}
                      onPress={() =>
                        void send(() =>
                          client().answerWalkthrough(
                            walk.session_id,
                            question.character,
                            state,
                          ),
                        )
                      }
                    >
                      <Text style={styles.stateChipText}>{state}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={typography.annotation}>{question.citation}</Text>
              </View>
            )}
            {walk.complete && walk.candidates && (
              <View style={styles.questionCard}>
                <Text style={typography.surfaceTitle}>Matches from your answers</Text>
                {walk.candidates.map((card) => (
                  <SpeciesRow key={card.species} card={card} />
                ))}
              </View>
            )}
            <View style={styles.controlRow}>
              {question && (
                <Pressable
                  disabled={busy}
                  style={styles.secondaryButton}
                  onPress={() =>
                    void send(() =>
                      client().answerWalkthrough(walk.session_id, question.character, null),
                    )
                  }
                >
                  <Text style={styles.secondaryButtonText}>Not sure, skip</Text>
                </Pressable>
              )}
              {walk.answers.length > 0 && (
                <Pressable
                  disabled={busy}
                  style={styles.secondaryButton}
                  onPress={() => void send(() => client().undoWalkthrough(walk.session_id))}
                >
                  <Text style={styles.secondaryButtonText}>Back one step</Text>
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
    height: 220,
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
  dangerCard: {
    backgroundColor: '#F7E3E1',
    borderRadius: radius.surface,
    borderWidth: 1,
    borderColor: '#E5B5B0',
    padding: spacing.l,
    gap: spacing.s,
  },
  dangerTitle: {
    ...typography.surfaceTitle,
    color: '#8C3730',
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
  stateChipText: {
    ...typography.listBody,
    color: colors.ink,
  },
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
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
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
  },
  speciesName: {
    flexShrink: 1,
    gap: 2,
  },
  helper: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
