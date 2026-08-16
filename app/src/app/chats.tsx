import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { TopBar } from '@/components/TopBar';
import { useChat } from '@/store/chat';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { radius, spacing, typography } from '@/theme/tokens';

/** Saved chats, newest first; a row reopens its thread. */
export default function ChatHistory() {
  const router = useRouter();
  const threads = useChat((s) => s.threads);

  return (
    <View style={dark.screen}>
      <PageBackdrop />
      <TopBar title="Chats" back dark />
      {threads.length === 0 ? (
        <Text style={[typography.body, styles.emptyNote]}>
          Nothing yet. Questions asked on the home screen save here.
        </Text>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => router.push({ pathname: '/chat', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowLine}>
                  {new Date(item.startedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {`, ${item.messages.length} messages`}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={darkHome.ink3} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyNote: {
    padding: spacing.xl,
    color: darkHome.ink2,
  },
  list: {
    padding: spacing.l,
    gap: spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    borderRadius: radius.control,
    backgroundColor: 'rgba(230, 237, 242, 0.06)',
  },
  rowPressed: {
    backgroundColor: 'rgba(230, 237, 242, 0.12)',
  },
  rowText: {
    gap: 2,
    flexShrink: 1,
  },
  rowTitle: {
    ...typography.listBody,
    color: darkHome.ink,
  },
  rowLine: {
    ...typography.annotation,
    color: darkHome.ink3,
  },
});
