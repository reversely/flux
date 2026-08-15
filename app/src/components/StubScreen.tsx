import { StyleSheet, Text, View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { colors, spacing, typography } from '@/theme/tokens';

/** Placeholder body for a routed screen whose build is a later ticket. */
export function StubScreen({ title }: { title: string }) {
  return (
    <View style={styles.screen}>
      <TopBar title={title} back />
      <View style={styles.body}>
        <Text style={[typography.body, styles.text]}>
          This screen is not built yet. Please use chat from the home screen.
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
    paddingHorizontal: spacing.xxl,
  },
  text: {
    textAlign: 'center',
  },
});
