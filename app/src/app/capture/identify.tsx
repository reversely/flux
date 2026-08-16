import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { IdentificationRecord } from '@/api/types';
import { useNarration } from '@/api/voice';
import { PageBackdrop } from '@/components/PageBackdrop';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { radius, sizes, spacing } from '@/theme/tokens';

type ShotStatus = 'checking' | 'answered' | 'failed';

interface Shot {
  id: string;
  uri: string;
  status: ShotStatus;
  candidates: IdentificationRecord[];
}

// Retrieval labels arrive as full taxonomy strings; the binomial at the end
// is what a person reads. Everything shorter passes through unchanged.
function shortLabel(record: IdentificationRecord): string {
  const words = record.label.trim().split(/\s+/);
  return words.length > 2 ? words.slice(-2).join(' ') : record.label;
}

const SOURCE_NAME: Record<IdentificationRecord['source'], string> = {
  speciesnet: 'detector',
  bioclip: 'retrieval',
  fungitastic: 'fungi model',
};

let shotCounter = 0;

/**
 * Identify mode: one photo per subject, uploaded to the capture session.
 * Results render as the server returns them; the record shape grows past
 * stubs when the perception relay ships, and until then the empty state
 * says so instead of pretending.
 */
export default function Identify() {
  const [permission, requestPermission] = useCameraPermissions();
  const { ensureCaptureSession, captureSessionId } = useSession();
  const client = useSession((s) => s.client);
  const [shots, setShots] = useState<Shot[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [camera, setCamera] = useState<CameraView | null>(null);
  const narration = useNarration();

  const snap = async () => {
    setMessage(null);
    try {
      await ensureCaptureSession();
    } catch {
      setMessage('No server. Connect on the Server screen first.');
      return;
    }
    const photo = await camera?.takePictureAsync({ quality: 0.7 });
    if (photo === undefined) {
      return;
    }
    shotCounter += 1;
    const id = `shot-${shotCounter}`;
    setShots((prev) => [{ id, uri: photo.uri, status: 'checking', candidates: [] }, ...prev]);
    const sessionId = useSession.getState().captureSessionId;
    if (sessionId === null) {
      return;
    }
    try {
      const response = await client().uploadFrame(sessionId, photo.uri, new Date().toISOString());
      const candidates = (response.identifications ?? []).slice(0, 3);
      setShots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'answered', candidates } : s)),
      );
      const top = candidates[0];
      if (top !== undefined) {
        void narration.speak(
          `Closest match: ${shortLabel(top)}, ${Math.round(top.score * 100)} percent. ` +
            'Identification is never certain from a photo. Verify with the feature walk.',
        );
      } else {
        void narration.speak('No confident match. Try closer, or run the feature walk.');
      }
    } catch {
      setShots((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'failed' } : s)));
    }
  };

  if (!Device.isDevice) {
    return (
      <View style={dark.screen}>
        <TopBar title="Identify" back dark />
        <View style={styles.centered}>
          <Text style={[dark.body, styles.centeredText]}>No camera on the simulator</Text>
        </View>
      </View>
    );
  }

  if (permission === null) {
    return (
      <View style={dark.screen}>
        <TopBar title="Identify" back dark />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={dark.screen}>
        <TopBar title="Identify" back dark />
        <View style={styles.centered}>
          <Text style={[dark.body, styles.centeredText]}>Camera access needed</Text>
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
      <TopBar title="Identify" back dark />
      <PageBackdrop />
      <CameraView
        ref={setCamera}
        style={styles.preview}
        mode="picture"
        facing="back"
        onCameraReady={() => setCameraReady(true)}
        onMountError={() => setMessage('Camera did not start. Close and reopen.')}
      />
      <View style={styles.panel}>
        <View style={styles.controlRow}>
          <Pressable
            style={[dark.primary, !cameraReady && styles.buttonDisabled]}
            disabled={!cameraReady}
            onPress={() => void snap()}
          >
            <Text style={dark.primaryText}>Identify</Text>
          </Pressable>
        </View>
        {message !== null && <Text style={styles.helper}>{message}</Text>}
        {shots.length === 0 ? (
          <Text style={styles.helper}>Fill the frame with one subject. Snap.</Text>
        ) : (
          <FlatList
            style={styles.shotList}
            data={shots}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <View style={styles.shotRow}>
                <Image source={{ uri: item.uri }} style={styles.thumb} />
                <View style={styles.shotBody}>
                  {item.status === 'checking' && (
                    <Text style={dark.note}>The box is looking</Text>
                  )}
                  {item.status === 'failed' && (
                    <Text style={dark.note}>Identification needs the server</Text>
                  )}
                  {item.status === 'answered' && item.candidates.length === 0 && (
                    <Text style={dark.note}>No confident match. Try closer.</Text>
                  )}
                  {item.candidates.map((candidate, index) => (
                    <View key={`${candidate.source}-${index}`} style={styles.candidateRow}>
                      <Text style={dark.listBody}>{shortLabel(candidate)}</Text>
                      <Text style={dark.note}>
                        {Math.round(candidate.score * 100)}% · {SOURCE_NAME[candidate.source]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helper: {
    ...dark.body,
    fontSize: 14,
    lineHeight: 21,
  },
  shotList: {
    maxHeight: 200,
  },
  shotRow: {
    flexDirection: 'row',
    gap: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkHome.line,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.chip,
    backgroundColor: darkHome.line,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
  },
  shotBody: {
    flex: 1,
    gap: spacing.xs,
  },
});
