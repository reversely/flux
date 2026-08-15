import { create } from 'zustand';

import { askChat } from '@/api/chat';
import type { Citation } from '@/api/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations: Citation[];
  pending?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  send: (question: string) => Promise<void>;
}

let nextId = 0;
const id = () => `m${++nextId}`;

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
        { id: id(), role: 'user', text: trimmed, citations: [] },
        { id: pendingId, role: 'assistant', text: '', citations: [], pending: true },
      ],
    }));
    const answer = await askChat(trimmed);
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === pendingId
          ? { ...m, text: answer.text, citations: answer.citations, pending: false }
          : m,
      ),
    }));
  },
}));
