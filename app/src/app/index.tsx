import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeBackdrop } from '@/components/HomeBackdrop';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { ConditionsStrip } from '@/components/ConditionsStrip';
import { WidgetDirectory } from '@/components/WidgetDirectory';
import { REFERENCE_TITLE } from '@/data/reference';
import { useChat } from '@/store/chat';
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

/**
 * The wordmark's header row, above even the icon bar. Full size at rest
 * with its own air; scrolling shrinks it into a compact line at the top,
 * the collapse the home had before the directory landed (#207, #179).
 */
function WordmarkHeader({ scrollY }: { scrollY: SharedValue<number> }) {
  const insets = useSafeAreaInsets();
  const box = useAnimatedStyle(() => ({
    height: insets.top + interpolate(scrollY.value, [0, 96], [84, 40], Extrapolation.CLAMP),
  }));
  const text = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollY.value, [0, 96], [1, 0.55], Extrapolation.CLAMP) },
    ],
  }));
  return (
    <Animated.View style={[styles.wordmarkHeader, { paddingTop: insets.top }, box]}>
      <Animated.Text style={[styles.wordmarkHero, text]}>LifeKit</Animated.Text>
    </Animated.View>
  );
}

export default function ChatHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ask } = useLocalSearchParams<{ ask?: string }>();
  const send = useChat((s) => s.send);
  const startNew = useChat((s) => s.startNew);
  const loadChats = useChat((s) => s.load);
  const [draft, setDraft] = useState('');
  const askedRef = useRef<string | undefined>(undefined);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

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
      startNew();
      void send(ask);
      router.push('/chat');
    }
  }, [ask, send, startNew, router]);

  const submit = () => {
    const question = draft.trim();
    if (!question) {
      return;
    }
    setDraft('');
    // Home always opens a fresh thread; continuing one happens on the
    // chat screen or from history.
    startNew();
    void send(question);
    router.push('/chat');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <HomeBackdrop scrollY={scrollY} />
      <WordmarkHeader scrollY={scrollY} />
      {/* The empty-state wordmark carries the name; a title here spills
          against six buttons on narrow screens (#179). */}
      <TopBar title="" dark flat>
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
          icon="clock"
          label="Chat history"
          color={darkHome.ink2}
          onPress={() => router.push('/chats')}
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
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.homeScroll}
          showsVerticalScrollIndicator={false}
        >
          <ConditionsStrip />
          <View style={styles.empty}>
            <Animated.View entering={FadeInDown.duration(450)}>
              <Text style={[typography.body, styles.tagline]}>your offline AI field guide to the world. </Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(450).delay(120)}>
              <QuestionGallery
                onAsk={(question) => {
                  startNew();
                  void send(question);
                  router.push('/chat');
                }}
              />
            </Animated.View>
          </View>
          <View style={styles.inputArea}>
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
          {/* The whole widget registry scrolls in under the chat face, so
              every camera surface is reachable from the first screen. */}
          <Animated.View entering={FadeInUp.duration(450).delay(240)}>
            <WidgetDirectory />
          </Animated.View>
        </Animated.ScrollView>
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
  homeScroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  empty: {
    minHeight: 360,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.m,
  },
  wordmarkHeader: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.s,
  },
  wordmarkHero: {
    ...typography.display,
    color: darkHome.ink,
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
  inputArea: {
    alignSelf: 'stretch',
    gap: spacing.s,
    paddingTop: spacing.xl,
    borderTopWidth: 0,
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
