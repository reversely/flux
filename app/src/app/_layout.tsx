import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { fontAssets } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [fontsReady] = useFonts(fontAssets);
  if (!fontsReady && Object.keys(fontAssets).length > 0) {
    return null;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      />
    </GestureHandlerRootView>
  );
}
