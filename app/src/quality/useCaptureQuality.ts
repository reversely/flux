/**
 * The only file that binds the quality module to VisionCamera: a yuv frame
 * output whose worklet computes the metrics at ~3 Hz and ships them to the
 * RN thread, where the guidance state machine and lensPosition join in.
 */

import { useCallback, useRef, useState } from 'react';
import { scheduleOnRN } from 'react-native-worklets';
import { useFrameOutput, type CameraController } from 'react-native-vision-camera';

import { gridDelta, clippedFraction, laplacianVariance, lumaGrid } from './metrics';
import {
  initialGuidance,
  nextGuidance,
  type GuidanceState,
  type PromptKind,
  type QualitySignals,
} from './guidance';
import { QUALITY } from './thresholds';

export interface QualityStatus {
  signals: QualitySignals | null;
  prompt: PromptKind | null;
  /** True when no condition is active; gates the upload loop (#8). */
  passes: boolean;
}

const idleStatus: QualityStatus = { signals: null, prompt: null, passes: false };

export function useCaptureQuality(controllerRef: { current: CameraController | undefined }) {
  const [status, setStatus] = useState<QualityStatus>(idleStatus);
  const guidanceRef = useRef<GuidanceState>(initialGuidance);
  const previousGridRef = useRef<number[] | null>(null);

  const handleMetrics = useCallback(
    (laplacianVar: number, clipped: number, grid: number[]) => {
      const previousGrid = previousGridRef.current;
      previousGridRef.current = grid;
      const signals: QualitySignals = {
        laplacianVar,
        clippedFraction: clipped,
        gridDelta: previousGrid ? gridDelta(previousGrid, grid) : 0,
        lensPosition: controllerRef.current?.lensPosition ?? null,
      };
      guidanceRef.current = nextGuidance(guidanceRef.current, signals, Date.now());
      const prompt = guidanceRef.current.activePrompt;
      setStatus({ signals, prompt, passes: prompt === null });
    },
    [controllerRef],
  );

  const frameOutput = useFrameOutput({
    targetResolution: QUALITY.targetResolution,
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globals = globalThis as any;
        const now = Date.now();
        if (
          globals.__fluxQualityLastMs !== undefined &&
          now - globals.__fluxQualityLastMs < QUALITY.analysisIntervalMs
        ) {
          return;
        }
        globals.__fluxQualityLastMs = now;

        const planes = frame.getPlanes();
        if (planes.length === 0) {
          return;
        }
        const lumaPlane = planes[0];
        const plane = {
          data: new Uint8Array(lumaPlane.getPixelBuffer()),
          width: lumaPlane.width,
          height: lumaPlane.height,
          bytesPerRow: lumaPlane.bytesPerRow,
        };
        const laplacianVar = laplacianVariance(plane, QUALITY.sampleStride);
        const clipped = clippedFraction(plane, QUALITY.glareLumaClip, QUALITY.sampleStride);
        const grid = lumaGrid(plane, QUALITY.gridSize, QUALITY.sampleStride);
        scheduleOnRN(handleMetrics, laplacianVar, clipped, grid);
      } finally {
        frame.dispose();
      }
    },
  });

  return { frameOutput, status };
}
