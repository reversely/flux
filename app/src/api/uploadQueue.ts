import type { ApiClient } from './client';
import type { JointRecord } from './types';
import type { CapturedFrame } from '@/capture/types';

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 400;
// A hung native upload would stall the serial queue behind it; the race turns
// it into a normal retry. An abandoned attempt that still lands later just
// becomes one more stored frame, which is harmless.
const ATTEMPT_TIMEOUT_MS = 20000;

export interface UploadStats {
  queued: number;
  sent: number;
  failed: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serial uploader: frames post one at a time in capture order, with retry
 * and backoff per frame. Each response carries cumulative session results,
 * which flow back through onResults to drive the live overlay.
 */
export class UploadQueue {
  private readonly queue: CapturedFrame[] = [];
  private draining = false;
  private stopped = false;

  constructor(
    private readonly client: ApiClient,
    private readonly sessionId: string,
    private readonly onResults: (results: JointRecord[]) => void,
    private readonly onStats: (stats: UploadStats) => void,
  ) {}

  private stats: UploadStats = { queued: 0, sent: 0, failed: 0 };

  enqueue(frame: CapturedFrame): void {
    if (this.stopped) {
      return;
    }
    this.queue.push(frame);
    this.stats = { ...this.stats, queued: this.stats.queued + 1 };
    this.onStats(this.stats);
    void this.drain();
  }

  /** Stops accepting frames; the in-flight drain finishes what is queued. */
  stop(): void {
    this.stopped = true;
  }

  private async drain(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      let frame = this.queue.shift();
      while (frame !== undefined) {
        await this.uploadWithRetry(frame);
        frame = this.queue.shift();
      }
    } finally {
      this.draining = false;
    }
  }

  private async uploadWithRetry(frame: CapturedFrame): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await Promise.race([
          this.client.uploadFrame(this.sessionId, frame.uri, frame.capturedAt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('upload timed out')), ATTEMPT_TIMEOUT_MS),
          ),
        ]);
        this.stats = { ...this.stats, sent: this.stats.sent + 1 };
        this.onStats(this.stats);
        this.onResults(response.results);
        return;
      } catch {
        if (attempt < MAX_ATTEMPTS) {
          await delay(BACKOFF_BASE_MS * attempt);
        }
      }
    }
    this.stats = { ...this.stats, failed: this.stats.failed + 1 };
    this.onStats(this.stats);
  }
}
