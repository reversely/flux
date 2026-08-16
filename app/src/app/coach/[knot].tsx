import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mapTranscript } from '@/api/speech';
import { useNarration, useOpenMic } from '@/api/voice';
import { stripMarkdown } from '@/components/AnswerText';
import { cycleLines, useWatchLoop } from '@/live/watch';
import { procedureById } from '@/data/coach';
import { useSession } from '@/store/session';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

// Short clips keep the watch loop close to the bench's 8 s chunks; the low
// bitrate matches capture.tsx's reasoning (the server samples ~8 frames).
const COACH_CLIP_SECONDS = 8;
const COACH_VIDEO_BITRATE = 1_000_000;
// Classification on the box typically answers within this; the cycle
// readout sets the expectation and flags a slow answer past double.
const EXPECTED_READ_S = 8;

type WatchState = 'off' | 'starting' | 'watching' | 'failed';

/**
 * Follow-along knot coach over the live camera. The camera center stays
 * clear (it is the user's workspace); the reference graphic sits small at
 * the top. WATCH streams short clips to /v1/coach/sessions/{id}/clip and the
 * server's pointer (#66) advances the step; the dots stay as manual
 * override. Narration is on-device speech until box TTS relays (#77/#80).
 */
export default function KnotCoach() {
  const { knot: knotId, step: stepParam } = useLocalSearchParams<{
    knot: string;
    step?: string;
  }>();
  const knot = procedureById(knotId ?? '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useSession((s) => s.client);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState(() => Number(stepParam) || 0);

  // Entering the screen narrates the current instruction once. The audio
  // mode must allow playback in silent mode first, or an iPhone with the
  // mute switch on narrates into nothing.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).then(() => speak(step));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A later link to the same screen updates the param without remounting.
  useEffect(() => {
    const wanted = Number(stepParam);
    if (!Number.isNaN(wanted)) {
      setStep(wanted);
    }
  }, [stepParam]);
  const [watch, setWatch] = useState<WatchState>('off');
  // Why the last watch attempt failed, small under the fragment; the same
  // failure lands in the traces tab with the full response.
  const [watchNote, setWatchNote] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  // The model's own account of the last clip: what it saw, and whether the
  // work was in frame at all. Shown under the fragment, so a model call is
  // never silent about what it looked at.
  const [seen, setSeen] = useState<string | null>(null);
  const [inFrame, setInFrame] = useState<boolean | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const wasOutOfFrameRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const pointerRef = useRef(0);
  // Wait coverage (PRD 1.6): while a chunk is with the model, the coach
  // reads the step's manual detail — once per step, not once per chunk.
  const stepRef = useRef(0);
  const coverSpokenForRef = useRef(-1);
  stepRef.current = step;

  // Narration goes through the box's Kokoro voice with the on-device
  // fallback (#180); the coach was the last screen on raw device speech.
  const narration = useNarration();
  const speak = useCallback(
    (index: number) => {
      if (knot === undefined) {
        return;
      }
      void narration.speak(knot.steps[index].voice);
    },
    [knot, narration],
  );

  const goTo = (index: number) => {
    setStep(index);
    speak(index);
  };

  // One chunk through the box: the server pointer decides the step, the
  // transparency fields say what the model saw, and off-subject clips get
  // one spoken nudge per lapse, not one every eight seconds.
  const sendChunk = async (uri: string) => {
    const sessionId = sessionIdRef.current;
    if (sessionId === null) {
      return;
    }
    const result = await client().coachClip(sessionId, uri);
    setSeen(result.seen ?? null);
    setInFrame(result.subject_present ?? null);
    if (result.subject_present === false) {
      if (!wasOutOfFrameRef.current) {
        void narration.speak('Camera cannot see your work. Bring it into the frame.');
      }
      wasOutOfFrameRef.current = true;
    } else {
      wasOutOfFrameRef.current = false;
    }
    if (result.step > pointerRef.current) {
      pointerRef.current = result.step;
      setStep(result.step);
      // Comment on the finding first, then instruct (the VSS shape):
      // what the model saw is the evidence for moving on.
      const next = knot?.steps[result.step];
      void narration.speak(
        `I can see it${result.seen ? `: ${result.seen}` : ''}. Next: ${next?.voice ?? ''}`,
      );
    }
  };

  // The shared skeleton (#213) runs the chunk loop; the coach has no gates
  // of its own beyond the standard ones (one in flight, steadiness).
  const watchLoop = useWatchLoop({
    cameraRef,
    chunkSeconds: COACH_CLIP_SECONDS,
    decide: () => null,
    send: sendChunk,
    onReading: () => {
      if (narration.isSpeaking() || coverSpokenForRef.current === stepRef.current) {
        return;
      }
      coverSpokenForRef.current = stepRef.current;
      const active = knot?.steps[stepRef.current];
      const line = active?.manual ?? active?.voice;
      if (line !== undefined) {
        void narration.speak(`While I check: ${line}`);
      }
    },
  });
  const checking = watchLoop.cycle.reading;

  const stopWatch = useCallback(() => {
    watchLoop.stop();
    setWatch('off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWatch = async () => {
    if (knot === undefined || watchLoop.isWatching()) {
      return;
    }
    setWatch('starting');
    setWatchNote(null);
    try {
      sessionIdRef.current = (await client().createCoachSession(knot.id)).session_id;
    } catch (error) {
      setWatch('failed');
      setWatchNote(error instanceof Error ? error.message : String(error));
      return;
    }
    pointerRef.current = 0;
    setWatch('watching');
    void watchLoop.start();
  };

  // Voice control over the steps (#180), now always listening: one mode,
  // the mic open for the whole session, utterances processed as spoken.
  // The mic mutes itself while the coach narrates (#74 turn-taking).
  const talk = useOpenMic({
    enabled: knot !== undefined,
    isMuted: narration.isSpeaking,
    onPartial: setHeard,
    onFinal: (text) => {
      setHeard(null);
      if (knot === undefined) {
        return;
      }
      const mapped = mapTranscript(text, ['next', 'done']);
      if (mapped.action === 'answer') {
        goTo(Math.min(step + 1, knot.steps.length - 1));
      } else if (mapped.action === 'undo') {
        goTo(Math.max(step - 1, 0));
      } else if (mapped.action === 'repeat') {
        speak(step);
      } else {
        // Anything else is a question: inference answers it by voice, with
        // the procedure and step as context (the VSS conversation shape).
        setHeard(`"${text}" — asking the guide`);
        void client()
          .chat(
            `While tying a ${knot.name} (step ${step + 1}: ${knot.steps[step].screen}) the user asks: ${text}`,
          )
          .then((answer) => {
            setHeard(null);
            void narration.speak(stripMarkdown(answer.text));
          })
          .catch(() => setHeard(`"${text}" — say next, back, or repeat`));
      }
    },
    onProblem: (kind) =>
      setHeard(kind === 'denied' ? 'Mic off. Allow the microphone.' : 'Voice needs the server'),
  });

  // Leaving the screen stops any narration; the loop stops itself.
  useEffect(
    () => () => narration.stop(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (Device.isDevice && permission !== null && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  if (knot === undefined) {
    return (
      <View style={styles.screen}>
        <Text style={[typography.body, styles.missing]}>This knot does not exist.</Text>
      </View>
    );
  }

  const showCamera = Device.isDevice && permission?.granted === true;
  const active = knot.steps[step];
  // A procedure with per-step figures shows only real ones: repeating the
  // finished-knot reference on early steps misleads. Procedures with a
  // single reference (no step figures anywhere) keep it on every step.
  const hasStepFigures = knot.steps.some((s) => s.figure !== undefined);
  const figure = active.figure ?? (hasStepFigures ? undefined : knot.reference);

  return (
    <View style={styles.screen}>
      {showCamera && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="video"
          mute
          videoQuality="4:3"
          videoBitrate={COACH_VIDEO_BITRATE}
          onCameraReady={() => {
            // One mode: watching starts when the camera does. No button.
            if (knot?.watchable && !watchLoop.isWatching()) {
              void startWatch();
            }
          }}
        />
      )}
      {checking && <View style={styles.freeze} pointerEvents="none" />}
      <View style={[styles.top, { top: insets.top + spacing.s }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.chip}
        >
          <Feather name="chevron-left" size={16} color={darkHome.ink} />
        </Pressable>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {knot.name} · {step + 1}/{knot.steps.length}
          </Text>
        </View>
        {/* One mode, but always stoppable: the status chip is the stop.
            Tap Watching to pause the loop; tap Paused to resume. */}
        {showCamera && knot.watchable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={watch === 'watching' ? 'Stop watching' : 'Resume watching'}
            onPress={() => {
              if (watch === 'watching' || watch === 'starting') {
                stopWatch();
              } else {
                void startWatch();
              }
            }}
            style={[styles.chip, watch === 'watching' && styles.chipActive, checking && styles.chipChecking]}
          >
            <Text
              style={[
                styles.chipText,
                watch === 'watching' && { color: HOME_BIOME.glow },
                checking && { color: '#B5E3DC' },
                watch === 'failed' && { color: darkHome.ink3 },
              ]}
            >
              {checking ? 'Reading · stop' : watch === 'watching' ? 'Watching · stop' : watch === 'starting' ? 'Starting' : watch === 'failed' ? 'No server · retry' : 'Paused · start'}
            </Text>
          </Pressable>
        )}
        <View style={[styles.chip, talk.listening && styles.chipActive]}>
          <Feather
            name={talk.alive ? 'mic' : 'mic-off'}
            size={16}
            color={talk.listening ? HOME_BIOME.glow : talk.alive ? darkHome.ink : darkHome.ink3}
          />
        </View>
      </View>
      {figure !== undefined && (
        <View style={[styles.referenceWrap, { top: insets.top + 120 }]} pointerEvents="none">
          <Image source={figure} style={styles.reference} contentFit="contain" />
        </View>
      )}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.m }]}>
        <Text style={styles.fragment}>{active.screen}</Text>
        {(watch === 'watching' || checking) &&
          (() => {
            const lines = cycleLines(watchLoop.cycle, {
              chunkSeconds: COACH_CLIP_SECONDS,
              expectedReadSeconds: EXPECTED_READ_S,
              verdict:
                seen !== null && watchLoop.cycle.lastResultAt !== null
                  ? {
                      text:
                        inFrame === false
                          ? `Not in frame — seeing: ${seen}`
                          : `Sees: ${seen}`,
                      at: watchLoop.cycle.lastResultAt,
                    }
                  : null,
            });
            return (
              <>
                <Text style={[typography.annotation, styles.voiceLine]} numberOfLines={1}>
                  {lines.primary}
                </Text>
                {lines.secondary !== null && (
                  <Text style={[typography.annotation, styles.voiceLine]} numberOfLines={2}>
                    {lines.secondary}
                  </Text>
                )}
              </>
            );
          })()}
        {heard !== null && (
          <Text style={[typography.annotation, styles.voiceLine]} numberOfLines={2}>
            {heard}
          </Text>
        )}
        {watch === 'failed' && watchNote !== null && (
          <Text style={[typography.annotation, styles.voiceLine]} numberOfLines={2}>
            Watch failed: {watchNote}
          </Text>
        )}
        {active.manual !== undefined && (
          <Text style={styles.manual} numberOfLines={4}>
            {active.manual}
          </Text>
        )}
        {knot.manualChapter !== undefined && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open FM 21-76 chapter ${knot.manualChapter}`}
            onPress={() => router.push(`/reference?chapter=${knot.manualChapter}`)}
          >
            <Text style={styles.manualLink}>FM 21-76 · Chapter {knot.manualChapter}</Text>
          </Pressable>
        )}
        <View style={styles.dots}>
          {knot.steps.map((_, index) => (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={`Step ${index + 1}`}
              onPress={() => goTo(index)}
              style={[styles.dot, index === step && styles.dotCurrent]}
            >
              <Text style={[styles.dotText, index === step && styles.dotTextCurrent]}>
                {index + 1}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.attribution}>
          {knot.attribution.source} · {knot.attribution.author} · {knot.attribution.license}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkHome.field,
  },
  missing: {
    color: darkHome.ink2,
    padding: spacing.xxl,
    textAlign: 'center',
  },
  top: {
    position: 'absolute',
    left: spacing.m,
    right: spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  chip: {
    backgroundColor: darkHome.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
    borderRadius: 14,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: HOME_BIOME.glow,
  },
  chipChecking: {
    borderColor: '#B5E3DC',
  },
  freeze: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 10, 13, 0.45)',
    zIndex: 1,
  },
  chipText: {
    ...typography.tag,
    color: darkHome.ink,
  },
  referenceWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  reference: {
    width: 180,
    height: 170,
    borderRadius: radius.control,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xl,
    gap: spacing.m,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 10, 13, 0.78)',
  },
  voiceLine: {
    color: darkHome.ink3,
    textAlign: 'center',
  },
  fragment: {
    ...typography.surfaceTitle,
    color: darkHome.ink,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkHome.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    backgroundColor: HOME_BIOME.glow,
    borderColor: HOME_BIOME.glow,
  },
  dotText: {
    ...typography.tag,
    color: darkHome.ink2,
  },
  dotTextCurrent: {
    color: darkHome.field,
  },
  manual: {
    ...typography.annotation,
    color: darkHome.ink2,
    textAlign: 'center',
    lineHeight: 17,
  },
  manualLink: {
    ...typography.tag,
    color: HOME_BIOME.glow,
  },
  attribution: {
    ...typography.annotation,
    fontSize: 10,
    color: darkHome.ink3,
    textAlign: 'center',
  },
});
