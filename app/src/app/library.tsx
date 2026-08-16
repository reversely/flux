import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { LibraryFeedEvent } from '@/api/types';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { darkHome, HOME_BIOME } from '@/theme/biome';
import { dark } from '@/theme/dark';
import { radius, spacing } from '@/theme/tokens';

const POLL_MS = 2500;

const KIND_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  queued: 'bookmark',
  search: 'search',
  pull: 'download-cloud',
  done: 'check-circle',
};

function ago(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) {
    return `${seconds} s ago`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }
  return `${Math.floor(seconds / 3600)} h ago`;
}

/**
 * The library feed: the visible half of the gather pass. A question the
 * pack could not answer queues its topic; this feed then shows the pull —
 * sources matched, files fetched, material staged for review — newest
 * first, like a news feed. While the online gather worker is unbuilt the
 * events are its staged preview, and the footer says so plainly.
 */
export default function Library() {
  const client = useSession((s) => s.client);
  const [events, setEvents] = useState<LibraryFeedEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      client()
        .libraryFeed()
        .then((rows) => {
          if (alive) {
            setEvents(rows);
            setFailed(false);
          }
        })
        .catch(() => {
          if (alive) {
            setFailed(true);
          }
        });
    void load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [client]);

  return (
    <View style={dark.screen}>
      <TopBar title="Library feed" back dark />
      {failed && events === null ? (
        <Text style={[dark.body, styles.pad]}>
          The feed needs the server. Please connect on the Server screen first.
        </Text>
      ) : (
        <FlatList
          data={events ?? []}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[dark.body, styles.pad]}>
              Nothing yet. Ask the guide something the pack does not cover; the
              topic lands here.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.iconWell, item.kind === 'pull' && styles.iconWellPull]}>
                <Feather
                  name={KIND_ICON[item.kind] ?? 'activity'}
                  size={14}
                  color={item.kind === 'pull' ? darkHome.field : HOME_BIOME.glow}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={dark.body}>{item.line}</Text>
                <Text style={dark.note}>
                  {item.topic} · {ago(item.at)}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <Text style={[dark.note, styles.footer]}>
              Pulls run when this station is online; offline, the feed
              previews the pass. Every fetched source is staged for review
              before it joins the pack.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    padding: spacing.xl,
  },
  list: {
    padding: spacing.l,
    gap: spacing.m,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.m,
    backgroundColor: darkHome.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
    borderRadius: radius.control,
    padding: spacing.m,
    alignItems: 'flex-start',
  },
  iconWell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: darkHome.line,
  },
  iconWellPull: {
    backgroundColor: HOME_BIOME.glow,
    borderColor: HOME_BIOME.glow,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingVertical: spacing.l,
    textAlign: 'center',
  },
});
