import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Classification, JointRecord, SessionResults } from '@/api/types';
import { FrameCanvas } from '@/components/FrameCanvas';
import { Filmstrip } from '@/components/Filmstrip';
import { ObjectsSheet } from '@/components/ObjectsSheet';
import { classLabels, isSuspicious, worstSeverityRank } from '@/lib/labels';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

export default function Review() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = params.sessionId ?? '';
  const client = useSession((state) => state.client);

  const [results, setResults] = useState<SessionResults | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedJointId, setSelectedJointId] = useState<string | null>(null);
  const [hiddenJointIds, setHiddenJointIds] = useState<Set<string>>(new Set());
  const [hiddenClasses, setHiddenClasses] = useState<Set<Classification>>(new Set());
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  useEffect(() => {
    client()
      .getResults(sessionId)
      .then(setResults)
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const joints = useMemo(() => results?.joints ?? [], [results]);

  const frameJoints = useMemo(() => {
    const byFrame = new Map<string, JointRecord[]>();
    for (const joint of joints) {
      for (const frameId of joint.supporting_frames) {
        byFrame.set(frameId, [...(byFrame.get(frameId) ?? []), joint]);
      }
    }
    return byFrame;
  }, [joints]);

  const frameIds = useMemo(
    () =>
      [...frameJoints.keys()].sort((a, b) => {
        const rankDelta =
          worstSeverityRank(frameJoints.get(a) ?? []) -
          worstSeverityRank(frameJoints.get(b) ?? []);
        return rankDelta !== 0 ? rankDelta : a.localeCompare(b);
      }),
    [frameJoints],
  );

  const frameId = selectedFrameId ?? frameIds[0] ?? null;
  const currentJoints = frameId ? (frameJoints.get(frameId) ?? []) : [];
  const visibleJoints = currentJoints.filter(
    (joint) =>
      !hiddenClasses.has(joint.classification) && !hiddenJointIds.has(joint.joint_id),
  );

  const reworkCount = joints.filter(isSuspicious).length;
  const classCounts = useMemo(() => {
    const counts = new Map<Classification, number>();
    for (const joint of joints) {
      counts.set(joint.classification, (counts.get(joint.classification) ?? 0) + 1);
    }
    return counts;
  }, [joints]);

  const toggleClass = (classification: Classification) => {
    setHiddenClasses((previous) => {
      const next = new Set(previous);
      if (next.has(classification)) {
        next.delete(classification);
      } else {
        next.add(classification);
      }
      return next;
    });
  };

  const toggleJoint = (jointId: string) => {
    setHiddenJointIds((previous) => {
      const next = new Set(previous);
      if (next.has(jointId)) {
        next.delete(jointId);
      } else {
        next.add(jointId);
      }
      return next;
    });
  };

  const empty = results !== null && joints.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View>
          <Text style={typography.focalStat}>{reworkCount}</Text>
          <Text style={styles.statLabel}>need rework</Text>
        </View>
        <View style={styles.filters}>
          {[...classCounts.entries()].map(([classification, count]) => {
            const hidden = hiddenClasses.has(classification);
            return (
              <Pressable
                key={classification}
                style={[styles.filterTag, hidden && styles.filterTagHidden]}
                onPress={() => toggleClass(classification)}
              >
                <Text style={styles.filterTagText}>
                  {classLabels[classification]} {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {failed && (
        <Text style={styles.notice}>
          Please reconnect to the server and open this scan again.
        </Text>
      )}
      {empty && (
        <Text style={styles.notice}>No joints were detected in this scan.</Text>
      )}

      {frameId && (
        <>
          <FrameCanvas
            imageUri={client().frameUrl(sessionId, frameId)}
            joints={visibleJoints}
            selectedJointId={selectedJointId}
            overlayOpacity={overlayOpacity}
            onSelectJoint={setSelectedJointId}
          />
          <Filmstrip
            frameIds={frameIds}
            selectedFrameId={frameId}
            frameUrl={(id) => client().frameUrl(sessionId, id)}
            onSelect={(id) => {
              setSelectedFrameId(id);
              setSelectedJointId(null);
            }}
          />
          <ObjectsSheet
            frameId={frameId}
            joints={currentJoints}
            hiddenJointIds={hiddenJointIds}
            selectedJointId={selectedJointId}
            overlayOpacity={overlayOpacity}
            onToggleJoint={toggleJoint}
            onSelectJoint={setSelectedJointId}
            onOpacityChange={setOverlayOpacity}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    paddingTop: 64,
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
  },
  statLabel: {
    ...typography.tag,
    color: colors.ink3,
  },
  filters: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  filterTag: {
    height: sizes.tag,
    borderRadius: radius.tag,
    paddingHorizontal: spacing.s,
    justifyContent: 'center',
    backgroundColor: colors.gray.softBorder,
  },
  filterTagHidden: {
    opacity: 0.35,
  },
  filterTagText: {
    ...typography.tag,
    color: colors.gray.ink,
  },
  notice: {
    ...typography.body,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
  },
});
