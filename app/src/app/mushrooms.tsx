import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, SectionList, StyleSheet, Text, View } from 'react-native';

import type { WalkEdibility, WalkSpeciesDetail } from '@/api/types';
import { Tag, type TagTone } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/store/session';
import { colors, radius, spacing, typography } from '@/theme/tokens';

const edibilityTone: Record<WalkEdibility, TagTone> = {
  danger: 'red',
  caution: 'orange',
  inedible: 'gray',
  edible: 'green',
  unknown: 'gray',
};

/** Field-guide fragment of the traits a reader checks first. */
function traitSummary(card: WalkSpeciesDetail): string {
  const fungi = [
    card.traits.hymeniumType?.join(' or '),
    (() => {
      const stem = card.traits.stipeCharacter?.join(' or ');
      return stem && stem !== 'bare' ? stem : undefined;
    })(),
    (() => {
      const print = card.traits.sporePrintColor?.join(' or ');
      return print ? `${print} print` : undefined;
    })(),
  ].filter((part): part is string => Boolean(part));
  if (fungi.length > 0) {
    return fungi.join(', ');
  }
  // A guide catalog without fungi characters reads its first few recorded
  // traits instead, in the pack's character order.
  return Object.values(card.traits)
    .map((states) => states.join(' or '))
    .slice(0, 3)
    .join(', ');
}

/**
 * The static catalog (#99): every species in the pack's walk tables,
 * grouped by genus, readable without starting the survey. The genus
 * grouping is the taxonomy the trait table carries; finer ranks arrive
 * with the regional checklist join.
 */
export default function Mushrooms() {
  const { client } = useSession();
  // The survey hands over its selections; the same filter rule applies
  // client-side: any-of within a character, all-of across, missing data
  // never eliminates.
  const { answers: answersParam, guide, title } = useLocalSearchParams<{
    answers?: string;
    guide?: string;
    title?: string;
  }>();
  const answers = useMemo<Record<string, string[]>>(() => {
    try {
      return answersParam ? JSON.parse(answersParam) : {};
    } catch {
      return {};
    }
  }, [answersParam]);
  const filtering = Object.values(answers).some((states) => states.length > 0);
  const [species, setSpecies] = useState<WalkSpeciesDetail[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await client().walkthroughSpecies(guide || undefined);
        if (!cancelled) {
          setSpecies(rows);
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
  }, [client]);

  const matches = useMemo(() => {
    if (!filtering) {
      return species ?? [];
    }
    return (species ?? []).filter((card) =>
      Object.entries(answers).every(([character, states]) => {
        if (states.length === 0) {
          return true;
        }
        const recorded = card.traits[character];
        return recorded === undefined || recorded.some((s) => states.includes(s));
      }),
    );
  }, [species, answers, filtering]);

  const dangerCount = useMemo(
    () => matches.filter((card) => card.edibility === 'danger').length,
    [matches],
  );

  const sections = useMemo(() => {
    const byGenus = new Map<string, WalkSpeciesDetail[]>();
    for (const card of matches) {
      const genus = card.species.split(' ')[0];
      byGenus.set(genus, [...(byGenus.get(genus) ?? []), card]);
    }
    return [...byGenus.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([genus, cards]) => ({
        title: genus,
        // Danger rows first inside a genus, so the warning reads in place.
        data: [...cards].sort(
          (a, b) => Number(b.edibility === 'danger') - Number(a.edibility === 'danger'),
        ),
      }));
  }, [matches]);

  return (
    <View style={styles.screen}>
      <TopBar
        title={filtering ? 'Matches' : title ? `${title} catalog` : 'Mushroom catalog'}
        back
      />
      {species === null ? (
        failed ? (
          <Text style={[typography.body, styles.message]}>
            The catalog needs a server with a walkthrough pack. Please connect on the
            Server screen first.
          </Text>
        ) : (
          <ActivityIndicator style={styles.spinner} color={colors.signature} />
        )
      ) : (
        <SectionList
          ListHeaderComponent={
            filtering && dangerCount > 0 ? (
              <Text style={styles.dangerLine}>
                {dangerCount} dangerous kinds still match. Rule them out before eating.
              </Text>
            ) : null
          }
          sections={sections}
          keyExtractor={(card) => card.species}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.genusHeader}>
              <Text style={typography.surfaceTitle}>{section.title}</Text>
              <Text style={typography.annotation}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.image && (
                <Image
                  source={{ uri: client().speciesImageUrl(item.species) }}
                  style={styles.thumb}
                />
              )}
              <View style={styles.rowText}>
                <Text style={typography.listBody}>
                  {item.common_name ? `${item.common_name} (${item.species})` : item.species}
                </Text>
                {traitSummary(item) !== '' && (
                  <Text style={typography.annotation}>{traitSummary(item)}</Text>
                )}
                {item.image && item.image_artist ? (
                  <Text style={typography.annotation}>
                    {`commons.wikimedia.org · ${item.image_artist} · ${item.image_license ?? ''}`}
                  </Text>
                ) : null}
              </View>
              <Tag label={item.edibility} tone={edibilityTone[item.edibility]} />
            </View>
          )}
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
  spinner: {
    marginTop: spacing.xxxl,
  },
  message: {
    padding: spacing.xl,
  },
  list: {
    padding: spacing.l,
    paddingTop: 0,
  },
  genusHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: colors.paper,
    paddingVertical: spacing.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderRadius: radius.control,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    backgroundColor: colors.line,
  },
  dangerLine: {
    ...typography.body,
    color: '#8C3730',
    paddingVertical: spacing.s,
  },
});
