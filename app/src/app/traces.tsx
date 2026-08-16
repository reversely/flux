import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { PageBackdrop } from '@/components/PageBackdrop';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar, TopBarButton } from '@/components/TopBar';
import { modelFor, type TraceEntry, type TraceStatus, useTraces } from '@/store/traces';
import { darkHome } from '@/theme/biome';
import { dark } from '@/theme/dark';
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
      style={[dark.card, styles.row]}
    >
      <View style={styles.rowHeader}>
        <Text style={[dark.listBody, styles.path]} numberOfLines={open ? undefined : 1}>
          {entry.method} {entry.path}
        </Text>
        <Tag label={entry.status} tone={statusTone[entry.status]} />
      </View>
      <Text style={dark.note}>
        {new Date(entry.startedAt).toLocaleTimeString()}
        {entry.latencyMs !== undefined ? `, ${(entry.latencyMs / 1000).toFixed(2)} s` : ''}
        {entry.estTokens !== undefined ? `, ~${entry.estTokens} tokens` : ''}
      </Text>
      {entry.model !== undefined && (
        <Text style={[dark.note, styles.model]}>
          {entry.model}
          {entry.tokensIn !== undefined || entry.tokensOut !== undefined
            ? `, ${entry.tokensIn ?? '?'} in / ${entry.tokensOut ?? '?'} out tok`
            : ''}
          {entry.inferenceMs !== undefined
            ? `, inference ${(entry.inferenceMs / 1000).toFixed(2)} s`
            : ''}
        </Text>
      )}
      {entry.referenced !== undefined && entry.referenced.length > 0 && (
        <Text style={dark.note} numberOfLines={open ? undefined : 2}>
          {entry.referenced.join('\n')}
        </Text>
      )}
      {entry.request !== '' && (
        <Text style={dark.note} numberOfLines={open ? undefined : 1}>
          {entry.request}
        </Text>
      )}
      {entry.response !== undefined && (
        <Text style={[dark.note, styles.error]}>{entry.response}</Text>
      )}
      {open && entry.detail !== undefined && (
        <View style={styles.detailBox}>
          <Text style={dark.note}>{entry.detail}</Text>
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
  const allEntries = useTraces((s) => s.entries);
  const clear = useTraces((s) => s.clear);
  // Model calls are the story; the data fetches drown them, so they hide
  // behind a toggle.
  const [showAll, setShowAll] = useState(false);
  const entries = showAll
    ? allEntries
    : allEntries.filter((e) => modelFor(e.path) !== undefined);

  return (
    <View style={dark.screen}>
      <TopBar title="Agent traces" back dark traceButton={false}>
        <TopBarButton
          icon={showAll ? 'cpu' : 'list'}
          label={showAll ? 'Model calls only' : 'Every server call'}
          onPress={() => setShowAll((v) => !v)}
        />
        {allEntries.length > 0 && (
          <TopBarButton icon="trash-2" label="Clear traces" onPress={clear} />
        )}
      </TopBar>
      <PageBackdrop />
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={dark.body}>{showAll ? 'No calls yet' : 'No model calls yet'}</Text>
          <Text style={[dark.note, styles.hint]}>
            {showAll
              ? 'Every server call lands here'
              : 'Chat, coach, walk, sky, and trail model calls land here'}
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  hint: {},
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  row: { gap: spacing.xs },
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
  inference: {
    color: colors.signature,
  },
  model: {
    color: colors.signature,
  },
  detailBox: {
    backgroundColor: 'rgba(230, 237, 242, 0.05)',
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
    padding: spacing.m,
    marginTop: spacing.xs,
  },
});
