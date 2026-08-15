/**
 * Every tunable constant of the capture-quality module. The values are
 * starting points; the on-device calibration pass with the real macro
 * attachment (#9) adjusts them against the dev metrics overlay.
 */

export const QUALITY = {
  /** Analysis stream resolution; small keeps the worklet at a few ms. */
  targetResolution: { width: 640, height: 360 },
  /** Analyze every Nth pixel in both axes. */
  sampleStride: 2,
  /** ~3 Hz analysis cadence. */
  analysisIntervalMs: 333,
  /** Laplacian variance below this reads as blurred. */
  focusMinLaplacianVar: 120,
  /** Luma at or above this counts as clipped highlight. */
  glareLumaClip: 250,
  /** Clipped fraction above this surfaces the glare prompt. */
  glareMaxClippedFraction: 0.015,
  /** lensPosition (0 closest, 1 furthest) above this while sharp = too far. */
  distanceFarLensPos: 0.7,
  /** lensPosition below this while blurred = closer than minimum focus. */
  distanceNearLensPos: 0.05,
  /** Mean abs delta of the luma grid above this reads as fast motion. */
  motionMaxGridDelta: 14,
  /** Luma grid is gridSize x gridSize cell means. */
  gridSize: 8,
  /** A failing condition must persist this long before its prompt shows. */
  surfaceAfterMs: 600,
  /** Conditions must stay clear this long before the prompt dismisses. */
  clearAfterMs: 1000,
} as const;

export type QualityThresholds = typeof QUALITY;
