import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { type ClipEntry, type ClipStatus, useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

// Small files over quality, per the expo-camera SDK 57 docs and what iOS
// actually honors:
// - videoQuality '4:3' records 640x480, the smallest size iOS supports
//   ('480p' is Android-only; the larger values are all 16:9).
// - videoBitrate takes effect on iOS only when recordAsync names a codec,
//   so recordAsync passes 'avc1' (H.264, which the VSS box decodes).
// - expo-camera exposes no frame-rate control on any platform, so "low fps"
//   arrives as a low bitrate instead: the box samples about eight frames per
//   chunk, so per-frame quality past legibility is wasted bytes.
// - iOS writes a QuickTime .mov container rather than .mp4; the track inside
//   is plain H.264, which the box's decoder reads, and the upload declares
//   video/quicktime.
// - The mute prop drops the audio track, so recording needs no microphone
//   permission and clips shrink further.
// At 1 Mbps a 20 s clip stays near 2.5 MB, which fits the upload queue's
// 20 s per-attempt race on LAN.
const CLIP_SECONDS = 20;
const VIDEO_BITRATE = 1_000_000;

const statusTone: Record<ClipStatus, TagTone> = {
  pending: 'gray',
  uploading: 'blue',
  done: 'green',
  failed: 'red',
};

function ClipRow({ clip }: { clip: ClipEntry }) {
  return (
    <View style={styles.clipRow}>
      <Text style={typography.annotation}>
        {new Date(clip.capturedAt).toLocaleTimeString()}
      </Text>
      <Tag label={clip.status} tone={statusTone[clip.status]} />
    </View>
  );
}

/**
 * Records low-rate clips into the session upload queue. The launch params
 * (prime selects the model context, subject the target) arrive from a tool
 * launch in chat or a guide and show as tags until perception consumes them.
 */
export default function Capture() {
  const { prime, subject } = useLocalSearchParams<{ prime?: string; subject?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const { clips, ensureCaptureSession, submitClip } = useSession();
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef(false);

  // Leaving the screen stops the recorder; the queue keeps uploading.
  useEffect(
    () => () => {
      recordingRef.current = false;
      cameraRef.current?.stopRecording();
    },
    [],
  );

  const record = async () => {
    setMessage(null);
    try {
      await ensureCaptureSession();
    } catch {
      setMessage('Could not start a session on the server. Please connect on the Server screen first.');
      return;
    }
    recordingRef.current = true;
    setRecording(true);
    // Chunked recording: each clip auto-stops at CLIP_SECONDS and enqueues,
    // then the next starts, so uploads begin while recording continues.
    while (recordingRef.current) {
      const startedAt = new Date().toISOString();
      try {
        const video = await cameraRef.current?.recordAsync({
          codec: 'avc1',
          maxDuration: CLIP_SECONDS,
        });
        if (video === undefined) {
          break;
        }
        submitClip(video.uri, startedAt, 'video/quicktime');
      } catch {
        setMessage('Recording stopped because the camera returned an error.');
        break;
      }
    }
    recordingRef.current = false;
    setRecording(false);
  };

  const stop = () => {
    recordingRef.current = false;
    cameraRef.current?.stopRecording();
  };

  const primeRow = (prime || subject) && (
    <View style={styles.primeRow}>
      {prime ? <Tag label={prime} tone="blue" /> : null}
      {subject ? <Tag label={subject} tone="gray" /> : null}
    </View>
  );

  // The simulator has no camera; recording requires a phone.
  if (!Device.isDevice) {
    return (
      <View style={styles.screen}>
        <TopBar title="Video mode" back />
        <View style={styles.centered}>
          <Text style={[typography.body, styles.centeredText]}>
            This simulator has no camera. Please open Video mode on a phone.
          </Text>
        </View>
      </View>
    );
  }

  if (permission === null) {
    return (
      <View style={styles.screen}>
        <TopBar title="Video mode" back />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <TopBar title="Video mode" back />
        <View style={styles.centered}>
          <Text style={[typography.body, styles.centeredText]}>
            Video mode records short clips with the camera. Please allow camera access.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              if (permission.canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
          >
            <Text style={typography.button}>
              {permission.canAskAgain ? 'Allow camera access' : 'Open Settings'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Video mode" back />
      <CameraView
        ref={cameraRef}
        style={styles.preview}
        mode="video"
        facing="back"
        mute
        videoQuality="4:3"
        videoBitrate={VIDEO_BITRATE}
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setMessage('The camera did not start. Please close and reopen Video mode.')}
      />
      <View style={styles.panel}>
        {primeRow}
        <View style={styles.controlRow}>
          <Pressable
            style={[styles.button, recording && styles.stopButton, !cameraReady && styles.buttonDisabled]}
            disabled={!cameraReady}
            onPress={recording ? stop : () => void record()}
          >
            <Text style={typography.button}>{recording ? 'Stop' : 'Record'}</Text>
          </Pressable>
          {recording && <Tag label="recording" tone="red" />}
        </View>
        {message !== null && <Text style={styles.helper}>{message}</Text>}
        {clips.length === 0 ? (
          <Text style={styles.helper}>
            Please press Record to start. Clips upload to the server as they finish.
          </Text>
        ) : (
          <FlatList
            style={styles.clipList}
            data={[...clips].reverse()}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <ClipRow clip={item} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.l,
  },
  centeredText: {
    textAlign: 'center',
  },
  preview: {
    flex: 1,
  },
  panel: {
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    padding: spacing.l,
    gap: spacing.m,
  },
  primeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  button: {
    height: sizes.control,
    minWidth: 104,
    borderRadius: radius.control,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.l,
  },
  stopButton: {
    backgroundColor: colors.panelNavy,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helper: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  clipList: {
    maxHeight: 160,
  },
  clipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: sizes.rowHeight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
});
