import { Asset } from 'expo-asset';

import { IntervalCaptureSource, type CaptureSource, type CapturedFrame } from './types';

const SAMPLE_MODULES = [
  require('../../assets/samples/sample_01.jpg'),
  require('../../assets/samples/sample_02.jpg'),
  require('../../assets/samples/sample_03.jpg'),
];

/** Cycles the bundled synthetic board frames at the capture cadence. */
export function createSampleSource(): CaptureSource {
  let index = 0;
  return new IntervalCaptureSource(async (): Promise<CapturedFrame | null> => {
    const asset = Asset.fromModule(SAMPLE_MODULES[index % SAMPLE_MODULES.length]);
    index += 1;
    if (asset.localUri === null) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri ?? asset.uri;
    return {
      uri,
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      capturedAt: new Date().toISOString(),
    };
  });
}
