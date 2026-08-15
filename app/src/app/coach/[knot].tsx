import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { knotById } from '@/data/coach';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

/**
 * Follow-along knot coach over the live camera. The camera center stays
 * clear (it is the user's workspace); the reference graphic sits small at
 * the top. Steps advance by tapping the dots for now; the coach event
 * stream (#66/#80) will drive the same pointer when the server side lands.
 * Narration is on-device speech until box TTS relays through the server.
 */
export default function KnotCoach() {
  const { knot: knotId } = useLocalSearchParams<{ knot: string }>();
  const knot = knotById(knotId ?? '');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);

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

  // Leaving the screen stops any narration mid-sentence.
  useEffect(
    () => () => {
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

  return (
    <View style={styles.screen}>
      {showCamera && <CameraView style={StyleSheet.absoluteFill} facing="back" />}
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
      <View style={[styles.referenceWrap, { top: insets.top + 64 }]} pointerEvents="none">
        <Image source={knot.reference} style={styles.reference} contentFit="contain" />
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.m }]}>
        <Text style={styles.fragment}>{knot.steps[step].screen}</Text>
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
    width: 132,
    height: 132,
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
  attribution: {
    ...typography.annotation,
    fontSize: 10,
    color: darkHome.ink3,
    textAlign: 'center',
  },
});
