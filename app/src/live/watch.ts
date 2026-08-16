import type { CameraView } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';

/**
 * The one skeleton behind every live camera surface (#213). A surface is a
 * family member, not an invention: the camera records chunk after chunk for
 * the whole session, a decision layer names why any chunk was not sent, one
 * request is in flight at a time, and a ticking cycle readout keeps the
 * screen alive through every phase — filming, model reading, verdict age.
 * Surfaces supply only their own gates (decide) and their own upload
 * handler (send); everything else is shared.
 */

// Mean deviation from 1 g above this reads as a moving camera: the user is
// repositioning, not showing, and the chunk is not worth inference.
export const STEADY_THRESHOLD_G = 0.12;

// Standard skip reasons, shared so every surface speaks the same language.
export const SKIP_MOVING = 'moving — hold steady';
export const SKIP_READING = 'model still reading the last chunk';

export interface LiveCycle {
  /** The loop is running: the camera is recording chunks. */
  watching: boolean;
  /** A chunk is with the model right now; filming pauses until it answers. */
  reading: boolean;
  /** One-based number of the chunk being filmed or read. */
  chunkIndex: number;
  filmingStartedAt: number | null;
  readingStartedAt: number | null;
  lastResultAt: number | null;
  /** The decision layer's word on the last skipped chunk. */
  skipReason: string | null;
  failure: string | null;
  /** Ticks each second while the loop runs, so elapsed readouts move. */
  now: number;
}

const IDLE: LiveCycle = {
  watching: false,
  reading: false,
  chunkIndex: 0,
  filmingStartedAt: null,
  readingStartedAt: null,
  lastResultAt: null,
  skipReason: null,
  failure: null,
  now: Date.now(),
};

export function useWatchLoop(options: {
  cameraRef: RefObject<CameraView | null>;
  chunkSeconds: number;
  /** Surface-specific gate: a reason to skip this chunk, or null to send.
   * The standard gates (one in flight, steadiness) are the hook's own. */
  decide: () => string | null;
  /** Upload one chunk and apply its result; a throw lands in failure. */
  send: (uri: string) => Promise<void>;
  /** The wait-coverage slot (PRD 1.6): fires the moment a chunk goes to
   * the model, so the surface can talk — supplementary detail, the open
   * question, a capture tip — instead of leaving dead air while the box
   * works. Every surface fills it; the skeleton guarantees the moment. */
  onReading?: (chunkIndex: number) => void;
}) {
  const [cycle, setCycle] = useState<LiveCycle>(IDLE);
  const watchRef = useRef(false);
  const motionRef = useRef<number[]>([]);
  const opts = useRef(options);
  opts.current = options;

  const patch = (part: Partial<LiveCycle>) =>
    setCycle((state) => ({ ...state, ...part }));

  // The ticker runs only while the loop does; it is what keeps a slow box
  // and a dead loop from ever looking the same.
  useEffect(() => {
    if (!cycle.watching && !cycle.reading) {
      return;
    }
    const ticker = setInterval(() => patch({ now: Date.now() }), 1000);
    return () => clearInterval(ticker);
  }, [cycle.watching, cycle.reading]);

  const motionAvg = () => {
    const samples = motionRef.current;
    if (samples.length <= 3) {
      return 0;
    }
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  };

  const stop = () => {
    watchRef.current = false;
    try {
      opts.current.cameraRef.current?.stopRecording();
    } catch {
      // Recorder already torn down.
    }
  };

  const start = async () => {
    if (watchRef.current || opts.current.cameraRef.current === null) {
      return;
    }
    watchRef.current = true;
    patch({ watching: true, failure: null, skipReason: null });
    let sub: { remove: () => void } | null = null;
    try {
      Accelerometer.setUpdateInterval(100);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        motionRef.current.push(Math.abs(Math.hypot(x, y, z) - 1));
        if (motionRef.current.length > 40) {
          motionRef.current.shift();
        }
      });
    } catch {
      // No motion sensor: the steadiness gate simply always passes.
    }
    let chunkIndex = 0;
    while (watchRef.current && opts.current.cameraRef.current !== null) {
      motionRef.current = [];
      chunkIndex += 1;
      patch({ filmingStartedAt: Date.now(), chunkIndex });
      let video;
      try {
        video = await opts.current.cameraRef.current.recordAsync({
          codec: 'avc1',
          maxDuration: opts.current.chunkSeconds,
        });
      } catch {
        break;
      }
      if (!watchRef.current || video === undefined) {
        break;
      }
      let skip: string | null = null;
      if (motionAvg() > STEADY_THRESHOLD_G) {
        skip = SKIP_MOVING;
      } else {
        skip = opts.current.decide();
      }
      if (skip !== null) {
        patch({ skipReason: skip });
        continue;
      }
      // Strictly one at a time: filming pauses here until the model
      // answers this chunk, so nothing ever piles up in the void.
      patch({ reading: true, readingStartedAt: Date.now(), skipReason: null });
      opts.current.onReading?.(chunkIndex);
      try {
        await opts.current.send(video.uri);
        patch({ lastResultAt: Date.now(), failure: null });
      } catch (error) {
        patch({ failure: error instanceof Error ? error.message : String(error) });
      } finally {
        patch({ reading: false });
      }
    }
    if (sub !== null) {
      sub.remove();
    }
    watchRef.current = false;
    patch({ watching: false });
  };

  // Leaving the surface ends the loop and the recorder.
  useEffect(() => stop, []);

  return { cycle, start, stop, motionAvg, isWatching: () => watchRef.current };
}

/**
 * The shared phrase grammar: every surface tells the same story in the
 * same words, styled its own way. Primary is the cycle; secondary is the
 * last verdict with its age, so silence is never ambiguous.
 */
export function cycleLines(
  cycle: LiveCycle,
  options: {
    chunkSeconds: number;
    /** Typical model latency for this surface, for expectation setting. */
    expectedReadSeconds: number;
    verdict?: { text: string; at: number } | null;
  },
): { primary: string; secondary: string | null } {
  const seconds = (since: number | null) =>
    since === null ? 0 : Math.max(0, Math.floor((cycle.now - since) / 1000));
  let primary: string;
  if (cycle.failure !== null) {
    primary = `no answer from the server — ${cycle.failure}`;
  } else if (cycle.reading) {
    const elapsed = seconds(cycle.readingStartedAt);
    const remaining = options.expectedReadSeconds - elapsed;
    primary =
      remaining > 0
        ? `chunk ${cycle.chunkIndex} with the model · ~${remaining} s left`
        : `chunk ${cycle.chunkIndex} still with the model · ${elapsed} s (usually ~${options.expectedReadSeconds} s)`;
  } else if (cycle.skipReason !== null) {
    primary = cycle.skipReason;
  } else if (cycle.watching) {
    primary = `filming chunk ${cycle.chunkIndex} · ${Math.min(options.chunkSeconds, seconds(cycle.filmingStartedAt))} s of ${options.chunkSeconds} s`;
  } else {
    primary = 'camera paused';
  }
  const verdict = options.verdict;
  const secondary =
    verdict == null ? null : `${verdict.text} · ${seconds(verdict.at)} s ago`;
  return { primary, secondary };
}
