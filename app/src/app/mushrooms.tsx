import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, Text, View } from 'react-native';

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
  const parts: string[] = [];
  const underside = card.traits.hymeniumType?.join(' or ');
  if (underside) {
    parts.push(underside);
  }
  const stem = card.traits.stipeCharacter?.join(' or ');
  if (stem && stem !== 'bare') {
    parts.push(stem);
  }
  const print = card.traits.sporePrintColor?.join(' or ');
  if (print) {
    parts.push(`${print} print`);
  }
  return parts.join(', ');
}

/**
 * The static catalog (#99): every species in the pack's walk tables,
 * grouped by genus, readable without starting the survey. The genus
 * grouping is the taxonomy the trait table carries; finer ranks arrive
 * with the regional checklist join.
 */
export default function Mushrooms() {
  const { client } = useSession();
  const [species, setSpecies] = useState<WalkSpeciesDetail[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await client().walkthroughSpecies();
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

  const sections = useMemo(() => {
    const byGenus = new Map<string, WalkSpeciesDetail[]>();
    for (const card of species ?? []) {
      const genus = card.species.split(' ')[0];
      byGenus.set(genus, [...(byGenus.get(genus) ?? []), card]);
    }
    return [...byGenus.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([genus, cards]) => ({ title: genus, data: cards }));
  }, [species]);

  return (
    <View style={styles.screen}>
      <TopBar title="Mushroom catalog" back />
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
              <View style={styles.rowText}>
                <Text style={typography.listBody}>{item.species}</Text>
                {traitSummary(item) !== '' && (
                  <Text style={typography.annotation}>{traitSummary(item)}</Text>
                )}
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
    flexShrink: 1,
    gap: 2,
  },
});
