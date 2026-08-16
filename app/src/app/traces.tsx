import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Tag, type TagTone } from '@/components/Tag';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { type TraceEntry, type TraceStatus, useTraces } from '@/store/traces';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const statusTone: Record<TraceStatus, TagTone> = {
  running: 'blue',
  ok: 'green',
  failed: 'red',
};

function TraceRow({ entry }: { entry: TraceEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.method} ${entry.path}`}
      onPress={() => setOpen((v) => !v)}
      style={styles.row}
    >
      <View style={styles.rowHeader}>
        <Text style={[typography.listBody, styles.path]} numberOfLines={open ? undefined : 1}>
          {entry.method} {entry.path}
        </Text>
        <Tag label={entry.status} tone={statusTone[entry.status]} />
      </View>
      <Text style={typography.annotation}>
        {new Date(entry.startedAt).toLocaleTimeString()}
        {entry.latencyMs !== undefined ? `, ${(entry.latencyMs / 1000).toFixed(2)} s` : ''}
      </Text>
      {entry.request !== '' && (
        <Text style={typography.annotation} numberOfLines={open ? undefined : 1}>
          {entry.request}
        </Text>
      )}
      {entry.response !== undefined && (
        <Text style={[typography.annotation, styles.error]}>{entry.response}</Text>
      )}
      {open && entry.detail !== undefined && (
        <View style={styles.detailBox}>
          <Text style={styles.detailText}>{entry.detail}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Every server call the app makes, newest first. A row expands to the full
 * response payload, which carries the server's inference trace fields as
 * they ship (#109): model, verdict, pointer reason, referenced anchors.
 */
export default function Traces() {
  const entries = useTraces((s) => s.entries);
  const clear = useTraces((s) => s.clear);

  return (
    <View style={styles.screen}>
      <TopBar title="Agent traces" back traceButton={false}>
        {entries.length > 0 && <TopBarButton icon="trash-2" label="Clear traces" onPress={clear} />}
      </TopBar>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={typography.body}>No calls yet</Text>
          <Text style={[typography.annotation, styles.hint]}>
            Every chat, coach, identify, and content call lands here
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <TraceRow entry={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  hint: {
    color: colors.ink3,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  path: {
    flex: 1,
  },
  error: {
    color: '#8C3730',
  },
  detailBox: {
    backgroundColor: colors.gray.softBg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray.softBorder,
    padding: spacing.m,
    marginTop: spacing.xs,
  },
  detailText: {
    ...typography.annotation,
    color: colors.gray.ink,
  },
});
