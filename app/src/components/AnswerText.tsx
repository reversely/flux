import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { Text } from 'react-native';

import { colors, typography } from '@/theme/tokens';

const CHAPTER_MENTION = /([Cc]hapter\s+(\d+))/g;

/**
 * The prompt forbids markdown, but a small model still slips asterisks,
 * heading hashes, and backticks into an answer; rendering them raw reads
 * as broken. Strip the markup, keep the words.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{2}([^_]+)_{2}/g, '$1')
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '· ');
}

/**
 * Answer prose with every "chapter N" mention rendered as a hyperlink into
 * the full-text reference. The deterministic client-side pass keeps the wire
 * shape plain text.
 */
export function AnswerText({
  text,
  color,
  linkColor = colors.signature,
}: {
  text: string;
  color?: string;
  linkColor?: string;
}) {
  const router = useRouter();
  const parts = stripMarkdown(text).split(CHAPTER_MENTION);
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
