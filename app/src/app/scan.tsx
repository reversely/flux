import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraController,
  type CameraRef,
  type TorchMode,
} from 'react-native-vision-camera';

import { GuidanceBanner } from '@/components/GuidanceBanner';
import { LiveOverlay } from '@/components/LiveOverlay';
import { Tag } from '@/components/Tag';
import { createCameraSource } from '@/capture/cameraSource';
import { createSampleSource } from '@/capture/sampleSource';
import type { CaptureSource } from '@/capture/types';
import { useCaptureQuality } from '@/quality/useCaptureQuality';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

const PHOTO_RESOLUTION = { width: 1920, height: 1440 };

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
  const sampleMode = device == null;
  const [torchMode, setTorchMode] = useState<TorchMode>('off');
  const [scanFailed, setScanFailed] = useState(false);
  const [sampleFrameUri, setSampleFrameUri] = useState<string | null>(null);

  const photoOutput = usePhotoOutput({
    targetResolution: PHOTO_RESOLUTION,
    qualityPrioritization: 'speed',
  });

  const cameraRef = useRef<CameraRef>(null);
  const controllerRef = useRef<CameraController | undefined>(undefined);
  const quality = useCaptureQuality(controllerRef);

  const passesRef = useRef(false);
  useEffect(() => {
    passesRef.current = quality.status.passes;
  }, [quality.status.passes]);

  const phase = useSession((state) => state.phase);
  const results = useSession((state) => state.results);
  const uploadStats = useSession((state) => state.uploadStats);
  const lastFrameSize = useSession((state) => state.lastFrameSize);
  const startScan = useSession((state) => state.startScan);
  const submitFrame = useSession((state) => state.submitFrame);
  const finishScan = useSession((state) => state.finishScan);

  const sourceRef = useRef<CaptureSource | null>(null);
  useEffect(
    () => () => {
      // Leaving mid-scan stops uploading; the server session stays.
      sourceRef.current?.stop();
      sourceRef.current = null;
    },
    [],
  );

  const handleStart = async () => {
    setScanFailed(false);
    try {
      await startScan();
    } catch {
      setScanFailed(true);
      return;
    }
    const source = sampleMode
      ? createSampleSource()
      : createCameraSource(photoOutput, () => passesRef.current);
    sourceRef.current = source;
    source.start((frame) => {
      if (sampleMode) {
        setSampleFrameUri(frame.uri);
      }
      submitFrame(frame);
    });
  };

  const handleFinish = () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    finishScan();
    const sessionId = useSession.getState().sessionId ?? '';
    router.replace({ pathname: '/review', params: { sessionId } });
  };

  if (!sampleMode && !hasPermission) {
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

  const scanning = phase === 'scanning';

  return (
    <View style={styles.screen}>
      {sampleMode ? (
        sampleFrameUri !== null && (
          <Image
            style={StyleSheet.absoluteFill}
            source={{ uri: sampleFrameUri }}
            contentFit="contain"
          />
        )
      ) : (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          isActive={focused}
          device={device}
          outputs={[photoOutput, quality.frameOutput]}
          torchMode={torchMode}
          resizeMode="cover"
          onConfigured={() => {
            controllerRef.current = cameraRef.current?.controller;
          }}
        />
      )}
      {phase === 'scanning' && <LiveOverlay joints={results} frameSize={lastFrameSize} />}
      <View style={styles.guidance}>
        <GuidanceBanner
          status={quality.status}
          sampleMode={sampleMode}
          showMetrics={__DEV__ && !sampleMode}
        />
      </View>
      <View style={styles.topBar}>
        <Pressable style={styles.chromeButton} hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.card} />
        </Pressable>
        <View style={styles.spacer} />
        {!sampleMode && (
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
        )}
      </View>
      {scanFailed && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorCopy}>
            Please reconnect to the server before starting a scan.
          </Text>
        </View>
      )}
      <View style={styles.bottomBar}>
        {scanning && (
          <View style={styles.statusTags}>
            <Tag label={`frames ${uploadStats.sent}`} tone="gray" />
            <Tag label={`joints ${results.length}`} tone="gray" />
            {uploadStats.failed > 0 && (
              <Tag label={`failed ${uploadStats.failed}`} tone="red" />
            )}
          </View>
        )}
        <View style={styles.spacer} />
        {scanning ? (
          <Pressable style={styles.focalButton} onPress={handleFinish}>
            <Text style={typography.button}>Finish scan</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.focalButton} onPress={() => void handleStart()}>
            <Text style={typography.button}>Start scan</Text>
          </Pressable>
        )}
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
  guidance: {
    position: 'absolute',
    top: 104,
    left: spacing.l,
    right: spacing.l,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: spacing.l,
    right: spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTags: {
    flexDirection: 'row',
    gap: spacing.s,
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
  focalButton: {
    height: sizes.focalAction,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorBanner: {
    position: 'absolute',
    top: 160,
    left: spacing.l,
    right: spacing.l,
    backgroundColor: colors.card,
    borderRadius: radius.control,
    padding: spacing.m,
  },
  errorCopy: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  backLink: {
    ...typography.button,
    color: colors.signature,
  },
});
