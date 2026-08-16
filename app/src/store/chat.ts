import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

import { askChat } from '@/api/chat';
import type { ChatAnswer, ChatQueueNote, ChatSource, ChatTool } from '@/api/types';
import { useSession } from '@/store/session';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tool?: ChatTool;
  sources?: ChatSource[];
  queued?: ChatQueueNote;
  pending?: boolean;
}

export interface ChatThread {
  id: string;
  /** The first question, trimmed for the history list. */
  title: string;
  startedAt: string;
  messages: ChatMessage[];
}

interface ChatState {
  /** Newest thread first. Every thread persists to disk. */
  threads: ChatThread[];
  activeId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  send: (question: string) => Promise<void>;
  open: (threadId: string) => void;
  startNew: () => void;
}

const FILE = `${FileSystem.documentDirectory}chats.json`;

let nextId = 0;
const id = (prefix: string) => `${prefix}${Date.now().toString(36)}_${++nextId}`;

async function persist(threads: ChatThread[]): Promise<void> {
  await FileSystem.writeAsStringAsync(FILE, JSON.stringify(threads));
}

// The connected server answers; without one (or on failure) the canned mock
// keeps the offline dev loop alive.
async function answerFor(question: string): Promise<ChatAnswer> {
  const { connection, client } = useSession.getState();
  if (connection === 'connected') {
    try {
      return await client().chat(question);
    } catch {
      return askChat(question);
    }
  }
  return askChat(question);
}

export const useChat = create<ChatState>((set, get) => ({
  threads: [],
  activeId: null,
  loaded: false,

  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(FILE);
      if (info.exists) {
        const threads: ChatThread[] = JSON.parse(await FileSystem.readAsStringAsync(FILE));
        // An answer that was pending when the app closed never arrived;
        // the empty bubble drops rather than replaying as a spinner.
        for (const thread of threads) {
          thread.messages = thread.messages.filter((m) => m.pending !== true);
        }
        set({ threads, loaded: true });
        return;
      }
    } catch {
      // An unreadable history starts fresh; the file rewrites on next send.
    }
    set({ loaded: true });
  },

  open: (threadId) => {
    if (get().threads.some((t) => t.id === threadId)) {
      set({ activeId: threadId });
    }
  },

  startNew: () => set({ activeId: null }),

  send: async (question) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    let threadId = get().activeId;
    if (threadId === null || !get().threads.some((t) => t.id === threadId)) {
      threadId = id('t');
      const thread: ChatThread = {
        id: threadId,
        title: trimmed.slice(0, 80),
        startedAt: new Date().toISOString(),
        messages: [],
      };
      set((s) => ({ threads: [thread, ...s.threads], activeId: threadId }));
    }
    const pendingId = id('m');
    const append = (messages: ChatMessage[]) =>
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, ...messages] } : t,
        ),
      }));
    append([
      { id: id('m'), role: 'user', text: trimmed },
      { id: pendingId, role: 'assistant', text: '', pending: true },
    ]);
    const answer = await answerFor(trimmed);
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.id === pendingId
                  ? {
                      ...m,
                      text: answer.text,
                      tool: answer.tool,
                      sources: answer.sources,
                      queued: answer.queued,
                      pending: false,
                    }
                  : m,
              ),
            }
          : t,
      ),
    }));
    void persist(get().threads).catch(() => {
      // A failed write loses nothing in memory; the next send retries.
    });
  },
}));

// A stable empty list, so the selector's snapshot is referentially equal
// across renders when no thread is active.
const NO_MESSAGES: ChatMessage[] = [];

/** The active thread's messages; empty before the first send. */
export function useActiveMessages(): ChatMessage[] {
  return useChat((s) => s.threads.find((t) => t.id === s.activeId)?.messages ?? NO_MESSAGES);
}
