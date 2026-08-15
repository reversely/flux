import { StyleSheet, Text, View } from 'react-native';

import { radius, sizes, tagColors, typography } from '@/theme/tokens';

export type TagTone = keyof typeof tagColors;

export function Tag({ label, tone }: { label: string; tone: TagTone }) {
  const palette = tagColors[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      <Text style={[typography.tag, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderRadius: radius.tag,
    height: sizes.tag,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
