import type { CameraPhotoOutput } from 'react-native-vision-camera';

import { IntervalCaptureSource, type CaptureSource, type CapturedFrame } from './types';

/**
 * Captures an AF-settled, hardware-encoded JPEG per tick through the photo
 * output. qualityGate implements the PRD's "withhold results while image
 * quality fails": a failing tick captures nothing.
 */
export function createCameraSource(
  photoOutput: CameraPhotoOutput,
  qualityGate: () => boolean,
): CaptureSource {
  return new IntervalCaptureSource(async (): Promise<CapturedFrame | null> => {
    if (!qualityGate()) {
      return null;
    }
    const photo = await photoOutput.capturePhoto({ enableShutterSound: false }, {});
    try {
      const path = await photo.saveToTemporaryFileAsync();
      return {
        uri: path.startsWith('file://') ? path : `file://${path}`,
        width: photo.width,
        height: photo.height,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      photo.dispose();
    }
  });
}
