import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
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

import { ChatMessage } from '@/components/ChatMessage';
import { PageBackdrop } from '@/components/PageBackdrop';
import { TopBar } from '@/components/TopBar';
import { type ChatMessage as ChatMessageRecord, useActiveMessages, useChat } from '@/store/chat';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { radius, sizes, spacing } from '@/theme/tokens';

/**
 * One chat thread. The home screen stays the anchor; a send lands here,
 * and a history row reopens its thread with the transcript intact. The
 * ask parameter carries a question sent from home; the id parameter
 * reopens a saved thread.
 */
export default function ChatThread() {
  const { id: threadId } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const send = useChat((s) => s.send);
  const open = useChat((s) => s.open);
  const messages = useActiveMessages();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessageRecord>>(null);

  useEffect(() => {
    if (threadId) {
      open(threadId);
    }
  }, [threadId, open]);

  const submit = () => {
    const question = draft.trim();
    if (!question) {
      return;
    }
    setDraft('');
    void send(question);
  };

  return (
    <View style={dark.screen}>
      <PageBackdrop />
      <TopBar title="Chat" back dark />
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatMessage message={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  inputArea: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    backgroundColor: 'rgba(11, 17, 24, 0.70)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: darkHome.line,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  input: {
    flex: 1,
    height: sizes.control,
    borderRadius: radius.control,
    paddingHorizontal: spacing.l,
    backgroundColor: 'rgba(230, 237, 242, 0.08)',
    color: darkHome.ink,
  },
  send: {
    width: sizes.control,
    height: sizes.control,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 237, 242, 0.14)',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
