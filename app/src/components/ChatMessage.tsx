import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import type { ChatQueueNote, ChatSource } from '@/api/types';
import { AnswerText } from '@/components/AnswerText';
import { launchTool } from '@/lib/launch';
import type { ChatMessage as ChatMessageRecord } from '@/store/chat';
import { darkHome } from '@/theme/biome';
import { aeonikFace } from '@/theme/fonts';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

/**
 * The research-queue note under an unsourced answer (#194): whether this
 * question added its topic to the library queue or found it already there.
 */
function QueueLine({ queued }: { queued?: ChatQueueNote }) {
  if (!queued) {
    return null;
  }
  const added = queued.state === 'added';
  return (
    <View style={styles.sourceLine}>
      <Feather name={added ? 'plus-circle' : 'clock'} size={12} color={colors.ink3} />
      <Text style={styles.sourceLabel}>
        {added ? `Queued for the library: ${queued.topic}` : `In the library queue: ${queued.topic}`}
      </Text>
    </View>
  );
}

/**
 * One book line under an answer that quotes pack passages (#186): the
 * chapters the sources cite, tapping into the reference. Chapter numbers
 * parse from the pack's chapter ids ("fm21-76-ch06"); an id that does not
 * carry one drops out rather than rendering a broken link.
 */
function SourceLine({ sources }: { sources?: ChatSource[] }) {
  const router = useRouter();
  const chapters = [
    ...new Set(
      (sources ?? [])
        .map((s) => /ch(\d+)$/.exec(s.chapter_id)?.[1])
        .filter((n): n is string => n !== undefined)
        .map((n) => String(Number(n))),
    ),
  ];
  if (chapters.length === 0) {
    return null;
  }
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/reference', params: { chapter: chapters[0] } })}
      style={styles.sourceLine}
    >
      <Feather name="book-open" size={12} color={colors.ink3} />
      <Text style={styles.sourceLabel}>
        {chapters.length === 1 ? `chapter ${chapters[0]}` : `chapters ${chapters.join(', ')}`}
      </Text>
    </Pressable>
  );
}

export function ChatMessage({ message }: { message: ChatMessageRecord }) {
  const router = useRouter();
  if (message.role === 'user') {
    return (
      <Animated.View entering={FadeInUp.duration(250)} style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{message.text}</Text>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={FadeInUp.duration(250)} style={[styles.bubble, styles.assistantBubble]}>
      {message.pending ? (
        <ActivityIndicator color={colors.ink3} />
      ) : (
        <AnswerText text={message.text} />
      )}
      {message.tool && (
        <Pressable
          accessibilityRole="button"
          onPress={() => launchTool(router, message.tool!)}
          style={styles.tool}
        >
          <Feather name="video" size={14} color={colors.signature} />
          <Text style={styles.toolLabel}>{message.tool.label}</Text>
        </Pressable>
      )}
      <SourceLine sources={message.sources} />
      <QueueLine queued={message.queued} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.surface,
    padding: spacing.l,
    gap: spacing.m,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.signature,
  },
  userText: {
    ...typography.body,
    color: darkHome.ink,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
  },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    height: sizes.chip,
    borderRadius: radius.chip,
    backgroundColor: colors.signatureSoft,
    paddingHorizontal: spacing.m,
  },
  toolLabel: {
    ...aeonikFace('medium'),
    fontSize: 12,
    color: colors.signature,
  },
  sourceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  sourceLabel: {
    ...aeonikFace('regular'),
    fontSize: 12,
    color: colors.ink3,
  },
});
