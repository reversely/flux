import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ChapterDetail } from '@/api/types';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { knotsForTile } from '@/data/coach';
import { loadChapter, loadChapters, tileById } from '@/data/encyclopedia';
import { useSession } from '@/store/session';
import { colors, radius, sizes, spacing, typography } from '@/theme/tokens';

interface TileContent {
  chapters: ChapterDetail[];
  sample: boolean;
}

/**
 * A tile can span several chapters (Water is chapters 6 and 17), so the
 * screen resolves the tile's chapter list first, then loads each chapter's
 * sections and renders them grouped by chapter in manual order.
 */
export default function TileSections() {
  const { tile: tileParam } = useLocalSearchParams<{ tile: string }>();
  const tile = tileById(Number(tileParam));
  const client = useSession((s) => s.client);
  const router = useRouter();
  const [content, setContent] = useState<TileContent | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (tile === undefined) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const api = client();
        const chapters = await loadChapters(api);
        const mine = chapters.data
          .filter((c) => c.tile_id === tile.id)
          .sort((a, b) => a.fm_number - b.fm_number);
        const details = await Promise.all(mine.map((c) => loadChapter(api, c.id)));
        if (!cancelled) {
          setContent({
            chapters: details.map((d) => d.data),
            sample: chapters.sample || details.some((d) => d.sample),
          });
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tile, client]);

  if (tile === undefined) {
    return (
      <View style={styles.screen}>
        <TopBar title="Encyclopedia" back />
        <Text style={[typography.body, styles.message]}>This tile does not exist.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title={tile.title} back />
      {content === null ? (
        failed ? (
          <Text style={[typography.body, styles.message]}>
            This tile&apos;s chapters could not be loaded. Connect to a server from the home
            screen and try again.
          </Text>
        ) : (
          <ActivityIndicator style={styles.spinner} color={colors.signature} />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {content.sample && <Tag label="Sample content" tone="yellow" />}
          {knotsForTile(tile.id).length > 0 && (
            <View style={styles.chapter}>
              <Text style={[typography.annotation, styles.chapterLabel]}>Knot coach</Text>
              <View style={styles.sectionCard}>
                {knotsForTile(tile.id).map((knot, index) => (
                  <Pressable
                    key={knot.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${knot.name} coach`}
                    onPress={() => router.push(`/coach/${knot.id}`)}
                    style={[styles.sectionRow, index > 0 && styles.sectionRowBorder]}
                  >
                    <Feather name="video" size={16} color={colors.signature} />
                    <Text style={[typography.listBody, styles.sectionTitle]}>{knot.name}</Text>
                    <Feather name="chevron-right" size={16} color={colors.ink3} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {content.chapters.map((chapter) => (
            <View key={chapter.id} style={styles.chapter}>
              <Text style={[typography.annotation, styles.chapterLabel]}>
                Chapter {chapter.fm_number}: {chapter.title}
              </Text>
              {chapter.sections.length === 0 ? (
                <Text style={[typography.annotation, styles.emptyChapter]}>
                  No sections in this pack yet.
                </Text>
              ) : (
                <View style={styles.sectionCard}>
                  {chapter.sections.map((section, index) => (
                    <Pressable
                      key={section.id}
                      accessibilityRole="button"
                      accessibilityLabel={section.title}
                      onPress={() => router.push(`/encyclopedia/section/${section.id}`)}
                      style={[styles.sectionRow, index > 0 && styles.sectionRowBorder]}
                    >
                      <Text style={[typography.listBody, styles.sectionTitle]}>
                        {section.title}
                      </Text>
                      <Feather name="chevron-right" size={16} color={colors.ink3} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  spinner: {
    marginTop: spacing.xxxl,
  },
  message: {
    padding: spacing.xxl,
    textAlign: 'center',
  },
  list: {
    padding: spacing.l,
    gap: spacing.l,
  },
  chapter: {
    gap: spacing.s,
  },
  chapterLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyChapter: {
    paddingLeft: spacing.s,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.rowHeight,
    paddingHorizontal: spacing.l,
    gap: spacing.s,
  },
  sectionRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  sectionTitle: {
    flex: 1,
  },
});
