import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/tokens';

export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={typography.pageTitle}>flux</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
