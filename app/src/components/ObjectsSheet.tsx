import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import type { JointRecord } from '@/api/types';
import { Tag } from '@/components/Tag';
import { classLabels, reworkGuidance, severityTone } from '@/lib/labels';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

interface Props {
  frameId: string;
  joints: JointRecord[];
  hiddenJointIds: Set<string>;
  selectedJointId: string | null;
  overlayOpacity: number;
  onToggleJoint: (jointId: string) => void;
  onSelectJoint: (jointId: string) => void;
  onOpacityChange: (opacity: number) => void;
}

function OpacitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);

  const setFromX = (x: number) => {
    if (trackWidth > 0) {
      onChange(Math.min(1, Math.max(0, x / trackWidth)));
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      'worklet';
      runOnJS(setFromX)(event.x);
    })
    .onUpdate((event) => {
      'worklet';
      runOnJS(setFromX)(event.x);
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        style={sliderStyles.hitArea}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <View style={sliderStyles.track}>
          <View style={[sliderStyles.fill, { width: `${value * 100}%` }]} />
        </View>
        <View style={[sliderStyles.thumb, { left: `${value * 100}%` }]} />
      </View>
    </GestureDetector>
  );
}

export function ObjectsSheet({
  frameId,
  joints,
  hiddenJointIds,
  selectedJointId,
  overlayOpacity,
  onToggleJoint,
  onSelectJoint,
  onOpacityChange,
}: Props) {
  const selected = joints.find((joint) => joint.joint_id === selectedJointId) ?? null;
  const guidance = selected ? reworkGuidance[selected.classification] : '';

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Tag label={frameId} tone="blue" />
        <Text style={typography.annotation}>joints {joints.length}</Text>
        <View style={styles.headerSpacer} />
        <OpacitySlider value={overlayOpacity} onChange={onOpacityChange} />
      </View>
      {selected && guidance !== '' && <Text style={styles.guidance}>{guidance}</Text>}
      <ScrollView>
        {joints.map((joint) => {
          const hidden = hiddenJointIds.has(joint.joint_id);
          const isSelected = joint.joint_id === selectedJointId;
          return (
            <Pressable
              key={joint.joint_id}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => onSelectJoint(joint.joint_id)}
            >
              <Text style={styles.jointId}>{joint.joint_id.replace('joint_', '')}</Text>
              <Tag label={classLabels[joint.classification]} tone="gray" />
              <Text style={typography.annotation}>
                {Math.round(joint.confidence * 100)}%
              </Text>
              <Tag label={joint.severity} tone={severityTone[joint.severity]} />
              <View style={styles.headerSpacer} />
              <Pressable hitSlop={8} onPress={() => onToggleJoint(joint.joint_id)}>
                <Ionicons
                  name={hidden ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={hidden ? colors.gray.subtle : colors.ink2}
                />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    maxHeight: 280,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingBottom: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerSpacer: {
    flex: 1,
  },
  guidance: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    paddingVertical: spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    height: sizes.rowHeight,
    paddingHorizontal: spacing.xs,
  },
  rowSelected: {
    backgroundColor: colors.signatureSoft,
    borderRadius: radius.control,
  },
  jointId: {
    ...typography.listBody,
    fontFamily: undefined,
    fontWeight: '500',
    width: 32,
  },
});

const sliderStyles = StyleSheet.create({
  hitArea: {
    width: 120,
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: colors.signature,
  },
  thumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.signature,
  },
});
