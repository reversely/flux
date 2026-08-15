import { Settings } from 'react-native';
import { create } from 'zustand';

import { ApiClient } from '@/api/client';
import type { JointRecord } from '@/api/types';
import { UploadQueue, type UploadStats } from '@/api/uploadQueue';
import type { CapturedFrame } from '@/capture/types';

// RN's Settings module persists to NSUserDefaults, so the server URL survives
// restarts without adding a native storage dependency (which would force a
// dev-client rebuild). iOS-only, which matches the milestone's device scope.
const SERVER_URL_KEY = 'serverUrl';

export type Connection = 'idle' | 'checking' | 'connected' | 'unreachable';
export type Phase = 'idle' | 'scanning' | 'reviewing';

const zeroStats: UploadStats = { queued: 0, sent: 0, failed: 0 };

interface SessionState {
  serverUrl: string;
  connection: Connection;
  sessionId: string | null;
  phase: Phase;
  results: JointRecord[];
  uploadStats: UploadStats;
  setServerUrl: (url: string) => void;
  connect: () => Promise<void>;
  client: () => ApiClient;
  startScan: () => Promise<string>;
  submitFrame: (frame: CapturedFrame) => void;
  finishScan: () => void;
}

const storedUrl = (): string => (Settings.get(SERVER_URL_KEY) as string | undefined) ?? '';

// The queue is plumbing, not render state, so it lives outside the store.
let activeQueue: UploadQueue | null = null;

export const useSession = create<SessionState>((set, get) => ({
  serverUrl: storedUrl(),
  connection: 'idle',
  sessionId: null,
  phase: 'idle',
  results: [],
  uploadStats: zeroStats,
  setServerUrl: (url) => {
    Settings.set({ [SERVER_URL_KEY]: url });
    set({ serverUrl: url, connection: 'idle' });
  },
  connect: async () => {
    const url = get().serverUrl.trim();
    if (!url) {
      return;
    }
    set({ connection: 'checking' });
    const reachable = await new ApiClient(url).health();
    set({ connection: reachable ? 'connected' : 'unreachable' });
  },
  client: () => new ApiClient(get().serverUrl.trim()),
  startScan: async () => {
    const api = get().client();
    const sessionId = await api.createSession();
    activeQueue?.stop();
    activeQueue = new UploadQueue(
      api,
      sessionId,
      (results) => set({ results }),
      (uploadStats) => set({ uploadStats }),
    );
    set({ sessionId, phase: 'scanning', results: [], uploadStats: zeroStats });
    return sessionId;
  },
  submitFrame: (frame) => {
    activeQueue?.enqueue(frame);
  },
  finishScan: () => {
    activeQueue?.stop();
    activeQueue = null;
    set({ phase: 'reviewing' });
  },
}));
