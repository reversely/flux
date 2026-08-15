/**
 * The guidance state machine: one prompt at a time, priority ordered, with
 * hysteresis so prompts never flicker. Pure and timestamp-driven for tests.
 */

import { QUALITY, type QualityThresholds } from './thresholds';

export type PromptKind = 'glare' | 'distance_far' | 'distance_near' | 'focus' | 'motion';

export interface QualitySignals {
  laplacianVar: number;
  clippedFraction: number;
  gridDelta: number;
  /** null when no camera controller is available (sample mode). */
  lensPosition: number | null;
}

export interface GuidanceState {
  activePrompt: PromptKind | null;
  candidate: PromptKind | null;
  candidateSinceMs: number;
  clearSinceMs: number;
}

export const initialGuidance: GuidanceState = {
  activePrompt: null,
  candidate: null,
  candidateSinceMs: 0,
  clearSinceMs: 0,
};

/** PRD section 4 copy; full sentences because guidance instructs. */
export const promptCopy: Record<PromptKind, string> = {
  glare: 'Please tilt the phone to reduce the glare on the board.',
  distance_far: 'Please move closer to the board.',
  distance_near: 'Please move back slightly from the board.',
  focus: 'Please hold the camera steady until the image sharpens.',
  motion: 'Please move the camera slowly across the board.',
};

/** The single failing condition to prompt for, priority ordered; null passes. */
export function failingPrompt(
  signals: QualitySignals,
  thresholds: QualityThresholds = QUALITY,
): PromptKind | null {
  const sharp = signals.laplacianVar >= thresholds.focusMinLaplacianVar;
  if (signals.clippedFraction > thresholds.glareMaxClippedFraction) {
    return 'glare';
  }
  if (
    signals.lensPosition !== null &&
    signals.lensPosition > thresholds.distanceFarLensPos &&
    sharp
  ) {
    return 'distance_far';
  }
  if (
    signals.lensPosition !== null &&
    signals.lensPosition < thresholds.distanceNearLensPos &&
    !sharp
  ) {
    return 'distance_near';
  }
  if (!sharp) {
    return 'focus';
  }
  if (signals.gridDelta > thresholds.motionMaxGridDelta) {
    return 'motion';
  }
  return null;
}

export function nextGuidance(
  state: GuidanceState,
  signals: QualitySignals,
  nowMs: number,
  thresholds: QualityThresholds = QUALITY,
): GuidanceState {
  const failing = failingPrompt(signals, thresholds);

  if (failing === null) {
    if (state.activePrompt === null) {
      return { ...initialGuidance };
    }
    const clearSinceMs = state.clearSinceMs === 0 ? nowMs : state.clearSinceMs;
    if (nowMs - clearSinceMs >= thresholds.clearAfterMs) {
      return { ...initialGuidance };
    }
    return { ...state, candidate: null, candidateSinceMs: 0, clearSinceMs };
  }

  if (failing === state.activePrompt) {
    return { ...state, candidate: null, candidateSinceMs: 0, clearSinceMs: 0 };
  }

  if (failing === state.candidate) {
    if (nowMs - state.candidateSinceMs >= thresholds.surfaceAfterMs) {
      return {
        activePrompt: failing,
        candidate: null,
        candidateSinceMs: 0,
        clearSinceMs: 0,
      };
    }
    return { ...state, clearSinceMs: 0 };
  }

  return {
    ...state,
    candidate: failing,
    candidateSinceMs: nowMs,
    clearSinceMs: 0,
  };
}
