import { Pressable, StyleSheet, Text } from 'react-native';

import type { Citation } from '@/api/types';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

/**
 * Chapter-and-section chip under an assistant answer. Navigation to the block
 * reader arrives with the encyclopedia screens; until then the chip is the
 * visible provenance of the sentence above it.
 */
export function CitationChip({ citation, onPress }: { citation: Citation; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chapter ${citation.chapter_number}, ${citation.section_title}`}
      onPress={onPress}
      disabled={!onPress}
      style={styles.chip}
    >
      <Text style={[typography.tag, styles.chapter]}>{`Ch ${citation.chapter_number}`}</Text>
      <Text style={[typography.tag, styles.section]} numberOfLines={1}>
        {citation.section_title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: sizes.chip,
    borderRadius: radius.chip,
    backgroundColor: colors.signatureSoft,
    paddingHorizontal: spacing.m,
    gap: spacing.s,
    maxWidth: 260,
  },
  chapter: {
    color: colors.signature,
  },
  section: {
    color: colors.ink2,
    flexShrink: 1,
  },
});
