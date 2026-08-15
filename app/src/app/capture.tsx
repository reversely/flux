import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { colors, spacing, typography } from '@/theme/tokens';

/**
 * Recording arrives with the capture ticket. The screen already accepts the
 * launch params (prime selects the model context, subject the target) so a
 * tool launch from chat or a guide lands preloaded.
 */
export default function Capture() {
  const { prime, subject } = useLocalSearchParams<{ prime?: string; subject?: string }>();
  return (
    <View style={styles.screen}>
      <TopBar title="Video mode" back />
      <View style={styles.body}>
        {(prime || subject) && (
          <View style={styles.primeRow}>
            {prime ? <Tag label={prime} tone="blue" /> : null}
            {subject ? <Tag label={subject} tone="gray" /> : null}
          </View>
        )}
        <Text style={[typography.body, styles.text]}>
          The camera is not built yet. When it is, it will open preloaded for the task shown
          above.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.l,
  },
  primeRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  text: {
    textAlign: 'center',
  },
});
