import { StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { colors, typography } from '@/theme/tokens';

/**
 * Labelled cross-section of an agaric mushroom for the survey. `focus`
 * names the character the current question asks about; that region draws
 * in the annotation gold while the rest stays structural steel, so the
 * user's eye lands on the part to inspect. Labels are single field-guide
 * terms; the question card carries the glosses.
 */

const INK = colors.steel[3];
const SOFT = colors.steel[1];
const FOCUS = colors.goldLine;
const FOCUS_FILL = colors.gold;

type Region = 'cap' | 'underside' | 'junction' | 'stem' | 'print' | 'ground';

const CHARACTER_REGION: Record<string, Region> = {
  capShape: 'cap',
  hymeniumType: 'underside',
  whichGills: 'junction',
  stipeCharacter: 'stem',
  sporePrintColor: 'print',
  ecologicalType: 'ground',
};

function stroke(region: Region, focus: Region | undefined): string {
  return region === focus ? FOCUS : INK;
}

function width(region: Region, focus: Region | undefined): number {
  return region === focus ? 2.5 : 1.5;
}

export function MushroomDiagram({ character }: { character: string }) {
  const focus = CHARACTER_REGION[character];
  return (
    <View style={styles.wrap}>
      <Svg width={190} height={150} viewBox="0 0 190 150">
        {/* cap outline */}
        <Path
          d="M 40 62 Q 44 22 95 22 Q 146 22 150 62 Z"
          fill={focus === 'cap' ? FOCUS_FILL : colors.signatureSoft}
          fillOpacity={focus === 'cap' ? 0.35 : 1}
          stroke={stroke('cap', focus)}
          strokeWidth={width('cap', focus)}
        />
        {/* gills: radial lines under the cap */}
        <G stroke={stroke('underside', focus)} strokeWidth={width('underside', focus) - 0.5}>
          {[48, 58, 68, 78, 88, 102, 112, 122, 132, 142].map((x) => (
            <Line key={x} x1={x} y1={63} x2={x < 95 ? x + 4 : x - 4} y2={71} />
          ))}
        </G>
        {/* gill-stem junction marker */}
        <Ellipse
          cx={95}
          cy={68}
          rx={14}
          ry={7}
          fill="none"
          stroke={stroke('junction', focus)}
          strokeWidth={width('junction', focus)}
          strokeDasharray={focus === 'junction' ? undefined : '3 3'}
          opacity={focus === 'junction' ? 1 : 0.55}
        />
        {/* stem, ring, volva */}
        <Rect
          x={87}
          y={70}
          width={16}
          height={56}
          rx={6}
          fill={colors.card}
          stroke={stroke('stem', focus)}
          strokeWidth={width('stem', focus)}
        />
        <Ellipse
          cx={95}
          cy={84}
          rx={13}
          ry={4}
          fill="none"
          stroke={stroke('stem', focus)}
          strokeWidth={width('stem', focus)}
        />
        <Path
          d="M 82 128 Q 82 114 88 116 L 102 116 Q 108 114 108 128 Z"
          fill={colors.card}
          stroke={stroke('stem', focus)}
          strokeWidth={width('stem', focus)}
        />
        {/* spore print: the oval a cap leaves overnight on paper */}
        <Ellipse
          cx={40}
          cy={128}
          rx={22}
          ry={7}
          fill={focus === 'print' ? FOCUS_FILL : SOFT}
          fillOpacity={focus === 'print' ? 0.5 : 0.45}
          stroke={stroke('print', focus)}
          strokeWidth={width('print', focus)}
        />
        {/* ground line */}
        <Line
          x1={12}
          y1={140}
          x2={178}
          y2={140}
          stroke={stroke('ground', focus)}
          strokeWidth={width('ground', focus)}
        />
        {/* leader lines */}
        <G stroke={SOFT} strokeWidth={1}>
          <Line x1={122} y1={34} x2={158} y2={26} />
          <Line x1={126} y1={66} x2={158} y2={56} />
          <Line x1={104} y1={84} x2={140} y2={86} />
          <Line x1={106} y1={122} x2={140} y2={116} />
          <Line x1={52} y1={124} x2={58} y2={110} />
        </G>
      </Svg>
      <Text style={[styles.label, { top: 14, right: 0 }]}>cap</Text>
      <Text style={[styles.label, { top: 46, right: 0 }]}>gills</Text>
      <Text style={[styles.label, { top: 76, right: 0 }]}>ring</Text>
      <Text style={[styles.label, { top: 104, right: 0 }]}>volva</Text>
      <Text style={[styles.label, { top: 88, left: 34 }]}>spore print</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: 190,
    height: 150,
  },
  label: {
    ...typography.annotation,
    position: 'absolute',
  },
});
