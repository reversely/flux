import { StyleSheet, Text, View } from 'react-native';

import { Tag } from '@/components/Tag';
import { promptCopy } from '@/quality/guidance';
import type { QualityStatus } from '@/quality/useCaptureQuality';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface Props {
  status: QualityStatus;
  /** Sample capture mode shows a bare tag instead of live guidance. */
  sampleMode?: boolean;
  /** Dev-only raw metrics readout for threshold calibration. */
  showMetrics?: boolean;
}

export function GuidanceBanner({ status, sampleMode = false, showMetrics = false }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      {sampleMode && <Tag label="sample" tone="blue" />}
      {!sampleMode && status.prompt !== null && (
        <View style={styles.banner}>
          <Text style={styles.copy}>{promptCopy[status.prompt]}</Text>
        </View>
      )}
      {showMetrics && status.signals !== null && (
        <Text style={styles.metrics}>
          {`lap ${status.signals.laplacianVar.toFixed(0)}  clip ${(status.signals.clippedFraction * 100).toFixed(2)}%  motion ${status.signals.gridDelta.toFixed(1)}  lens ${status.signals.lensPosition?.toFixed(2) ?? '--'}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.s,
    alignItems: 'flex-start',
  },
  banner: {
    backgroundColor: colors.card,
    borderRadius: radius.control,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
  },
  copy: {
    ...typography.body,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  metrics: {
    ...typography.annotation,
    color: colors.card,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: spacing.s,
    paddingVertical: 2,
    borderRadius: radius.tag,
  },
});
