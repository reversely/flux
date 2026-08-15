import type { ApiClient } from './client';

const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 400;
// A hung native upload would stall the serial queue behind it; the race turns
// it into a normal retry. An abandoned attempt that still lands later just
// becomes one more stored file, which is harmless.
const ATTEMPT_TIMEOUT_MS = 20000;

export type UploadStatus = 'uploading' | 'done' | 'failed';

export interface UploadClip {
  id: string;
  uri: string;
  capturedAt: string;
  mimeType: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serial uploader: clips post one at a time in capture order, with retry
 * and backoff per clip. onStatus reports each clip's transitions so the
 * capture screen can render queue state.
 */
export class UploadQueue {
  private readonly queue: UploadClip[] = [];
  private draining = false;
  private stopped = false;

  constructor(
    private readonly client: ApiClient,
    private readonly sessionId: string,
    private readonly onStatus: (clipId: string, status: UploadStatus) => void,
  ) {}

  enqueue(clip: UploadClip): void {
    if (this.stopped) {
      return;
    }
    this.queue.push(clip);
    void this.drain();
  }

  /** Stops accepting clips; the in-flight drain finishes what is queued. */
  stop(): void {
    this.stopped = true;
  }

  private async drain(): Promise<void> {
    if (this.draining) {
      return;
    }
    this.draining = true;
    try {
      let clip = this.queue.shift();
      while (clip !== undefined) {
        await this.uploadWithRetry(clip);
        clip = this.queue.shift();
      }
    } finally {
      this.draining = false;
    }
  }

  private async uploadWithRetry(clip: UploadClip): Promise<void> {
    this.onStatus(clip.id, 'uploading');
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        await Promise.race([
          this.client.uploadFrame(this.sessionId, clip.uri, clip.capturedAt, clip.mimeType),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('upload timed out')), ATTEMPT_TIMEOUT_MS),
          ),
        ]);
        this.onStatus(clip.id, 'done');
        return;
      } catch {
        if (attempt < MAX_ATTEMPTS) {
          await delay(BACKOFF_BASE_MS * attempt);
        }
      }
    }
    this.onStatus(clip.id, 'failed');
  }
}
