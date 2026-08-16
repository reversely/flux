import { detailOf, useTraces } from '@/store/traces';

/**
 * Live transcription over WS /v1/speech/stream (#155): int16 PCM frames go
 * up, partial then final transcripts come back as the box decodes. The
 * WebSocket is not a fetch, so the call is entered into the traces store by
 * hand; the final event carries the server's trace fields (engine, model,
 * latency_ms) and lands as the row's detail.
 */

const TARGET_RATE = 16_000;

export interface TranscriptFinal {
  text: string;
  engine: string;
  model: string;
  latency_ms: number;
}

export interface TranscriptionStream {
  feed: (data: ArrayBuffer, sampleRate: number) => void;
  end: () => void;
  cancel: () => void;
}

/** Nearest-sample decimation to 16 kHz; speech survives it fine. */
export function resampleInt16(data: ArrayBuffer, rate: number): ArrayBuffer {
  if (rate === TARGET_RATE) {
    return data;
  }
  const source = new Int16Array(data);
  const out = new Int16Array(Math.floor((source.length * TARGET_RATE) / rate));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = source[Math.floor((i * rate) / TARGET_RATE)];
  }
  return out.buffer;
}

export function openTranscriptionStream(options: {
  baseUrl: string;
  onPartial: (text: string) => void;
  onFinal: (final: TranscriptFinal) => void;
  onError: () => void;
}): TranscriptionStream {
  const path = '/v1/speech/stream';
  const { begin, end } = useTraces.getState();
  const traceId = begin('WS', path, 'live utterance');
  const startedAt = Date.now();
  const ws = new WebSocket(options.baseUrl.replace(/^http/, 'ws') + path);
  ws.binaryType = 'arraybuffer';
  const queued: ArrayBuffer[] = [];
  let settled = false;

  const settle = (patch: Parameters<typeof end>[1]) => {
    if (!settled) {
      settled = true;
      end(traceId, { latencyMs: Date.now() - startedAt, ...patch });
    }
  };

  ws.onopen = () => {
    for (const chunk of queued) {
      ws.send(chunk);
    }
    queued.length = 0;
  };
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.type === 'partial') {
      options.onPartial(message.text);
    } else if (message.type === 'final') {
      settle({ status: 'ok', detail: detailOf(message) });
      options.onFinal(message as TranscriptFinal);
      ws.close();
    } else {
      settle({ status: 'failed', response: String(message.detail ?? 'stream error') });
      options.onError();
      ws.close();
    }
  };
  ws.onerror = () => {
    settle({ status: 'failed', response: 'connection failed' });
    options.onError();
  };

  return {
    feed: (data, sampleRate) => {
      const pcm = resampleInt16(data, sampleRate);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(pcm);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        queued.push(pcm);
      }
    },
    end: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('end');
      } else {
        settle({ status: 'failed', response: 'closed before end' });
        options.onError();
      }
    },
    cancel: () => {
      settle({ status: 'failed', response: 'cancelled' });
      ws.close();
    },
  };
}

// The same exact gate as the server's map_utterance (flux_server/speech.py):
// a spoken answer is a user confirmation, so the whole normalized utterance
// must equal a whole normalized state; nothing fuzzy ever advances a node.
const CONTROL_PHRASES: Record<string, 'undo' | 'repeat' | 'skip'> = {
  undo: 'undo',
  'go back': 'undo',
  back: 'undo',
  repeat: 'repeat',
  'say again': 'repeat',
  again: 'repeat',
  skip: 'skip',
  'not sure': 'skip',
  'i dont know': 'skip',
};

export type SpokenAction =
  | { action: 'answer'; state: string }
  | { action: 'undo' | 'repeat' | 'skip' | 'ask_again' };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Options whose whole normalized phrase occurs in a free transcript, for
 * suggesting answers heard in a clip's narration. Suggestions only: the
 * user still confirms by tap or voice, per the #80 care rule.
 */
export function suggestedOptions(transcript: string, options: string[]): string[] {
  const spoken = ` ${normalize(transcript)} `;
  return options.filter((option) => {
    const phrase = normalize(option);
    return phrase !== '' && spoken.includes(` ${phrase} `);
  });
}

export function mapTranscript(text: string, states: string[]): SpokenAction {
  const spoken = normalize(text);
  if (spoken === '') {
    return { action: 'ask_again' };
  }
  const state = states.find((s) => normalize(s) === spoken);
  if (state !== undefined) {
    return { action: 'answer', state };
  }
  const control = CONTROL_PHRASES[spoken];
  return control === undefined ? { action: 'ask_again' } : { action: control };
}
