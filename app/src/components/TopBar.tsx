import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizes, spacing, typography } from '@/theme/tokens';

type IconName = ComponentProps<typeof Feather>['name'];

export function TopBarButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={styles.action}
    >
      <Feather name={icon} size={20} color={colors.ink2} />
    </Pressable>
  );
}

/** 56px app bar on the card surface; back chevron appears off the home screen. */
export function TopBar({
  title,
  back,
  children,
}: {
  title: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: sizes.topBar + insets.top }]}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.action}
        >
          <Feather name="chevron-left" size={20} color={colors.ink2} />
        </Pressable>
      )}
      <Text style={[typography.surfaceTitle, styles.title]}>{title}</Text>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingHorizontal: spacing.l,
    gap: spacing.s,
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
