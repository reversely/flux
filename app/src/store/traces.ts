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
  /** The model(s) behind this call; absent on plain data fetches. */
  model?: string;
  /** Server-measured milliseconds around the model call itself, from the
   * response's trace block; absent when the route reports none. */
  inferenceMs?: number;
  /** Rough token estimate over request plus response text (chars over 4). */
  estTokens?: number;
  /** Sources the response cited: citations, anchors, attribution lines. */
  referenced?: string[];
}

// Which box model answers each route. Everything else is a plain data
// fetch, which the traces screen hides by default.
const MODEL_ROUTES: [RegExp, string][] = [
  [/\/v1\/chat$/, 'nemotron-nano-9b (answer + tool classify)'],
  [/\/walkthrough\/sessions\/[^/]+\/observe$/, 'cosmos-reason2-8b'],
  [/\/walkthrough\/sessions\/[^/]+\/interpret$/, 'nemotron-nano-9b'],
  [/\/walkthrough\/sessions\/[^/]+\/utterance$/, 'parakeet-tdt-0.6b + exact gate'],
  [/\/coach\/sessions\/[^/]+\/clip$/, 'cosmos-reason2-8b'],
  [/\/weather\/read$/, 'cosmos-reason2-8b + nemotron-nano-9b'],
  [/\/speech\/narrations$/, 'kokoro-82m'],
  [/\/speech\/transcriptions$/, 'parakeet-tdt-0.6b'],
  [/\/sessions\/[^/]+\/finish$/, 'VSS agent (nemotron + cosmos)'],
  [/\/sessions\/[^/]+\/ask$/, 'VSS agent (nemotron + cosmos)'],
  [/\/sessions\/[^/]+\/frames$/, 'speciesnet + bioclip + fungitastic'],
];

export function modelFor(path: string): string | undefined {
  const hit = MODEL_ROUTES.find(([pattern]) => pattern.test(path));
  return hit?.[1];
}

const REFERENCE_KEYS = new Set([
  'citation',
  'source',
  'source_title',
  'attribution',
  'block_id',
  'figure_id',
  'anchor',
]);

function collectReferences(payload: unknown, out: Set<string>): void {
  if (Array.isArray(payload)) {
    payload.forEach((item) => collectReferences(item, out));
  } else if (payload !== null && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (REFERENCE_KEYS.has(key) && typeof value === 'string' && value !== '') {
        out.add(`${key}: ${value}`);
      } else {
        collectReferences(value, out);
      }
    }
  }
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
/** The response's inference trace: the server-reported model and timing
 * win over the static route table when a route carries them. */
function traceOf(payload: unknown): { model?: string; inferenceMs?: number } {
  const trace = (payload as { trace?: { model?: unknown; latency_ms?: unknown } })?.trace;
  if (trace === undefined || trace === null) {
    return {};
  }
  return {
    model: typeof trace.model === 'string' ? trace.model : undefined,
    inferenceMs: typeof trace.latency_ms === 'number' ? trace.latency_ms : undefined,
  };
}

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
    const detail = detailOf(result);
    const referenced = new Set<string>();
    collectReferences(result, referenced);
    const measured = traceOf(result);
    end(id, {
      status: 'ok',
      latencyMs: Date.now() - startedAt,
      detail,
      model: measured.model ?? modelFor(path),
      inferenceMs: measured.inferenceMs,
      estTokens: Math.round((request.length + detail.length) / 4),
      referenced: [...referenced].slice(0, 6),
    });
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
