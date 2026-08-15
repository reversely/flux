import { create } from 'zustand';

import { askChat } from '@/api/chat';
import type { ChatAnswer, ChatTool } from '@/api/types';
import { useSession } from '@/store/session';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tool?: ChatTool;
  pending?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  send: (question: string) => Promise<void>;
}

let nextId = 0;
const id = () => `m${++nextId}`;

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

export const useChat = create<ChatState>((set) => ({
  messages: [],
  send: async (question) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    const pendingId = id();
    set((s) => ({
      messages: [
        ...s.messages,
        { id: id(), role: 'user', text: trimmed },
        { id: pendingId, role: 'assistant', text: '', pending: true },
      ],
    }));
    const answer = await answerFor(trimmed);
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === pendingId ? { ...m, text: answer.text, tool: answer.tool, pending: false } : m,
      ),
    }));
  },
}));
