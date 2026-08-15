import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { darkHome } from '@/theme/biome';
import { colors, sizes, spacing, typography } from '@/theme/tokens';

type IconName = ComponentProps<typeof Feather>['name'];

export function TopBarButton({
  icon,
  label,
  onPress,
  color = colors.ink2,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={styles.action}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
  );
}

/**
 * 56px app bar. Light screens give it the card surface; the dark home lays
 * it transparently over the backdrop (chrome approaches zero there).
 */
export function TopBar({
  title,
  back,
  dark,
  children,
}: {
  title: string;
  back?: boolean;
  dark?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      style={[
        styles.bar,
        dark ? styles.barDark : styles.barLight,
        { paddingTop: insets.top, height: sizes.topBar + insets.top },
      ]}
    >
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          // A deep-linked screen sits alone in the stack; back falls through home.
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={8}
          style={styles.action}
        >
          <Feather name="chevron-left" size={20} color={dark ? darkHome.ink2 : colors.ink2} />
        </Pressable>
      )}
      <Text style={[typography.surfaceTitle, styles.title, dark && { color: darkHome.ink }]}>
        {title}
      </Text>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.l,
    gap: spacing.s,
  },
  barLight: {
    backgroundColor: colors.card,
    borderBottomColor: colors.line,
  },
  barDark: {
    backgroundColor: 'transparent',
    borderBottomColor: darkHome.line,
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
  },
  action: {
    height: sizes.control,
    minWidth: sizes.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
