/**
 * A CaptureSource produces one JPEG frame per tick while running. The camera
 * implementation wraps VisionCamera's photo output; the sample implementation
 * cycles bundled board frames so the full scan flow runs without a camera.
 */

export interface CapturedFrame {
  uri: string;
  width: number;
  height: number;
  capturedAt: string;
}

export interface CaptureSource {
  start(onFrame: (frame: CapturedFrame) => void): void;
  stop(): void;
}

export const CAPTURE_INTERVAL_MS = 1500;

/**
 * Shared interval loop: calls produce() each tick, skips ticks while a
 * capture is in flight, and drops ticks where produce() returns null
 * (the quality gate).
 */
export class IntervalCaptureSource implements CaptureSource {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private readonly produce: () => Promise<CapturedFrame | null>,
    private readonly intervalMs: number = CAPTURE_INTERVAL_MS,
  ) {}

  start(onFrame: (frame: CapturedFrame) => void): void {
    this.stop();
    this.timer = setInterval(() => {
      if (this.busy) {
        return;
      }
      this.busy = true;
      this.produce()
        .then((frame) => {
          if (frame !== null && this.timer !== null) {
            onFrame(frame);
          }
        })
        .catch(() => {
          // A failed capture skips the tick; the next tick tries again.
        })
        .finally(() => {
          this.busy = false;
        });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
