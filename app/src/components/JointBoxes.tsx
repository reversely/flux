import { G, Rect, Text as SvgText } from 'react-native-svg';

import type { JointRecord } from '@/api/types';
import { mapBox, type ContainTransform } from '@/lib/coords';
import { boxStroke, classLabels, isSuspicious } from '@/lib/labels';
import { colors } from '@/theme/tokens';

const LABEL_HEIGHT = 14;

interface Props {
  joints: JointRecord[];
  transform: ContainTransform;
  selectedJointId?: string | null;
  onSelectJoint?: (jointId: string) => void;
}

/**
 * The SVG box layer shared by the review canvas and the live scan overlay:
 * suspicious joints carry colour and a bare mono label, acceptable joints
 * stay thin quiet outlines, the selected joint alone takes gold.
 */
export function JointBoxes({ joints, transform, selectedJointId = null, onSelectJoint }: Props) {
  return (
    <>
      {joints.map((joint) => {
        const box = mapBox(joint.bounding_box, transform);
        const selected = joint.joint_id === selectedJointId;
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
              stroke={boxStroke(joint, selected)}
              strokeWidth={selected ? 2.5 : 1.5}
              onPress={onSelectJoint ? () => onSelectJoint(joint.joint_id) : undefined}
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
    </>
  );
}
