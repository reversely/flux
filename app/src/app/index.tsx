import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CitationChip } from '@/components/CitationChip';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { type ChatMessage, useChat } from '@/store/chat';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

function Message({ message }: { message: ChatMessage }) {
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
        <Text style={typography.body}>{message.text}</Text>
      )}
      {message.citations.length > 0 && (
        <View style={styles.citationRow}>
          {message.citations.map((c) => (
            <CitationChip key={c.anchor} citation={c} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function ChatHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { messages, send } = useChat();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Silent health check of the stored server URL, once per launch.
  useEffect(() => {
    if (useSession.getState().serverUrl) {
      void useSession.getState().connect();
    }
  }, []);

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
      <TopBar title="LifeKit">
        <TopBarButton icon="video" label="Video mode" onPress={() => router.push('/capture')} />
        <TopBarButton
          icon="book-open"
          label="View encyclopedia"
          onPress={() => router.push('/encyclopedia')}
        />
        <TopBarButton icon="map" label="Map" onPress={() => router.push('/map')} />
        <TopBarButton icon="server" label="Server" onPress={() => router.push('/connect')} />
      </TopBar>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[typography.body, styles.emptyText]}>
              Please ask a question about first aid, shelter, fire, water, food, animals, or
              finding your way. Answers cite their chapter and section in the manual.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Message message={item} />}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />
        )}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.m) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask a question"
            placeholderTextColor={colors.ink3}
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
            <Feather name="arrow-up" size={20} color={colors.card} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
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
    color: colors.card,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  citationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    height: sizes.control,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: spacing.m,
    color: colors.ink,
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
});
