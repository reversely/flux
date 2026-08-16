import { create } from 'zustand';

export type TraceStatus = 'running' | 'ok' | 'failed';

export interface TraceEntry {
  id: string;
  startedAt: string;
  method: string;
  path: string;
  /** One-line request summary (question text, clip id), '' when the path says it all. */
  request: string;
  status: TraceStatus;
  latencyMs?: number;
  /** One-line outcome (error text on failure). */
  response?: string;
  /** Full response payload, pretty-printed and truncated, for the expanded row. */
  detail?: string;
}

const MAX_ENTRIES = 200;
const MAX_DETAIL_CHARS = 4000;

interface TraceState {
  entries: TraceEntry[];
  begin: (method: string, path: string, request: string) => string;
  end: (id: string, patch: Partial<TraceEntry>) => void;
  clear: () => void;
}

let traceCounter = 0;

export const useTraces = create<TraceState>((set) => ({
  entries: [],
  begin: (method, path, request) => {
    traceCounter += 1;
    const id = `trace-${traceCounter}`;
    set((state) => ({
      entries: [
        { id, startedAt: new Date().toISOString(), method, path, request, status: 'running' },
        ...state.entries.slice(0, MAX_ENTRIES - 1),
      ],
    }));
    return id;
  },
  end: (id, patch) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  clear: () => set({ entries: [] }),
}));

export function detailOf(payload: unknown): string {
  try {
    const text = JSON.stringify(payload, null, 2);
    return text.length > MAX_DETAIL_CHARS ? `${text.slice(0, MAX_DETAIL_CHARS)}\n…` : text;
  } catch {
    return String(payload);
  }
}

/** Wraps one API call so it lands in the trace tab whatever its outcome. */
export async function traced<T>(
  method: string,
  path: string,
  request: string,
  run: () => Promise<T>,
): Promise<T> {
  const { begin, end } = useTraces.getState();
  const id = begin(method, path, request);
  const startedAt = Date.now();
  try {
    const result = await run();
    end(id, { status: 'ok', latencyMs: Date.now() - startedAt, detail: detailOf(result) });
    return result;
  } catch (error) {
    end(id, {
      status: 'failed',
      latencyMs: Date.now() - startedAt,
      response: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
