import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type TorchMode,
} from 'react-native-vision-camera';

import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

const PHOTO_RESOLUTION = { width: 1920, height: 1440 };

interface Capture {
  uri: string;
  width: number;
  height: number;
}

export default function Scan() {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  // The clip-on macro sits over the wide-angle lens; selecting it explicitly
  // keeps iPhone auto-macro from switching to the ultra-wide behind it.
  const device = useCameraDevice('back', { physicalDevices: ['wide-angle'] });
  const [torchMode, setTorchMode] = useState<TorchMode>('off');
  const [lastCapture, setLastCapture] = useState<Capture | null>(null);

  const photoOutput = usePhotoOutput({
    targetResolution: PHOTO_RESOLUTION,
    qualityPrioritization: 'speed',
  });

  const captureStill = async () => {
    const photo = await photoOutput.capturePhoto({ enableShutterSound: false }, {});
    try {
      const path = await photo.saveToTemporaryFileAsync();
      setLastCapture({
        uri: path.startsWith('file://') ? path : `file://${path}`,
        width: photo.width,
        height: photo.height,
      });
    } finally {
      photo.dispose();
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.notice}>
        <Text style={typography.body}>
          Flux needs the camera to scan the solder side of your board.
        </Text>
        {canRequestPermission ? (
          <Pressable style={styles.button} onPress={() => void requestPermission()}>
            <Text style={typography.button}>Allow camera</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={() => void Linking.openSettings()}>
            <Text style={typography.button}>Open Settings</Text>
          </Pressable>
        )}
        <BackLink />
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.notice}>
        <Text style={typography.body}>No camera is available on this device.</Text>
        <BackLink />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Camera
        style={StyleSheet.absoluteFill}
        isActive={focused}
        device={device}
        outputs={[photoOutput]}
        torchMode={torchMode}
        resizeMode="cover"
      />
      <View style={styles.topBar}>
        <Pressable style={styles.chromeButton} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.card} />
        </Pressable>
        <View style={styles.spacer} />
        <Pressable
          style={styles.chromeButton}
          hitSlop={8}
          onPress={() => setTorchMode(torchMode === 'on' ? 'off' : 'on')}
        >
          <Ionicons
            name={torchMode === 'on' ? 'flash' : 'flash-off'}
            size={18}
            color={colors.card}
          />
        </Pressable>
      </View>
      <View style={styles.bottomBar}>
        {lastCapture && (
          <View style={styles.captureInfo}>
            <Image style={styles.thumb} source={{ uri: lastCapture.uri }} contentFit="cover" />
            <Text style={styles.captureMeta}>
              {lastCapture.width}x{lastCapture.height}
            </Text>
          </View>
        )}
        <View style={styles.spacer} />
        <Pressable style={styles.captureButton} onPress={() => void captureStill()}>
          <Text style={typography.button}>Capture</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BackLink() {
  return (
    <Pressable hitSlop={8} onPress={() => router.back()}>
      <Text style={styles.backLink}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.panelNavy,
  },
  notice: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.l,
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: spacing.l,
    right: spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: spacing.l,
    right: spacing.l,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  spacer: {
    flex: 1,
  },
  chromeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: sizes.control,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
  },
  captureButton: {
    height: sizes.focalAction,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  captureInfo: {
    gap: spacing.xs,
  },
  thumb: {
    width: 72,
    height: 54,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.card,
  },
  captureMeta: {
    ...typography.annotation,
    color: colors.card,
  },
  backLink: {
    ...typography.button,
    color: colors.signature,
  },
});
