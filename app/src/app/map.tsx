import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import {
  CATEGORY_LABEL,
  type Observation,
  type ObservationCategory,
  observationsToGeoJSON,
  useObservations,
} from '@/store/observations';
import { darkHome } from '@/theme/biome';
import { colors, radius, spacing, typography } from '@/theme/tokens';

// The map document is an asset, not a bundled string: 2 MB of MapLibre,
// pmtiles, style, and glyphs stays out of every screen's JS payload, and
// the WebView loads it from disk. scripts/build-map-html.mjs writes it.
const mapDocument = require('../../assets/map/index.html');

// Dev-only relief so the hillshade is visually tunable before the box builds
// the terrain-RGB archive (#78) and the server serves it per layer (#75).
// Release builds configure no terrain source and fetch nothing remote.
const DEV_TERRAIN = __DEV__
  ? {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 13,
      attribution: 'Terrain: USGS 3DEP',
    }
  : undefined;

const CATEGORIES: ObservationCategory[] = ['water', 'food', 'hazard', 'camp', 'note'];

const CATEGORY_TINT: Record<ObservationCategory, string> = {
  water: '#4FA8E8',
  food: '#7BC98A',
  hazard: '#E8735F',
  camp: '#E8C25F',
  note: '#9DB2C6',
};

export default function MapScreen() {
  // A mark=lat,lng launch param opens the observation sheet at that spot,
  // so a chat answer or a test run can drop a pin without a long-press.
  const { mark } = useLocalSearchParams<{ mark?: string }>();
  const serverUrl = useSession((s) => s.serverUrl).trim();
  const observations = useObservations((s) => s.observations);
  const loadObservations = useObservations((s) => s.load);
  const addObservation = useObservations((s) => s.add);
  const removeObservation = useObservations((s) => s.remove);
  const insets = useSafeAreaInsets();
  const [archiveMissing, setArchiveMissing] = useState(false);
  const [documentUri, setDocumentUri] = useState<string>();
  const [mapReady, setMapReady] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [draftCategory, setDraftCategory] = useState<ObservationCategory>('note');
  const [draftNote, setDraftNote] = useState('');
  const [openObs, setOpenObs] = useState<Observation | null>(null);
  const webviewRef = useRef<WebView>(null);
  const lastFixRef = useRef<{ lat: number; lng: number } | null>(null);
  const centeredOnceRef = useRef(false);

  const sendToMap = useCallback((msg: object) => {
    webviewRef.current?.injectJavaScript(
      `window.__native && window.__native(${JSON.stringify(msg)}); true;`,
    );
  }, []);

  useEffect(() => {
    if (mark !== undefined) {
      const [lat, lng] = mark.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setDraft({ lat, lng });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mark]);

  useEffect(() => {
    void Asset.fromModule(mapDocument)
      .downloadAsync()
      .then((asset) => setDocumentUri(asset.localUri ?? asset.uri));
    void loadObservations();
  }, [loadObservations]);

  // Foreground position stream: ask once, then follow at walking resolution.
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) {
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
        (position) => {
          const fix = {
            type: 'fix',
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? 0,
          };
          lastFixRef.current = fix;
          sendToMap(fix);
          // The first fix centers the map the way a maps app opens on you.
          if (!centeredOnceRef.current) {
            centeredOnceRef.current = true;
            sendToMap({ type: 'fly', lat: fix.lat, lng: fix.lng, zoom: 12 });
          }
        },
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [sendToMap]);

  // The observation layer re-renders whenever the store changes.
  useEffect(() => {
    if (mapReady) {
      sendToMap({ type: 'obs', data: observationsToGeoJSON(observations) });
    }
  }, [mapReady, observations, sendToMap]);

  const bootConfig = useMemo(
    () =>
      `window.__MAP_CONFIG = ${JSON.stringify({ serverUrl, terrain: DEV_TERRAIN })}; true;`,
    [serverUrl],
  );

  const saveDraft = async () => {
    if (draft === null) {
      return;
    }
    await addObservation({ ...draft, category: draftCategory, note: draftNote.trim() });
    setDraft(null);
    setDraftNote('');
    setDraftCategory('note');
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Map" back dark />
      {serverUrl === '' ? (
        <View style={styles.empty}>
          <Text style={[typography.body, styles.emptyText]}>No server connected</Text>
          <Text style={[typography.annotation, styles.hint]}>Connect from the home screen</Text>
        </View>
      ) : documentUri === undefined ? (
        <View style={styles.empty}>
          <Text style={[typography.body, styles.emptyText]}>Opening the map</Text>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            allowFileAccess
            allowingReadAccessToURL={documentUri}
            source={{ uri: documentUri }}
            injectedJavaScriptBeforeContentLoaded={bootConfig}
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data) as {
                  type: string;
                  lat?: number;
                  lng?: number;
                  id?: string;
                };
                if (msg.type === 'archive-missing') {
                  setArchiveMissing(true);
                } else if (msg.type === 'loaded') {
                  setArchiveMissing(false);
                  setMapReady(true);
                  const fix = lastFixRef.current;
                  if (fix) {
                    sendToMap(fix);
                    centeredOnceRef.current = true;
                    sendToMap({ type: 'fly', lat: fix.lat, lng: fix.lng, zoom: 12 });
                  }
                } else if (msg.type === 'longpress' && msg.lat !== undefined) {
                  setOpenObs(null);
                  setDraft({ lat: msg.lat, lng: msg.lng! });
                } else if (msg.type === 'obs-tap' && msg.id !== undefined) {
                  setDraft(null);
                  setOpenObs(observations.find((o) => o.id === msg.id) ?? null);
                }
              } catch {
                // Non-JSON messages carry nothing actionable.
              }
            }}
            style={styles.webview}
          />
          {archiveMissing && (
            <View style={styles.banner}>
              <Tag label="No map pack on this server" tone="yellow" />
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Center on my position"
            onPress={() => {
              const fix = lastFixRef.current;
              if (fix) {
                sendToMap({ type: 'fly', lat: fix.lat, lng: fix.lng, zoom: 14 });
              }
            }}
            style={[styles.locateButton, { bottom: insets.bottom + spacing.l }]}
          >
            <Feather name="crosshair" size={22} color={darkHome.ink} />
          </Pressable>
          {draft !== null && (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.m }]}>
              <Text style={styles.sheetTitle}>Mark this spot</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((category) => (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityLabel={`Category ${CATEGORY_LABEL[category]}`}
                    onPress={() => setDraftCategory(category)}
                    style={[
                      styles.chip,
                      draftCategory === category && {
                        borderColor: CATEGORY_TINT[category],
                        backgroundColor: 'rgba(255,255,255,0.06)',
                      },
                    ]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: CATEGORY_TINT[category] }]} />
                    <Text style={styles.chipText}>{CATEGORY_LABEL[category]}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draftNote}
                onChangeText={setDraftNote}
                placeholder="Note (what you saw)"
                placeholderTextColor={darkHome.ink3}
                style={styles.input}
                multiline
              />
              <View style={styles.sheetActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={() => setDraft(null)}
                  style={styles.sheetButton}
                >
                  <Text style={styles.sheetButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save observation"
                  onPress={() => void saveDraft()}
                  style={[styles.sheetButton, styles.sheetButtonPrimary]}
                >
                  <Text style={[styles.sheetButtonText, styles.sheetButtonPrimaryText]}>Save</Text>
                </Pressable>
              </View>
            </View>
          )}
          {openObs !== null && (
            <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.m }]}>
              <View style={styles.noteHeader}>
                <View style={[styles.chipDot, { backgroundColor: CATEGORY_TINT[openObs.category] }]} />
                <Text style={styles.sheetTitle}>{CATEGORY_LABEL[openObs.category]}</Text>
              </View>
              <Text style={styles.noteBody}>{openObs.note || 'No note.'}</Text>
              <View style={styles.sheetActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete observation"
                  onPress={() => {
                    void removeObservation(openObs.id);
                    setOpenObs(null);
                  }}
                  style={styles.sheetButton}
                >
                  <Text style={[styles.sheetButtonText, { color: CATEGORY_TINT.hazard }]}>
                    Delete
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  onPress={() => setOpenObs(null)}
                  style={[styles.sheetButton, styles.sheetButtonPrimary]}
                >
                  <Text style={[styles.sheetButtonText, styles.sheetButtonPrimaryText]}>Close</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkHome.field,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyText: {
    color: darkHome.ink,
  },
  hint: {
    color: darkHome.ink3,
  },
  mapWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B1420',
  },
  banner: {
    position: 'absolute',
    top: spacing.m,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.control,
    padding: spacing.s,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  locateButton: {
    position: 'absolute',
    right: spacing.l,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 32, 48, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(140, 163, 184, 0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 20, 32, 0.97)',
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    padding: spacing.m,
    gap: spacing.s,
    borderTopWidth: 1,
    borderColor: 'rgba(140, 163, 184, 0.25)',
  },
  sheetTitle: {
    ...typography.surfaceTitle,
    color: darkHome.ink,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.s,
    paddingVertical: 7,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: 'rgba(140, 163, 184, 0.3)',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipText: {
    ...typography.annotation,
    color: darkHome.ink,
  },
  input: {
    ...typography.body,
    color: darkHome.ink,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(140, 163, 184, 0.3)',
    borderRadius: radius.control,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteBody: {
    ...typography.body,
    color: darkHome.ink2,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.s,
  },
  sheetButton: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
  },
  sheetButtonPrimary: {
    backgroundColor: 'rgba(79, 168, 232, 0.2)',
    borderWidth: 1,
    borderColor: '#4FA8E8',
  },
  sheetButtonText: {
    ...typography.body,
    color: darkHome.ink2,
  },
  sheetButtonPrimaryText: {
    color: darkHome.ink,
  },
});
