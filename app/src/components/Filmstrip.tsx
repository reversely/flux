import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

interface Props {
  frameIds: string[];
  selectedFrameId: string;
  frameUrl: (frameId: string) => string;
  onSelect: (frameId: string) => void;
}

export function Filmstrip({ frameIds, selectedFrameId, frameUrl, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.content}
    >
      {frameIds.map((frameId) => (
        <Pressable key={frameId} onPress={() => onSelect(frameId)}>
          <Image
            style={[styles.thumb, frameId === selectedFrameId && styles.thumbSelected]}
            source={{ uri: frameUrl(frameId) }}
            contentFit="cover"
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
    backgroundColor: colors.paper,
  },
  content: {
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
  },
  thumb: {
    width: 88,
    height: 60,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbSelected: {
    borderColor: colors.signature,
  },
});
