import { Asset } from 'expo-asset';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { TopBar } from '@/components/TopBar';
import { chapterPage, REFERENCE_TITLE, referencePdf } from '@/data/reference';
import { colors, spacing, typography } from '@/theme/tokens';

/** The bundled FM 21-76 scan, opened at a chapter when one is requested. */
export default function Reference() {
  const { chapter } = useLocalSearchParams<{ chapter?: string }>();
  const [uri, setUri] = useState<string>();

  useEffect(() => {
    if (referencePdf === null) {
      return;
    }
    void Asset.fromModule(referencePdf)
      .downloadAsync()
      .then((asset) => setUri(asset.localUri ?? asset.uri));
  }, []);

  const page = chapter ? chapterPage(Number(chapter)) : undefined;

  return (
    <View style={styles.screen}>
      <TopBar title={REFERENCE_TITLE} back />
      {referencePdf === null ? (
        <View style={styles.empty}>
          <Text style={[typography.body, styles.emptyText]}>
            The manual PDF is not installed on this build. Please place
            FM21-76_SurvivalManual.pdf at the repo root and run npm install in app/.
          </Text>
        </View>
      ) : uri ? (
        <WebView
          style={styles.viewer}
          originWhitelist={['*']}
          allowFileAccess
          allowingReadAccessToURL={uri}
          source={{ uri: page ? `${uri}#page=${page}` : uri }}
        />
      ) : (
        <View style={styles.empty}>
          <Text style={typography.body}>Opening the manual.</Text>
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
  viewer: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
  },
});
