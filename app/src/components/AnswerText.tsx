import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Text } from 'react-native';

import { colors, typography } from '@/theme/tokens';

const CHAPTER_MENTION = /([Cc]hapter\s+(\d+))/g;

/**
 * Answer prose with every "chapter N" mention rendered as a hyperlink into
 * the full-text reference. The deterministic client-side pass keeps the wire
 * shape plain text.
 */
export function AnswerText({ text }: { text: string }) {
  const router = useRouter();
  const parts = text.split(CHAPTER_MENTION);
  // split with two capture groups yields [prose, mention, number, ...] tuples.
  const nodes = [];
  for (let i = 0; i < parts.length; i += 3) {
    nodes.push(<Fragment key={i}>{parts[i]}</Fragment>);
    if (parts[i + 1]) {
      const chapter = parts[i + 2];
      nodes.push(
        <Text
          key={`link-${i}`}
          accessibilityRole="link"
          style={{ color: colors.signature, textDecorationLine: 'underline' }}
          onPress={() => router.push({ pathname: '/reference', params: { chapter } })}
        >
          {parts[i + 1]}
        </Text>,
      );
    }
  }
  return <Text style={typography.body}>{nodes}</Text>;
}
