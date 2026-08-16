import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SkyOutlook } from '@/api/types';
import { useNarration } from '@/api/voice';
import { useSession } from '@/store/session';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { radius, spacing, typography } from '@/theme/tokens';

/**
 * Pitch scene three: point the camera at the sky, and the box reads the
 * clouds against this month's climate memory. The answer arrives
 * implication first and is narrated; the source line names the NOAA
 * normals it leans on. An outlook from observation, and it says so.
 */
export default function Sky() {
  const client = useSession((s) => s.client);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [reading, setReading] = useState(false);
  const [outlook, setOutlook] = useState<SkyOutlook | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const narration = useNarration();

  useEffect(() => {
    if (Device.isDevice && permission !== null && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const showCamera = Device.isDevice && permission?.granted === true;

  const read = async () => {
    if (cameraRef.current === null) {
      setMessage('Sky reading needs the camera, so it needs the phone.');
      return;
    }
    setMessage(null);
    setOutlook(null);
    setReading(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 3 });
      if (video === undefined) {
        return;
      }
      const result = await client().readSky(video.uri, new Date().getMonth() + 1);
      setOutlook(result);
      void narration.speak(result.outlook.replace(/\*+/g, ''));
    } catch {
      setMessage('The sky model did not answer. Please check the server connection.');
    } finally {
      setReading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {showCamera && (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="video" mute />
      )}
      <View style={[styles.top, { top: insets.top + spacing.s }]}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Read the sky</Text>
        </View>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.m }]}>
        {message !== null && <Text style={styles.helper}>{message}</Text>}
        {reading && <Text style={styles.helper}>3 s clip → box models</Text>}
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
          </ScrollView>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Read the sky"
          disabled={reading}
          onPress={() => void read()}
          style={[styles.readButton, reading && styles.readButtonBusy]}
        >
          <Feather name="cloud" size={18} color={darkHome.field} />
          <Text style={styles.readButtonText}>
            {reading ? 'Reading the sky' : 'Point up. Read the sky.'}
          </Text>
        </Pressable>
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
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
    height: 52,
    borderRadius: 26,
    backgroundColor: HOME_BIOME.glow,
  },
  readButtonBusy: {
    opacity: 0.6,
  },
  readButtonText: {
    ...typography.button,
    color: darkHome.field,
  },
});
