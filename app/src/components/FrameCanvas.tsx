import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import type { JointRecord } from '@/api/types';
import { containTransform, mapBox, type Size } from '@/lib/coords';
import { boxStroke, classLabels, isSuspicious } from '@/lib/labels';
import { colors } from '@/theme/tokens';

const MAX_ZOOM = 8;
const SELECT_ZOOM = 2.4;
const LABEL_HEIGHT = 14;

interface Props {
  imageUri: string;
  joints: JointRecord[];
  selectedJointId: string | null;
  overlayOpacity: number;
  onSelectJoint: (jointId: string) => void;
}

export function FrameCanvas({
  imageUri,
  joints,
  selectedJointId,
  overlayOpacity,
  onSelectJoint,
}: Props) {
  const [container, setContainer] = useState<Size | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      tx.value = savedTx.value + event.translationX;
      ty.value = savedTy.value + event.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(1);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
      savedScale.value = 1;
      savedTx.value = 0;
      savedTy.value = 0;
    });

  const gestures = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const transform =
    container && natural ? containTransform(natural, container) : null;

  useEffect(() => {
    // Selecting a joint centers and zooms the canvas onto it. Transform origin
    // is the container center, so t = (center - boxCenter) * zoom.
    if (!selectedJointId || !transform || !container) {
      return;
    }
    const joint = joints.find((candidate) => candidate.joint_id === selectedJointId);
    if (!joint) {
      return;
    }
    const box = mapBox(joint.bounding_box, transform);
    const centerX = container.width / 2;
    const centerY = container.height / 2;
    const boxCenterX = box.x + box.width / 2;
    const boxCenterY = box.y + box.height / 2;
    scale.value = withTiming(SELECT_ZOOM);
    tx.value = withTiming((centerX - boxCenterX) * SELECT_ZOOM);
    ty.value = withTiming((centerY - boxCenterY) * SELECT_ZOOM);
    savedScale.value = SELECT_ZOOM;
    savedTx.value = (centerX - boxCenterX) * SELECT_ZOOM;
    savedTy.value = (centerY - boxCenterY) * SELECT_ZOOM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJointId]);

  return (
    <GestureDetector gesture={gestures}>
      <View
        style={styles.canvas}
        onLayout={(event) => setContainer(event.nativeEvent.layout)}
      >
        <Animated.View style={[styles.layer, animatedStyle]}>
          <Image
            style={styles.image}
            source={{ uri: imageUri }}
            contentFit="contain"
            onLoad={(event) =>
              setNatural({ width: event.source.width, height: event.source.height })
            }
          />
          {transform && container && (
            <Svg
              style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
              width={container.width}
              height={container.height}
            >
              {joints.map((joint) => {
                const box = mapBox(joint.bounding_box, transform);
                const selected = joint.joint_id === selectedJointId;
                const stroke = boxStroke(joint, selected);
                const labeled = isSuspicious(joint) || selected;
                const label = `${classLabels[joint.classification]} ${Math.round(joint.confidence * 100)}%`;
                return (
                  <G key={joint.joint_id}>
                    <Rect
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      fill="transparent"
                      stroke={stroke}
                      strokeWidth={selected ? 2.5 : 1.5}
                      onPress={() => onSelectJoint(joint.joint_id)}
                    />
                    {labeled && (
                      <G>
                        <Rect
                          x={box.x}
                          y={box.y - LABEL_HEIGHT}
                          width={label.length * 6 + 8}
                          height={LABEL_HEIGHT}
                          fill="rgba(0, 0, 0, 0.55)"
                        />
                        <SvgText
                          x={box.x + 4}
                          y={box.y - 4}
                          fill={colors.card}
                          fontFamily="Menlo"
                          fontSize={10}
                        >
                          {label}
                        </SvgText>
                      </G>
                    )}
                  </G>
                );
              })}
            </Svg>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.panelNavy,
  },
  layer: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
});
