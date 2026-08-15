import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg from 'react-native-svg';

import type { JointRecord } from '@/api/types';
import { JointBoxes } from '@/components/JointBoxes';
import { containTransform, type Size } from '@/lib/coords';

interface Props {
  joints: JointRecord[];
  /** Pixel size of the uploaded frames the boxes were computed on. */
  frameSize: Size | null;
}

/**
 * Boxes from the latest results over the scan surface. The mapping assumes a
 * contain fit of the frame, which is exact in sample mode; over the camera's
 * cover-fit preview it is an approximation until the on-device calibration
 * pass (#9) aligns preview and photo geometry.
 */
export function LiveOverlay({ joints, frameSize }: Props) {
  const [container, setContainer] = useState<Size | null>(null);
  const ready =
    container !== null && frameSize !== null && frameSize.width > 0 && frameSize.height > 0;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(event) => setContainer(event.nativeEvent.layout)}
    >
      {ready && (
        <Svg width={container.width} height={container.height}>
          <JointBoxes joints={joints} transform={containTransform(frameSize, container)} />
        </Svg>
      )}
    </View>
  );
}
