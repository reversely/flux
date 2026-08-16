import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { procedureById } from '@/data/coach';
import { useSession } from '@/store/session';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

// Short clips keep the watch loop close to the bench's 8 s chunks; the low
// bitrate matches capture.tsx's reasoning (the server samples ~8 frames).
const COACH_CLIP_SECONDS = 8;
const COACH_VIDEO_BITRATE = 1_000_000;

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
  const [voiceOn, setVoiceOn] = useState(true);
  const [watch, setWatch] = useState<WatchState>('off');
  // True while a recorded clip is uploading and the box classifies it: the
  // camera dims and the chip flips to Checking, so a model call is visible.
  const [checking, setChecking] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const watchingRef = useRef(false);

  const speak = useCallback(
    (index: number) => {
      if (!voiceOn || knot === undefined) {
        return;
      }
      Speech.stop();
      Speech.speak(knot.steps[index].voice);
    },
    [voiceOn, knot],
  );

  const goTo = (index: number) => {
    setStep(index);
    speak(index);
  };

  const stopWatch = useCallback(() => {
    watchingRef.current = false;
    cameraRef.current?.stopRecording();
    setWatch('off');
  }, []);

  // The watch loop: record a short clip, post it, apply the server pointer,
  // repeat. Each advance narrates the step it landed on.
  const startWatch = async () => {
    if (knot === undefined) {
      return;
    }
    setWatch('starting');
    let sessionId: string;
    try {
      sessionId = (await client().createCoachSession(knot.id)).session_id;
    } catch {
      setWatch('failed');
      return;
    }
    watchingRef.current = true;
    setWatch('watching');
    let pointer = 0;
    while (watchingRef.current) {
      try {
        const video = await cameraRef.current?.recordAsync({
          codec: 'avc1',
          maxDuration: COACH_CLIP_SECONDS,
        });
        if (video === undefined) {
          break;
        }
        setChecking(true);
        const result = await client().coachClip(sessionId, video.uri);
        setChecking(false);
        if (watchingRef.current && result.step > pointer) {
          pointer = result.step;
          goTo(result.step);
        }
      } catch {
        setChecking(false);
        setWatch('failed');
        watchingRef.current = false;
        return;
      }
    }
    setChecking(false);
    setWatch('off');
  };

  // Leaving the screen stops the recorder and any narration mid-sentence.
  useEffect(
    () => () => {
      watchingRef.current = false;
      cameraRef.current?.stopRecording();
      void Speech.stop();
    },
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
        {showCamera && knot.watchable && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={watch === 'off' || watch === 'failed' ? 'Watch my tying' : 'Stop watching'}
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
              {checking ? 'Checking' : watch === 'watching' ? 'Watching' : watch === 'starting' ? 'Starting' : watch === 'failed' ? 'Watch (no server)' : 'Watch'}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voiceOn ? 'Turn voice off' : 'Turn voice on'}
          onPress={() => {
            if (voiceOn) {
              Speech.stop();
            }
            setVoiceOn(!voiceOn);
          }}
          style={[styles.chip, voiceOn && styles.chipActive]}
        >
          <Feather name={voiceOn ? 'volume-2' : 'volume-x'} size={16} color={voiceOn ? HOME_BIOME.glow : darkHome.ink3} />
        </Pressable>
      </View>
      {figure !== undefined && (
        <View style={[styles.referenceWrap, { top: insets.top + 120 }]} pointerEvents="none">
          <Image source={figure} style={styles.reference} contentFit="contain" />
        </View>
      )}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.m }]}>
        <Text style={styles.fragment}>{active.screen}</Text>
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
