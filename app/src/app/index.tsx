import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
    </View>
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
      <TopBar title="LifeKit" dark>
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
            <Text style={[typography.body, styles.emptyText]}>
              Please ask a question about first aid, shelter, fire, water, food, animals, or
              finding your way.
            </Text>
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
    paddingHorizontal: spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
    color: darkHome.ink2,
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
