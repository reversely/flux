import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { MAP_HTML } from '@/map/mapHtml.generated';
import { useSession } from '@/store/session';
import { colors, radius, spacing, typography } from '@/theme/tokens';

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

export default function MapScreen() {
  const serverUrl = useSession((s) => s.serverUrl).trim();
  const [archiveMissing, setArchiveMissing] = useState(false);

  const bootConfig = useMemo(
    () =>
      `window.__MAP_CONFIG = ${JSON.stringify({ serverUrl, terrain: DEV_TERRAIN })}; true;`,
    [serverUrl],
  );

  return (
    <View style={styles.screen}>
      <TopBar title="Map" back />
      {serverUrl === '' ? (
        <View style={styles.empty}>
          <Text style={typography.body}>No server connected</Text>
          <Text style={[typography.annotation, styles.hint]}>Connect from the home screen</Text>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <WebView
            originWhitelist={['*']}
            source={{ html: MAP_HTML }}
            injectedJavaScriptBeforeContentLoaded={bootConfig}
            onMessage={(event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data) as { type: string };
                if (msg.type === 'archive-missing') {
                  setArchiveMissing(true);
                } else if (msg.type === 'loaded') {
                  setArchiveMissing(false);
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  hint: {
    color: colors.ink3,
  },
  mapWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.paper,
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
});
