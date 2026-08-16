import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated as RNAnimated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ChatQueueNote, ChatSource } from '@/api/types';
import { AnswerText } from '@/components/AnswerText';
import { HomeBackdrop } from '@/components/HomeBackdrop';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { REFERENCE_TITLE } from '@/data/reference';
import { launchTool } from '@/lib/launch';
import { type ChatMessage, useChat } from '@/store/chat';
import { useSession } from '@/store/session';
import { darkHome } from '@/theme/biome';
import { aeonikFace } from '@/theme/fonts';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

// The gallery pool: one question per tile subject, phrased the way a user
// asks. Tapping one sends it as-is.
const GALLERY_QUESTIONS = [
  'How do I purify water?',
  'Which berries are safe to eat?',
  'Ring around the moon. What does it mean?',
  'Which way is north without a compass?',
  'How do I keep a fire going in rain?',
  'How do I treat a blister on trail?',
  'Something bit me. What now?',
  'How do I signal a plane?',
  'Can I eat this mushroom?',
] as const;

const GALLERY_VISIBLE = 3;
const GALLERY_ROTATE_MS = 5000;

/** Three questions at a time, fading to the next three on a timer. */
function QuestionGallery({ onAsk }: { onAsk: (question: string) => void }) {
  const [start, setStart] = useState(0);
  const opacity = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      RNAnimated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(
        () => {
          setStart((v) => (v + GALLERY_VISIBLE) % GALLERY_QUESTIONS.length);
          RNAnimated.timing(opacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        },
      );
    }, GALLERY_ROTATE_MS);
    return () => clearInterval(timer);
  }, [opacity]);

  const visible = Array.from(
    { length: GALLERY_VISIBLE },
    (_, i) => GALLERY_QUESTIONS[(start + i) % GALLERY_QUESTIONS.length],
  );

  return (
    <RNAnimated.View style={[styles.gallery, { opacity }]}>
      {visible.map((question) => (
        <Pressable
          key={question}
          accessibilityRole="button"
          accessibilityLabel={`Ask: ${question}`}
          onPress={() => onAsk(question)}
          style={({ pressed }) => [styles.galleryChip, pressed && styles.galleryChipPressed]}
        >
          <Text style={styles.galleryText}>{question}</Text>
        </Pressable>
      ))}
    </RNAnimated.View>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const router = useRouter();
  if (message.role === 'user') {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{message.text}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, styles.assistantBubble]}>
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
    </View>
  );
}

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

export default function ChatHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ask } = useLocalSearchParams<{ ask?: string }>();
  const { messages, send } = useChat();
  const [draft, setDraft] = useState('');
  const listRef = useRef<Animated.FlatList<ChatMessage>>(null);
  const askedRef = useRef<string | undefined>(undefined);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Silent health check of the stored server URL, once per launch.
  useEffect(() => {
    if (useSession.getState().serverUrl) {
      void useSession.getState().connect();
    }
  }, []);

  // A tool launch of kind 'chat' lands here with the question to ask.
  useEffect(() => {
    if (ask && ask !== askedRef.current) {
      askedRef.current = ask;
      void send(ask);
    }
  }, [ask, send]);

  const submit = () => {
    const question = draft.trim();
    if (!question) {
      return;
    }
    setDraft('');
    void send(question);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <HomeBackdrop scrollY={scrollY} />
      {/* The empty-state wordmark carries the name; a title here spills
          against six buttons on narrow screens (#179). */}
      <TopBar title="" dark>
        <TopBarButton
          icon="video"
          label="Video mode"
          color={darkHome.ink2}
          onPress={() => router.push('/capture')}
        />
        <TopBarButton
          icon="book-open"
          label="View encyclopedia"
          color={darkHome.ink2}
          onPress={() => router.push('/encyclopedia')}
        />
        <TopBarButton
          icon="map"
          label="Map"
          color={darkHome.ink2}
          onPress={() => router.push('/map')}
        />
        <TopBarButton
          icon="sun"
          label="Conditions"
          color={darkHome.ink2}
          onPress={() => router.push('/conditions')}
        />
        <TopBarButton
          icon="server"
          label="Server"
          color={darkHome.ink2}
          onPress={() => router.push('/connect')}
        />
      </TopBar>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.wordmark}>LifeKit</Text>
            <Text style={[typography.body, styles.tagline]}>your offline AI field guide to the world. </Text>
            <QuestionGallery onAsk={(question) => void send(question)} />
          </View>
        ) : (
          <Animated.FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Message message={item} />}
            contentContainerStyle={styles.list}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, spacing.m) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask a question"
              placeholderTextColor={darkHome.ink3}
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={submit}
              disabled={!draft.trim()}
              style={[styles.send, !draft.trim() && styles.sendDisabled]}
            >
              <Feather name="arrow-up" size={20} color={darkHome.ink} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/reference')}
            style={styles.sourceRow}
          >
            <Text style={styles.sourceText}>Answers adapt {REFERENCE_TITLE}. Read the full text.</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkHome.field,
  },
  body: {
    flex: 1,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.m,
  },
  wordmark: {
    ...typography.display,
    color: darkHome.ink,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    color: darkHome.ink2,
    marginBottom: spacing.xl,
  },
  gallery: {
    alignSelf: 'stretch',
    gap: spacing.s,
  },
  galleryChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
    borderRadius: radius.control,
    backgroundColor: 'rgba(11, 17, 24, 0.55)',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
  },
  galleryChipPressed: {
    borderColor: colors.signature,
  },
  galleryText: {
    ...typography.listBody,
    color: darkHome.ink,
    textAlign: 'center',
  },
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
  inputArea: {
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    backgroundColor: 'rgba(11, 17, 24, 0.70)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: darkHome.line,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  input: {
    flex: 1,
    height: sizes.control,
    borderWidth: 1,
    borderColor: darkHome.line,
    borderRadius: radius.control,
    paddingHorizontal: spacing.m,
    color: darkHome.ink,
    fontSize: 15,
  },
  send: {
    height: sizes.control,
    width: sizes.control,
    borderRadius: sizes.control / 2,
    backgroundColor: colors.signature,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sourceRow: {
    alignSelf: 'center',
  },
  sourceText: {
    ...typography.annotation,
    color: darkHome.ink3,
    textAlign: 'center',
  },
});
