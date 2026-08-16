import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import type { SessionResults } from '@/api/types';
import { useNarration } from '@/api/voice';
import { type ClipEntry, type ClipStatus, useSession } from '@/store/session';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { radius, sizes, spacing } from '@/theme/tokens';

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
      <Text style={dark.note}>
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
  const { clips, ensureCaptureSession, submitClip, captureSessionId, client } = useSession();
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef(false);
  // The VSS half (#106): finishing hands the clips to the box, ingest
  // progress shows per clip, the summary narrates, and a question over the
  // recorded trail answers implication first.
  const narration = useNarration();
  const [summarizing, setSummarizing] = useState(false);
  const [results, setResults] = useState<SessionResults | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const summarize = async () => {
    if (captureSessionId === null) {
      return;
    }
    setSummarizing(true);
    setMessage(null);
    // Poll results while finish runs, so the per-clip ingest states show.
    const poll = setInterval(() => {
      void client()
        .getResults(captureSessionId)
        .then(setResults)
        .catch(() => undefined);
    }, 2000);
    try {
      await client().finishSession(captureSessionId);
      const final = await client().getResults(captureSessionId);
      setResults(final);
      if (final.summary) {
        void narration.speak(final.summary);
      }
    } catch {
      setMessage('The summary needs the box. Please check the server.');
    } finally {
      clearInterval(poll);
      setSummarizing(false);
    }
  };

  const ask = async () => {
    if (captureSessionId === null || question.trim() === '') {
      return;
    }
    setAsking(true);
    setAnswer(null);
    try {
      const reply = await client().askTrail(captureSessionId, question.trim());
      setAnswer(reply.answer);
      void narration.speak(reply.answer);
    } catch {
      setMessage('The trail answer needs the box. Please check the server.');
    } finally {
      setAsking(false);
    }
  };

  // Leaving the screen stops the recorder; the queue keeps uploading.
  useEffect(
    () => () => {
      recordingRef.current = false;
      try {
        cameraRef.current?.stopRecording();
      } catch {
        // Recorder already torn down.
      }
    },
    [],
  );

  const record = async () => {
    setMessage(null);
    try {
      await ensureCaptureSession();
    } catch {
      setMessage('No server. Connect on the Server screen first.');
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
        setMessage('Camera error. Recording stopped.');
        break;
      }
    }
    recordingRef.current = false;
    setRecording(false);
  };

  const stop = () => {
    recordingRef.current = false;
    try {
        cameraRef.current?.stopRecording();
      } catch {
        // Recorder already torn down.
      }
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
      <View style={dark.screen}>
        <TopBar title="Record trail" back dark />
        <View style={styles.centered}>
          <Text style={[dark.body, styles.centeredText]}>
            No camera on the simulator
          </Text>
        </View>
      </View>
    );
  }

  if (permission === null) {
    return (
      <View style={dark.screen}>
        <TopBar title="Record trail" back dark />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={dark.screen}>
        <TopBar title="Record trail" back dark />
        <View style={styles.centered}>
          <Text style={[dark.body, styles.centeredText]}>
            Camera access needed
          </Text>
          <Pressable
            style={dark.primary}
            onPress={() => {
              if (permission.canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
          >
            <Text style={dark.primaryText}>
              {permission.canAskAgain ? 'Allow camera' : 'Open Settings'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={dark.screen}>
      <TopBar title="Record trail" back dark />
      <PageBackdrop />
      <CameraView
        ref={cameraRef}
        style={styles.preview}
        mode="video"
        facing="back"
        mute
        videoQuality="4:3"
        videoBitrate={VIDEO_BITRATE}
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setMessage('Camera did not start. Close and reopen.')}
      />
      <View style={styles.panel}>
        {primeRow}
        <View style={styles.controlRow}>
          <Pressable
            style={[dark.primary, recording && styles.stopButton, !cameraReady && styles.buttonDisabled]}
            disabled={!cameraReady}
            onPress={recording ? stop : () => void record()}
          >
            <Text style={dark.primaryText}>{recording ? 'Stop' : 'Record'}</Text>
          </Pressable>
          {recording && <Tag label="recording" tone="red" />}
        </View>
        {message !== null && <Text style={styles.helper}>{message}</Text>}
        {clips.some((c) => c.status === 'done') && !recording && (
          <Pressable
            style={[dark.primary, summarizing && styles.buttonDisabled]}
            disabled={summarizing}
            onPress={() => void summarize()}
          >
            <Text style={dark.primaryText}>
              {summarizing ? 'The box is watching your clips' : 'Summarize the trail'}
            </Text>
          </Pressable>
        )}
        {summarizing && results?.ingest != null && (
          <Text style={styles.helper}>
            {results.ingest.map((e) => `${e.video}: ${e.state}`).join('  ')}
          </Text>
        )}
        {results?.summary != null && (
          <ScrollView style={styles.summaryScroll}>
            <Text style={styles.summaryText}>{results.summary}</Text>
            {results.transcript != null && (
              <Text style={styles.helper}>You said: {results.transcript}</Text>
            )}
          </ScrollView>
        )}
        {results?.summary != null && (
          <View style={styles.askRow}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask about this trail"
              placeholderTextColor={darkHome.ink3}
              style={styles.askInput}
              editable={!asking}
              onSubmitEditing={() => void ask()}
              returnKeyType="send"
            />
            <Pressable
              style={[dark.primary, asking && styles.buttonDisabled]}
              disabled={asking}
              onPress={() => void ask()}
            >
              <Text style={dark.primaryText}>{asking ? 'Watching' : 'Ask'}</Text>
            </Pressable>
          </View>
        )}
        {answer !== null && (
          <ScrollView style={styles.summaryScroll}>
            <Text style={styles.summaryText}>{answer}</Text>
          </ScrollView>
        )}
        {clips.length === 0 ? (
          <Text style={styles.helper}>
            Record. Clips upload as they finish.
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
    backgroundColor: darkHome.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: darkHome.line,
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
  stopButton: {
    backgroundColor: 'rgba(230, 237, 242, 0.16)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helper: {
    ...dark.body,
    fontSize: 14,
    lineHeight: 21,
  },
  summaryScroll: {
    maxHeight: 170,
  },
  summaryText: {
    ...dark.body,
    fontSize: 14,
    lineHeight: 21,
  },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  askInput: {
    ...dark.body,
    flex: 1,
    height: sizes.control,
    borderWidth: 1,
    borderColor: darkHome.line,
    borderRadius: radius.control,
    paddingHorizontal: spacing.m,
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
    borderBottomColor: darkHome.line,
  },
});
