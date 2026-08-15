import { Settings } from 'react-native';
import { create } from 'zustand';

import { ApiClient } from '@/api/client';

// RN's Settings module persists to NSUserDefaults, so the server URL survives
// restarts without adding a native storage dependency (which would force a
// dev-client rebuild). iOS-only, which matches the device scope.
const SERVER_URL_KEY = 'serverUrl';

export type Connection = 'idle' | 'checking' | 'connected' | 'unreachable';

interface SessionState {
  serverUrl: string;
  connection: Connection;
  setServerUrl: (url: string) => void;
  connect: () => Promise<void>;
  client: () => ApiClient;
}

const storedUrl = (): string => (Settings.get(SERVER_URL_KEY) as string | undefined) ?? '';

export const useSession = create<SessionState>((set, get) => ({
  serverUrl: storedUrl(),
  connection: 'idle',
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
}));
