import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SkyOutlook } from '@/api/types';
import { useNarration } from '@/api/voice';
import { cycleLines, SKIP_MOVING, useWatchLoop } from '@/live/watch';
import { useSession } from '@/store/session';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

const CHUNK_S = 3;
// Cosmos describes, then nemotron writes: the pair typically answers
// within this; the cycle readout flags a slow answer past double.
const EXPECTED_READ_S = 20;

/**
 * Pitch scene three on the shared skeleton (#213): point the camera up and
 * the sky reads itself. The loop films chunks, the standard gates hold
 * while the phone moves or a read is in flight, and once an outlook lands
 * the loop rests until the camera is re-aimed — sustained motion clears
 * the outlook and the next steady chunk reads again. No buttons; the
 * status row is the stop.
 */
export default function Sky() {
  const client = useSession((s) => s.client);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [outlook, setOutlook] = useState<SkyOutlook | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const narration = useNarration();
  const outlookRef = useRef<SkyOutlook | null>(null);
  outlookRef.current = outlook;

  useEffect(() => {
    if (Device.isDevice && permission !== null && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const showCamera = Device.isDevice && permission?.granted === true;

  const sendChunk = async (uri: string) => {
    const result = await client().readSky(uri, new Date().getMonth() + 1);
    setOutlook(result);
    void narration.speak(result.outlook.replace(/\*+/g, ''));
  };

  const watchLoop = useWatchLoop({
    cameraRef,
    chunkSeconds: CHUNK_S,
    // An outlook on screen rests the loop; re-aiming clears it below.
    decide: () =>
      outlookRef.current !== null ? 'outlook read — re-aim to read again' : null,
    send: sendChunk,
  });
  const watching = watchLoop.cycle.watching;

  // Sustained motion while an outlook is up reads as re-aiming: clear the
  // outlook, and the next steady chunk reads the new sky.
  useEffect(() => {
    if (watchLoop.cycle.skipReason === SKIP_MOVING && outlookRef.current !== null) {
      setOutlook(null);
    }
  }, [watchLoop.cycle.skipReason]);

  useEffect(
    () => () => narration.stop(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const lines = cycleLines(watchLoop.cycle, {
    chunkSeconds: CHUNK_S,
    expectedReadSeconds: EXPECTED_READ_S,
  });

  return (
    <View style={styles.screen}>
      {showCamera && (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="video"
          mute
          onCameraReady={() => void watchLoop.start()}
        />
      )}
      <View style={[styles.top, { top: insets.top + spacing.s }]}>
        {/* Always stoppable: the status chip is the stop. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={watching ? 'Stop reading the sky' : 'Resume reading the sky'}
          onPress={() => (watching ? watchLoop.stop() : void watchLoop.start())}
          style={styles.chip}
        >
          {watchLoop.cycle.reading ? (
            <ActivityIndicator size="small" color="#B5E3DC" />
          ) : (
            <Feather name="cloud" size={14} color={darkHome.ink} />
          )}
          <Text style={styles.chipText}>
            {watching ? 'Reading the sky · tap to stop' : 'Paused · tap to read'}
          </Text>
        </Pressable>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.m }]}>
        {message !== null && <Text style={styles.helper}>{message}</Text>}
        {(watching || watchLoop.cycle.reading) && (
          <Text style={styles.helper}>{lines.primary}</Text>
        )}
        {!showCamera && (
          <Text style={styles.helper}>Sky reading needs the camera, so it needs the phone.</Text>
        )}
        {outlook !== null && (
          <ScrollView style={styles.outlookScroll}>
            <Text style={styles.outlookText}>{outlook.outlook.replace(/\*+/g, '')}</Text>
            {outlook.off_subject === true ? (
              <Text style={styles.detail}>Camera sees: {outlook.clouds}</Text>
            ) : (
              <>
                <Text style={styles.detail}>Sky now: {outlook.clouds}</Text>
                <Text style={styles.detail}>
                  This month here: rain on about {outlook.rain_days} days, highs near{' '}
                  {outlook.high_f}°F.
                </Text>
                <Text style={styles.sourceLine}>{outlook.source}</Text>
              </>
            )}
            <Text style={styles.detail}>Re-aim at a new sky to read again.</Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkHome.field,
  },
  top: {
    position: 'absolute',
    left: spacing.m,
    right: spacing.m,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    backgroundColor: 'rgba(11, 20, 32, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(140, 163, 184, 0.35)',
  },
  chipText: {
    ...typography.listBody,
    color: darkHome.ink,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.m,
    gap: spacing.m,
    backgroundColor: 'rgba(7, 12, 19, 0.88)',
    zIndex: 2,
  },
  outlookScroll: {
    maxHeight: 300,
  },
  outlookText: {
    ...typography.body,
    color: darkHome.ink,
  },
  detail: {
    ...typography.annotation,
    color: darkHome.ink2,
    marginTop: spacing.xs,
  },
  sourceLine: {
    ...typography.annotation,
    color: darkHome.ink3,
    marginTop: spacing.s,
  },
  helper: {
    ...typography.annotation,
    color: darkHome.ink2,
  },
});
