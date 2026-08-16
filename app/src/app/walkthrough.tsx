import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import * as Device from 'expo-device';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mapTranscript } from '@/api/speech';
import type { WalkObservation, WalkQuestion, WalkSessionState } from '@/api/types';
import { useNarration, useOpenMic } from '@/api/voice';
import { cycleLines, useWatchLoop } from '@/live/watch';
// One labeled anatomy diagram per fungi node, the asked region shaded.
// A character with no entry (spore print, every berry node) shows no
// figure rather than a wrong drawing.
const NODE_FIGURES: Record<string, ImageSourcePropType> = {
  capShape: require('../../assets/images/mushrooms/cao.png'),
  hymeniumType: require('../../assets/images/mushrooms/margin.png'),
  whichGills: require('../../assets/images/mushrooms/gills.png'),
  stipeCharacter: require('../../assets/images/mushrooms/stem.png'),
  ecologicalType: require('../../assets/images/mushrooms/hyphae.png'),
};
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

const SCOPE_BANNER_MS = 6000;

// Continuous watch (#208): the camera records chunks of this length the
// whole session; the decision layer chooses which chunks are worth the box.
const WATCH_CHUNK_S = 3;
// Observe on the box typically answers within this; the cycle readout sets
// the expectation and flags a slow answer past double.
const EXPECTED_READ_S = 8;
// The same verdict kind is spoken at most once per this window, so a
// continuous loop stays a conversation rather than a nag.
const SPEAK_REPEAT_MS = 12000;

// Result ordering and tones: the worst verdict sorts first.
const SEVERITY = ['danger', 'caution', 'inedible', 'edible', 'unknown'] as const;
const EDIBILITY_TONE: Record<(typeof SEVERITY)[number], TagTone> = {
  danger: 'red',
  caution: 'yellow',
  inedible: 'gray',
  edible: 'green',
  unknown: 'gray',
};

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
  const { answers: replay, camera, guide } = useLocalSearchParams<{
    answers?: string;
    camera?: string;
    guide?: string;
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
      let state = await client().createWalkthrough(guide || undefined);
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
      const updated = await client().answerWalkthrough(walk.session_id, character, next);
      setWalk(updated);
      if (wantCamera) {
        void narration.speak(
          `Marked ${next.length > 0 ? next.join(', ') : 'skipped'}. ` +
            `${updated.candidate_count} match, ${updated.danger_count} dangerous.` +
            (updated.question === undefined ? ' Every feature answered.' : ''),
        );
      }
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
  // The capture has two visibly different phases: the camera filming the
  // three-second clip, then the box model reading it. Each gets its own
  // banner state, so the user always knows what is happening to the video.
  const [observePhase, setObservePhase] = useState<'idle' | 'filming' | 'checking'>('idle');
  const [suggestion, setSuggestion] = useState<WalkObservation | null>(null);

  // Continuous watch on the shared skeleton (#208, #213): the loop, the
  // standard gates, and the cycle readout live in useWatchLoop; this
  // surface supplies only its own gates and its upload handler. The refs
  // mirror render state for the loop, which outlives any one render.
  const walkRef = useRef<WalkSessionState | null>(null);
  const currentRef = useRef<WalkQuestion | undefined>(undefined);
  const suggestionRef = useRef<WalkObservation | null>(null);
  const lastSpokenRef = useRef<{ kind: string; at: number }>({ kind: '', at: 0 });
  walkRef.current = walk;
  suggestionRef.current = suggestion;
  currentRef.current = current;

  const speakOnce = (kind: string, line: string) => {
    const last = lastSpokenRef.current;
    if (last.kind === kind && Date.now() - last.at < SPEAK_REPEAT_MS) {
      return;
    }
    lastSpokenRef.current = { kind, at: Date.now() };
    void narration.speak(line);
  };

  // This surface's own gates; the standard gates (one in flight,
  // steadiness) belong to the skeleton.
  const decide = (): string | null => {
    const question = currentRef.current;
    if (question === undefined) {
      return 'every feature answered';
    }
    if (question.answer_source !== 'both' && question.answer_source !== 'camera') {
      return 'this one needs your answer — say it or tap';
    }
    const pending = suggestionRef.current;
    if (pending?.state != null && pending.off_subject !== true) {
      return 'waiting — say yes, or dismiss';
    }
    return null;
  };

  const handleVerdict = (observed: WalkObservation, question: WalkQuestion) => {
    if (currentRef.current?.character !== question.character) {
      return; // The walk moved on while the model was reading.
    }
    setSuggestion(observed);
    if (observed.off_subject === true) {
      speakOnce('off', `That is not the specimen. Seeing ${observed.observation}`);
    } else if (observed.state != null) {
      speakOnce(
        `state:${observed.state}`,
        `Looks ${observed.state}. ${observed.observation} Say yes to mark it, or keep showing me.`,
      );
    } else {
      speakOnce(
        'unsure',
        `Not clear yet. ${question.capture_condition ?? 'Show it closer.'}`,
      );
    }
  };

  const sendChunk = async (uri: string) => {
    const question = currentRef.current;
    const sessionId = walkRef.current?.session_id;
    if (question === undefined || sessionId === undefined) {
      return;
    }
    const observed = await client().observeWalkthrough(
      sessionId,
      question.character,
      uri,
    );
    handleVerdict(observed, question);
  };

  const watchLoop = useWatchLoop({
    cameraRef,
    chunkSeconds: WATCH_CHUNK_S,
    decide,
    send: sendChunk,
  });
  const watching = watchLoop.cycle.watching;
  const startWatching = watchLoop.start;
  const stopWatching = watchLoop.stop;

  // Watching starts by itself in camera mode: the session is hands-free by
  // default, and the toggle in the card pauses it.
  useEffect(() => {
    if (useCamera && walk !== null) {
      void startWatching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCamera, walk === null]);

  // A finished walk ends the loop; any narration stops with the screen.
  useEffect(() => {
    if (watchLoop.cycle.skipReason === 'every feature answered') {
      stopWatching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchLoop.cycle.skipReason]);
  useEffect(
    () => () => narration.stop(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const observe = async () => {
    if (walk === null || current === undefined || cameraRef.current === null) {
      return;
    }
    if (watchLoop.isWatching()) {
      // The loop owns the camera; clearing the verdict lets it resume.
      setSuggestion(null);
      return;
    }
    setSuggestion(null);
    setObserving(true);
    setObservePhase('filming');
    narration.stop();
    try {
      const recording = cameraRef.current.recordAsync({ maxDuration: 3 });
      const video = await recording;
      if (video === undefined) {
        setObserving(false);
        setObservePhase('idle');
        return;
      }
      setObservePhase('checking');
      const observed = await client().observeWalkthrough(
        walk.session_id,
        current.character,
        video.uri,
      );
      setSuggestion(observed);
      if (observed.off_subject === true) {
        void narration.speak(`That is not the specimen. Seeing ${observed.observation}`);
      } else if (observed.state !== undefined && observed.state !== null) {
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
      setObservePhase('idle');
    }
  };

  const applyTranscript = async (text: string) => {
    if (walk === null || current === undefined) {
      return;
    }
    // A pending camera verdict takes "yes" as its confirmation (#208), so
    // the spoken loop closes without a tap.
    const pending = suggestion;
    if (
      pending?.state != null &&
      pending.off_subject !== true &&
      /^(yes|yeah|yep|confirm|mark( it)?|ok(ay)?)\b/i.test(text.trim())
    ) {
      setHeard(null);
      setSuggestion(null);
      await toggle(pending.character, pending.state);
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
      setHeard(`"${text}" — checking`);
      try {
        const meant = await client().interpretWalkthrough(walk.session_id, text);
        if (meant.state != null && meant.character === current.character) {
          setHeard(null);
          void narration.speak(`Heard ${meant.observation || meant.state}.`);
          await toggle(current.character, meant.state);
          return;
        }
      } catch {
        // The interpreter needs the server; the exact gate already ran.
      }
      setHeard(`"${text}" — say a listed option`);
    }
  };

  // One mode (#213): in camera mode the mic is open for the whole session
  // and utterances are processed as spoken; it mutes itself while the walk
  // narrates, so the loop never hears its own voice.
  const talk = useOpenMic({
    enabled: useCamera,
    isMuted: narration.isSpeaking,
    onPartial: setHeard,
    onFinal: (text) => void applyTranscript(text),
    onProblem: (kind) =>
      setHeard(kind === 'denied' ? 'Mic off. Allow the microphone.' : 'Voice needs the server'),
  });

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
          onCameraReady={() => {
            if (walkRef.current !== null) {
              void startWatching();
            }
          }}
        />
      )}
      <TopBar title={walk?.guide_title ?? 'Mushrooms'} back dark={useCamera} />

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
          compares the specimen against the drawing in place. */}
      {walk && current !== undefined && !reviewing && NODE_FIGURES[current.character] && (
        <View style={styles.figureCard}>
          <Image
            source={NODE_FIGURES[current.character]}
            style={styles.figureImage}
            resizeMode="contain"
          />
        </View>
      )}

      {/* The camera-check status banner: filming, then the model reading,
          then the verdict with its actions. It sits over the feed just above
          the dock, so what is happening to the video is never a mystery. */}
      {useCamera && (
        <View style={styles.observeStatus}>
          {suggestion === null && (
            <>
              {/* Always stoppable: the status row is the stop. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={watching ? 'Stop watching' : 'Resume watching'}
                onPress={() => (watching ? stopWatching() : void startWatching())}
                style={styles.observeStatusRow}
              >
                {watchLoop.cycle.reading || observePhase === 'checking' ? (
                  <ActivityIndicator size="small" color="#B5E3DC" />
                ) : (
                  <View style={[styles.recordDot, !watching && styles.recordDotOff]} />
                )}
                <Text style={styles.observeStatusTitle}>
                  {observePhase === 'filming'
                    ? 'Filming · 3 s clip'
                    : observePhase === 'checking'
                      ? 'Clip → cosmos on the box'
                      : watching
                        ? 'Watching · tap to stop'
                        : 'Paused · tap to watch'}
                </Text>
              </Pressable>
              {watching && observePhase === 'idle' && (
                <Text style={styles.observeStatusBody}>
                  {
                    cycleLines(watchLoop.cycle, {
                      chunkSeconds: WATCH_CHUNK_S,
                      expectedReadSeconds: EXPECTED_READ_S,
                    }).primary
                  }
                </Text>
              )}
            </>
          )}
          {observePhase === 'idle' && suggestion !== null && (
            <>
              <Text
                style={[
                  styles.observeStatusTitle,
                  suggestion.off_subject === true && styles.observeStatusWarn,
                ]}
              >
                {suggestion.off_subject === true
                  ? 'Not the specimen'
                  : suggestion.state != null
                    ? `Looks ${suggestion.state} · ${Math.round(suggestion.confidence * 100)}%`
                    : 'Not clearly visible'}
              </Text>
              <Text style={styles.observeStatusBody} numberOfLines={3}>
                {suggestion.off_subject === true
                  ? `Camera sees: ${suggestion.observation}`
                  : suggestion.state != null
                    ? suggestion.observation
                    : (current?.capture_condition ?? 'Adjust the framing and retake.')}
              </Text>
              <View style={styles.observeActions}>
                {suggestion.state != null && suggestion.off_subject !== true && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Confirm ${suggestion.state}`}
                    disabled={busy}
                    onPress={() => {
                      const confirmed = suggestion;
                      setSuggestion(null);
                      void toggle(confirmed.character, confirmed.state!);
                    }}
                    style={styles.observeAction}
                  >
                    <Feather name="check" size={14} color={colors.card} />
                    <Text style={styles.observeActionText}>Confirm {suggestion.state}</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retake the clip"
                  disabled={observing}
                  onPress={() => void observe()}
                  style={[
                    suggestion.state != null && suggestion.off_subject !== true
                      ? styles.observeActionGhost
                      : styles.observeAction,
                  ]}
                >
                  <Feather
                    name="refresh-ccw"
                    size={14}
                    color={
                      suggestion.state != null && suggestion.off_subject !== true
                        ? '#E6EDF2'
                        : colors.card
                    }
                  />
                  <Text
                    style={
                      suggestion.state != null && suggestion.off_subject !== true
                        ? styles.observeActionGhostText
                        : styles.observeActionText
                    }
                  >
                    {watching ? 'Keep looking' : 'Retake'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                  onPress={() => setSuggestion(null)}
                  style={styles.observeActionGhost}
                >
                  <Text style={styles.observeActionGhostText}>Dismiss</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      <View style={[styles.dock, useCamera && styles.dockOverCamera]}>
        {message !== null && <Text style={styles.helper}>{message}</Text>}

        {walk && current !== undefined && !reviewing && (
          <View style={styles.nodeCard}>
            <Text style={typography.surfaceTitle}>{current.question}</Text>
            {stateChips(current)}
            <Text style={typography.annotation}>{current.citation}</Text>
            {useCamera && current.capture_condition != null && (
              <Text style={typography.annotation}>{current.capture_condition}</Text>
            )}
            {wantCamera && (
              <View style={styles.voiceRow}>
                {/* Passive: the mic is always open; the icon lights while an
                    utterance streams. No button to hold. */}
                <View style={[styles.micButton, talk.listening && styles.micButtonLive]}>
                  <Feather
                    name="mic"
                    size={18}
                    color={talk.listening ? colors.card : colors.ink}
                  />
                </View>
                <Text style={[typography.annotation, styles.heard]} numberOfLines={2}>
                  {heard ?? 'Just talk. Say an option, or yes.'}
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
            {/* The verdict list in place (#136 spirit): danger rows first,
                so the reason not to eat leads the result. */}
            {walk.candidates && walk.candidates.length > 0 && (
              <ScrollView style={styles.resultList}>
                {[...walk.candidates]
                  .sort(
                    (a, b) =>
                      SEVERITY.indexOf(a.edibility) - SEVERITY.indexOf(b.edibility),
                  )
                  .map((card) => (
                    <View key={card.species} style={styles.resultRow}>
                      <Text style={typography.listBody} numberOfLines={1}>
                        {card.common_name
                          ? `${card.common_name} (${card.species})`
                          : card.species}
                      </Text>
                      <Tag label={card.edibility} tone={EDIBILITY_TONE[card.edibility]} />
                    </View>
                  ))}
              </ScrollView>
            )}
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
                  params: {
                    answers: JSON.stringify(Object.fromEntries(selected)),
                    ...(walk?.guide_id
                      ? { guide: walk.guide_id, title: walk.guide_title ?? '' }
                      : {}),
                  },
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
  // The diagrams are portrait scans (~5:6); contain keeps the labels legible.
  figureImage: {
    width: 150,
    height: 180,
  },
  resultList: {
    maxHeight: 260,
    marginTop: spacing.s,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
    paddingVertical: spacing.xs,
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
  observeStatus: {
    marginHorizontal: spacing.l,
    marginBottom: spacing.s,
    padding: spacing.m,
    borderRadius: radius.control,
    backgroundColor: 'rgba(6, 10, 13, 0.88)',
    gap: spacing.xs,
  },
  observeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E4574A',
  },
  recordDotOff: {
    backgroundColor: '#6B7680',
  },
  observeStatusTitle: {
    ...typography.listBody,
    color: '#F2F4F5',
  },
  observeStatusWarn: {
    color: '#FFB3A8',
  },
  observeStatusBody: {
    ...typography.annotation,
    color: '#C7D0D6',
  },
  observeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  observeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: sizes.chip,
    borderRadius: radius.chip,
    backgroundColor: colors.signature,
    paddingHorizontal: spacing.m,
  },
  observeActionText: {
    ...typography.listBody,
    color: colors.card,
  },
  observeActionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: sizes.chip,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(230, 237, 242, 0.5)',
    paddingHorizontal: spacing.m,
  },
  observeActionGhostText: {
    ...typography.listBody,
    color: '#E6EDF2',
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
