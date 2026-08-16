import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import * as Device from 'expo-device';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mapTranscript } from '@/api/speech';
import type { WalkObservation, WalkQuestion, WalkSessionState } from '@/api/types';
import { useHoldToTalk, useNarration } from '@/api/voice';
import { MushroomDiagram } from '@/components/MushroomDiagram';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

const SCOPE_BANNER_MS = 6000;

/**
 * One session over an identification walk (PRD 1.4, 1.5): the camera opens
 * with the question and stays open until it resolves. The current node
 * renders as a card over the feed with its reference diagram beside it, the
 * match count holds a corner, and answered nodes collapse to a summary. The
 * server's list is the authority; this screen only asks and reports.
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
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [walk, setWalk] = useState<WalkSessionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showScope, setShowScope] = useState(true);
  const [reviewing, setReviewing] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setShowScope(false), SCOPE_BANNER_MS);
    return () => clearTimeout(timer);
  }, []);

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

  // The current node: the server's next question, or the first unanswered one
  // when a replayed transcript leaves the pointer unset.
  const current: WalkQuestion | undefined =
    walk?.question ??
    walk?.questions.find((q) => (selected.get(q.character) ?? []).length === 0);
  const answered = (walk?.questions ?? []).filter(
    (q) => (selected.get(q.character) ?? []).length > 0,
  );

  // Camera mode narrates the current question so hands and eyes can stay on
  // the specimen; the text-only flow stays silent. Narration prefers the
  // box's Kokoro voice through the server and falls back to on-device
  // speech when the server has no speech backend (#155).
  const narration = useNarration();
  const narrate = useCallback(
    (question: WalkQuestion) =>
      narration.speak(`${question.question} Options: ${question.states.join(', ')}.`),
    [narration],
  );
  const spokenCharacter = current?.character;
  useEffect(() => {
    if (!wantCamera || current === undefined) {
      return;
    }
    void narrate(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spokenCharacter, wantCamera]);

  // Push-to-talk (#155): while the chip is held down, int16 PCM streams to
  // WS /v1/speech/stream and partials land on screen; release ends the
  // utterance and the final transcript passes the same exact gate as the
  // server's mapping. Recording pauses narration, so the mic never hears
  // the app's own voice (the #74 turn-taking rule).
  const [heard, setHeard] = useState<string | null>(null);

  // The camera answer (#130): a three-second condition clip goes to the
  // box VLM, which suggests one of the node's own states. The suggestion
  // prefills; only a confirming tap writes the transcript.
  const cameraRef = useRef<CameraView>(null);
  const [observing, setObserving] = useState(false);
  const [suggestion, setSuggestion] = useState<WalkObservation | null>(null);

  const observe = async () => {
    if (walk === null || current === undefined || cameraRef.current === null) {
      return;
    }
    setSuggestion(null);
    setObserving(true);
    narration.stop();
    try {
      const recording = cameraRef.current.recordAsync({ maxDuration: 3 });
      const video = await recording;
      if (video === undefined) {
        setObserving(false);
        return;
      }
      const observed = await client().observeWalkthrough(
        walk.session_id,
        current.character,
        video.uri,
      );
      setSuggestion(observed);
      if (observed.state !== undefined && observed.state !== null) {
        void narration.speak(
          `Looks ${observed.state}. ${observed.observation} Confirm?`,
        );
      } else {
        void narration.speak('Not clearly visible. ' + (current.capture_condition ?? ''));
      }
    } catch {
      setHeard('The camera check needs the server.');
    } finally {
      setObserving(false);
    }
  };

  const applyTranscript = async (text: string) => {
    if (walk === null || current === undefined) {
      return;
    }
    const mapped = mapTranscript(text, current.states);
    if (mapped.action === 'answer') {
      setHeard(null);
      await toggle(current.character, mapped.state);
    } else if (mapped.action === 'skip') {
      setHeard(null);
      setBusy(true);
      try {
        setWalk(await client().answerWalkthrough(walk.session_id, current.character, []));
      } catch {
        setMessage('The server did not answer. Please check the connection and try again.');
      } finally {
        setBusy(false);
      }
    } else if (mapped.action === 'undo') {
      setHeard(null);
      setBusy(true);
      try {
        setWalk(await client().undoWalkthrough(walk.session_id));
      } catch {
        setMessage('The server did not answer. Please check the connection and try again.');
      } finally {
        setBusy(false);
      }
    } else if (mapped.action === 'repeat') {
      setHeard(null);
      void narrate(current);
    } else {
      setHeard(`"${text}" — say a listed option`);
    }
  };

  const talk = useHoldToTalk({
    onPartial: setHeard,
    onFinal: (text) => void applyTranscript(text),
    onProblem: (kind) =>
      setHeard(kind === 'denied' ? 'Mic off. Allow the microphone.' : 'Voice needs the server'),
  });

  const startListening = async () => {
    narration.stop();
    setHeard('Listening');
    await talk.start();
  };

  const stateChips = (question: WalkQuestion) => (
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
  );

  return (
    <View style={[styles.screen, useCamera && styles.screenDark]}>
      {useCamera && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing="back"
          mute
        />
      )}
      <TopBar title="Mushrooms" back dark={useCamera} />

      {showScope && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Answer what you can see. Each feature narrows the matches.
          </Text>
        </View>
      )}

      {anySelected && walk && (
        <View style={[styles.countCorner, { top: insets.top + sizes.topBar + spacing.m }]}>
          <Text style={styles.countText}>{walk.candidate_count} match</Text>
          <Tag label={`${walk.danger_count} dangerous`} tone="red" />
        </View>
      )}

      {wantCamera && Device.isDevice && permission !== null && !permission.granted && (
        <Pressable style={styles.cameraAsk} onPress={() => void requestPermission()}>
          <Text style={typography.annotation}>Camera off. Tap to allow.</Text>
        </Pressable>
      )}

      <View style={styles.spacer} />

      {/* The node's reference figure sits beside the feed, so the user
          compares the specimen against the manual's drawing in place. */}
      {walk && current !== undefined && !reviewing && (
        <View style={styles.figureCard}>
          <MushroomDiagram character={current.character} />
        </View>
      )}

      <View style={[styles.dock, useCamera && styles.dockOverCamera]}>
        {message !== null && <Text style={styles.helper}>{message}</Text>}

        {walk && current !== undefined && !reviewing && (
          <View style={styles.nodeCard}>
            <Text style={typography.surfaceTitle}>{current.question}</Text>
            {stateChips(current)}
            <Text style={typography.annotation}>{current.citation}</Text>
            {useCamera &&
              (current.answer_source === 'both' || current.answer_source === 'camera') && (
                <View style={styles.observeRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Check with the camera"
                    disabled={observing}
                    onPress={() => void observe()}
                    style={[styles.observeButton, observing && styles.observeButtonBusy]}
                  >
                    <Feather name="camera" size={16} color={colors.card} />
                    <Text style={styles.observeButtonText}>
                      {observing ? 'Checking' : 'Check with camera'}
                    </Text>
                  </Pressable>
                  <Text style={[typography.annotation, styles.heard]} numberOfLines={2}>
                    {observing
                      ? (suggestion?.cause ?? 'checking')
                      : (current.capture_condition ?? '')}
                  </Text>
                </View>
              )}
            {suggestion !== null && (
              <View style={styles.suggestionRow}>
                {suggestion.state != null ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Confirm ${suggestion.state}`}
                    disabled={busy}
                    onPress={() => {
                      setSuggestion(null);
                      void toggle(suggestion.character, suggestion.state!);
                    }}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionChipText}>
                      {suggestion.state} · {Math.round(suggestion.confidence * 100)}% — confirm
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={typography.annotation}>Not clearly visible. Adjust and retry.</Text>
                )}
                <Text style={typography.annotation} numberOfLines={2}>
                  {suggestion.observation}
                </Text>
              </View>
            )}
            {wantCamera && (
              <View style={styles.voiceRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={talk.listening ? 'Release to answer' : 'Hold to answer by voice'}
                  onPressIn={() => void startListening()}
                  onPressOut={talk.stop}
                  style={[styles.micButton, talk.listening && styles.micButtonLive]}
                >
                  <Feather
                    name="mic"
                    size={18}
                    color={talk.listening ? colors.card : colors.ink}
                  />
                </Pressable>
                <Text style={[typography.annotation, styles.heard]} numberOfLines={2}>
                  {heard ?? 'Hold. Say an option.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {walk && current === undefined && !reviewing && (
          <View style={styles.nodeCard}>
            <Text style={typography.surfaceTitle}>Every feature answered</Text>
            <Text style={typography.annotation}>
              {walk.candidate_count} match, {walk.danger_count} dangerous
            </Text>
          </View>
        )}

        {reviewing && walk && (
          <ScrollView style={styles.review} contentContainerStyle={styles.reviewContent}>
            {answered.map((question) => (
              <View key={question.character} style={styles.nodeCard}>
                <Text style={typography.surfaceTitle}>{question.question}</Text>
                {stateChips(question)}
              </View>
            ))}
            {answered.length === 0 && (
              <Text style={typography.annotation}>Nothing answered yet.</Text>
            )}
          </ScrollView>
        )}

        <View style={styles.controlRow}>
          {anySelected && (
            <Pressable
              disabled={busy}
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: '/mushrooms',
                  params: { answers: JSON.stringify(Object.fromEntries(selected)) },
                })
              }
            >
              <Text style={typography.button}>See the matches</Text>
            </Pressable>
          )}
          {answered.length > 0 && (
            <Pressable
              disabled={busy}
              style={styles.secondaryButton}
              onPress={() => setReviewing((v) => !v)}
            >
              <Text style={styles.secondaryButtonText}>
                {reviewing ? 'Back to the question' : `Answered (${answered.length})`}
              </Text>
            </Pressable>
          )}
          <Pressable disabled={busy} style={styles.secondaryButton} onPress={() => void start()}>
            <Text style={styles.secondaryButtonText}>Start over</Text>
          </Pressable>
        </View>
        <Text style={typography.annotation}>Tool for reference only.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  screenDark: {
    backgroundColor: '#000000',
  },
  spacer: {
    flex: 1,
  },
  banner: {
    marginHorizontal: spacing.l,
    marginTop: spacing.s,
    backgroundColor: colors.panelNavy,
    borderRadius: radius.control,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
  },
  bannerText: {
    ...typography.annotation,
    color: colors.card,
  },
  countCorner: {
    position: 'absolute',
    right: spacing.l,
    alignItems: 'flex-end',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.s,
  },
  countText: {
    ...typography.listBody,
    color: colors.ink,
  },
  cameraAsk: {
    margin: spacing.l,
    padding: spacing.m,
    borderRadius: radius.control,
    backgroundColor: colors.signatureSoft,
  },
  dock: {
    padding: spacing.l,
    gap: spacing.m,
  },
  dockOverCamera: {
    backgroundColor: 'rgba(242, 244, 245, 0.94)',
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
  },
  nodeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.m,
  },
  figureCard: {
    alignSelf: 'flex-start',
    marginLeft: spacing.l,
    marginBottom: spacing.s,
    padding: spacing.s,
    borderRadius: radius.control,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  review: {
    maxHeight: 280,
  },
  reviewContent: {
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
  observeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  observeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: sizes.chip,
    borderRadius: radius.chip,
    backgroundColor: colors.signature,
    paddingHorizontal: spacing.m,
  },
  observeButtonBusy: {
    opacity: 0.6,
  },
  observeButtonText: {
    ...typography.listBody,
    color: colors.card,
  },
  suggestionRow: {
    gap: spacing.xs,
  },
  suggestionChip: {
    alignSelf: 'flex-start',
    height: sizes.chip,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.signature,
    backgroundColor: colors.signatureSoft,
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
  },
  suggestionChipText: {
    ...typography.listBody,
    color: colors.ink,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  micButton: {
    width: sizes.control,
    height: sizes.control,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.steel[2],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  micButtonLive: {
    backgroundColor: colors.signature,
    borderColor: colors.signature,
  },
  heard: {
    flex: 1,
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
