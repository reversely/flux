import * as Device from 'expo-device';
import { Settings } from 'react-native';
import { create } from 'zustand';

import { ApiClient } from '@/api/client';
import { UploadQueue, type UploadStatus } from '@/api/uploadQueue';

// RN's Settings module persists to NSUserDefaults, so the server URL survives
// restarts without adding a native storage dependency (which would force a
// dev-client rebuild). iOS-only, which matches the device scope.
const SERVER_URL_KEY = 'serverUrl';

export type Connection = 'idle' | 'checking' | 'connected' | 'unreachable';
export type ClipStatus = 'pending' | UploadStatus;

export interface ClipEntry {
  id: string;
  capturedAt: string;
  status: ClipStatus;
}

interface SessionState {
  serverUrl: string;
  connection: Connection;
  captureSessionId: string | null;
  clips: ClipEntry[];
  setServerUrl: (url: string) => void;
  connect: () => Promise<void>;
  client: () => ApiClient;
  ensureCaptureSession: () => Promise<void>;
  submitClip: (uri: string, capturedAt: string, mimeType: string) => void;
}

// The simulator shares the Mac's network stack, so the stub is on localhost.
const SIMULATOR_DEFAULT_URL = Device.isDevice ? '' : 'http://localhost:8000';

// Settings exists only on iOS; on Android, web, and the router's node
// prerender it is undefined, and this module loads during prerender (#156).
const storedUrl = (): string =>
  (Settings?.get?.(SERVER_URL_KEY) as string | undefined) ?? SIMULATOR_DEFAULT_URL;

// The queue is plumbing, not render state, so it lives outside the store and
// keeps draining after the capture screen unmounts.
let activeQueue: UploadQueue | null = null;
let clipCounter = 0;

export const useSession = create<SessionState>((set, get) => ({
  serverUrl: storedUrl(),
  connection: 'idle',
  captureSessionId: null,
  clips: [],
  setServerUrl: (url) => {
    Settings?.set?.({ [SERVER_URL_KEY]: url });
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
  // One server session covers all recordings until the app restarts; each
  // clip uploads tagged to it. Throws when the server cannot create one.
  ensureCaptureSession: async () => {
    if (get().captureSessionId !== null) {
      return;
    }
    const api = get().client();
    const sessionId = await api.createSession();
    activeQueue?.stop();
    activeQueue = new UploadQueue(api, sessionId, (clipId, status) => {
      set((state) => ({
        clips: state.clips.map((c) => (c.id === clipId ? { ...c, status } : c)),
      }));
    });
    set({ captureSessionId: sessionId, clips: [] });
  },
  submitClip: (uri, capturedAt, mimeType) => {
    if (activeQueue === null) {
      return;
    }
    clipCounter += 1;
    const id = `clip-${clipCounter}`;
    set((state) => ({ clips: [...state.clips, { id, capturedAt, status: 'pending' }] }));
    activeQueue.enqueue({ id, uri, capturedAt, mimeType });
  },
}));
