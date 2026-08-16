import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Device from 'expo-device';
import { useState } from 'react';
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RecordStub } from '@/api/types';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

type ShotStatus = 'uploading' | 'answered' | 'failed';

interface Shot {
  id: string;
  uri: string;
  status: ShotStatus;
  results: RecordStub[];
}

const statusTone: Record<ShotStatus, TagTone> = {
  uploading: 'blue',
  answered: 'green',
  failed: 'red',
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
    setShots((prev) => [{ id, uri: photo.uri, status: 'uploading', results: [] }, ...prev]);
    const sessionId = useSession.getState().captureSessionId;
    if (sessionId === null) {
      return;
    }
    try {
      const response = await client().uploadFrame(sessionId, photo.uri, new Date().toISOString());
      setShots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: 'answered', results: response.results } : s)),
      );
    } catch {
      setShots((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'failed' } : s)));
    }
  };

  if (!Device.isDevice) {
    return (
      <View style={styles.screen}>
        <TopBar title="Identify" back />
        <View style={styles.centered}>
          <Text style={[typography.body, styles.centeredText]}>No camera on the simulator</Text>
        </View>
      </View>
    );
  }

  if (permission === null) {
    return (
      <View style={styles.screen}>
        <TopBar title="Identify" back />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.screen}>
        <TopBar title="Identify" back />
        <View style={styles.centered}>
          <Text style={[typography.body, styles.centeredText]}>Camera access needed</Text>
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
              {permission.canAskAgain ? 'Allow camera' : 'Open Settings'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Identify" back />
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
            style={[styles.button, !cameraReady && styles.buttonDisabled]}
            disabled={!cameraReady}
            onPress={() => void snap()}
          >
            <Text style={typography.button}>Snap</Text>
          </Pressable>
          {captureSessionId !== null && <Tag label="session live" tone="green" />}
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
                  <Tag label={item.status} tone={statusTone[item.status]} />
                  {item.status === 'answered' &&
                    (item.results.length === 0 ? (
                      <Text style={typography.annotation}>
                        Received. Identification arrives when this server runs the perception
                        relay.
                      </Text>
                    ) : (
                      item.results.map((r) => (
                        <Text key={r.record_id} style={typography.listBody}>
                          {r.record_id}
                        </Text>
                      ))
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
  buttonDisabled: {
    opacity: 0.5,
  },
  helper: {
    ...typography.body,
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
    borderBottomColor: colors.line,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.chip,
    backgroundColor: colors.line,
  },
  shotBody: {
    flex: 1,
    gap: spacing.xs,
  },
});
