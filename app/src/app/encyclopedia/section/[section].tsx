import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Block, Figure, SectionDetail } from '@/api/types';
import { References, type ReferenceRow } from '@/components/References';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { loadSection } from '@/data/encyclopedia';
import { useSession } from '@/store/session';
import { colors, radius, spacing, tagColors, typography } from '@/theme/tokens';

/** Distinct FM figure refs cited across the section, in first-mention order. */
function citedFigureRefs(blocks: Block[]): string[] {
  const refs: string[] = [];
  for (const block of blocks) {
    for (const ref of (block.figure_ref ?? '').split(',')) {
      const trimmed = ref.trim();
      if (trimmed !== '' && !refs.includes(trimmed)) {
        refs.push(trimmed);
      }
    }
  }
  return refs;
}

/**
 * The entry's reference rows: one per source document the blocks draw on,
 * one per cited figure. FM rows deep-link into the bundled manual at the
 * chapter (`/reference`), the same file the chat agent's corpus quotes.
 */
function referenceRows(section: SectionDetail, figures: Record<string, Figure>): ReferenceRow[] {
  const chapter = Number(section.chapter_id.replace(/^ch0?/, ''));
  const manualHref = Number.isNaN(chapter) ? '/reference' : `/reference?chapter=${chapter}`;
  const rows: ReferenceRow[] = [];
  for (const source of [...new Set(section.blocks.map((b) => b.source))]) {
    const fm = source === 'FM 21-76';
    rows.push({
      key: `doc-${source}`,
      icon: 'book-open',
      title: source,
      note: fm
        ? `Chapter ${chapter}${section.fm_heading !== null ? `, section ${section.fm_heading}` : ''} · US Army · public domain`
        : undefined,
      href: fm ? manualHref : undefined,
    });
  }
  for (const ref of citedFigureRefs(section.blocks)) {
    const figure = figures[ref];
    rows.push({
      key: `fig-${ref}`,
      icon: 'image',
      title: `Figure ${ref}`,
      note:
        figure?.attribution ??
        `${figure?.source_manual ?? 'FM 21-76'} · ${figure?.license ?? 'public-domain'}`,
      href: manualHref,
    });
  }
  return rows;
}

function bulletLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^•\s*/, ''))
    .filter((line) => line.length > 0);
}

/** A procedure or mnemonic block opens with its method name on the first line. */
function splitMethodName(text: string): { name: string | null; body: string } {
  const newline = text.indexOf('\n');
  if (newline === -1) {
    return { name: null, body: text };
  }
  return { name: text.slice(0, newline), body: text.slice(newline + 1) };
}

function BulletList({ lines }: { lines: string[] }) {
  return (
    <View style={styles.bullets}>
      {lines.map((line, index) => (
        <View key={index} style={styles.bulletRow}>
          <Text style={[typography.body, styles.bulletMark]}>•</Text>
          <Text style={[typography.body, styles.bulletText]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Renders one typed block per the pack schema. Warnings take the red card
 * with no collapse or truncation anywhere in this reader (PRD 1.3 and 1.6:
 * warnings stay visible).
 */
function BlockView({ block }: { block: Block }) {
  const serverUrl = useSession((st) => st.serverUrl).trim();
  const [figureFailed, setFigureFailed] = useState(false);
  // The manual's own figure, extracted into the pack (#137): the image
  // renders in place with its public-domain line, and a missing image
  // falls back to the bare figure reference rather than a broken frame.
  const annotations = (
    <>
      {block.figure_ref !== null && !figureFailed && serverUrl !== '' && (
        <View style={styles.figureCard}>
          <Image
            source={{
              uri: `${serverUrl}/v1/content/figures/fm21-76-fig-${block.figure_ref}/image`,
            }}
            style={styles.figureImage}
            contentFit="contain"
            onError={() => setFigureFailed(true)}
          />
          <Text style={typography.annotation}>
            Figure {block.figure_ref} · FM 21-76 · public domain
          </Text>
        </View>
      )}
      {block.figure_ref !== null && (figureFailed || serverUrl === '') && (
        <Text style={typography.annotation}>Figure {block.figure_ref}</Text>
      )}
    </>
  );

  switch (block.type) {
    case 'warning':
      return (
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Feather name="alert-triangle" size={16} color={tagColors.red.text} />
            <Text style={[typography.tag, styles.warningLabel]}>Warning</Text>
          </View>
          <Text style={[typography.body, styles.warningText]}>{block.text}</Text>
          {annotations}
        </View>
      );
    case 'checklist':
    case 'materials':
      return (
        <View style={styles.block}>
          {block.type === 'materials' && (
            <Text style={[typography.annotation, styles.blockLabel]}>Materials</Text>
          )}
          <BulletList lines={bulletLines(block.text)} />
          {annotations}
        </View>
      );
    case 'procedure_step':
    case 'mnemonic': {
      const { name, body } = splitMethodName(block.text);
      return (
        <View style={styles.block}>
          {name !== null && <Text style={typography.surfaceTitle}>{name}</Text>}
          <Text style={typography.body}>{body}</Text>
          {annotations}
        </View>
      );
    }
    case 'note':
      return (
        <View style={styles.noteCard}>
          <Text style={typography.body}>{block.text}</Text>
          {annotations}
        </View>
      );
    case 'reference':
      return (
        <View style={styles.block}>
          <Text style={[typography.body, styles.referenceText]}>{block.text}</Text>
          {annotations}
        </View>
      );
    case 'military_archive':
      return (
        <View style={styles.block}>
          <Tag label="Military archive" tone="gray" />
          <Text style={typography.body}>{block.text}</Text>
          {annotations}
        </View>
      );
    default:
      return (
        <View style={styles.block}>
          <Text style={typography.body}>{block.text}</Text>
          {annotations}
        </View>
      );
  }
}

export default function SectionReader() {
  const { section: sectionId } = useLocalSearchParams<{ section: string }>();
  const client = useSession((s) => s.client);
  const [section, setSection] = useState<SectionDetail | null>(null);
  const [sample, setSample] = useState(false);
  const [failed, setFailed] = useState(false);
  const [figures, setFigures] = useState<Record<string, Figure>>({});

  useEffect(() => {
    if (sectionId === undefined) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await loadSection(client(), sectionId);
        if (!cancelled) {
          setSection(result.data);
          setSample(result.sample);
        }
        // Figure attribution is per file (#144); a failed lookup leaves the
        // row on its manual-level default rather than blocking the entry.
        const loaded: Record<string, Figure> = {};
        await Promise.all(
          citedFigureRefs(result.data.blocks).map(async (ref) => {
            try {
              loaded[ref] = await client().getFigure(`fm21-76-fig-${ref}`);
            } catch {
              // default note stands
            }
          }),
        );
        if (!cancelled && Object.keys(loaded).length > 0) {
          setFigures(loaded);
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
  }, [sectionId, client]);

  return (
    <View style={styles.screen}>
      <TopBar title={section?.title ?? 'Section'} back />
      {section === null ? (
        failed ? (
          <Text style={[typography.body, styles.message]}>
            This section could not be loaded. Connect to a server from the home screen and try
            again.
          </Text>
        ) : (
          <ActivityIndicator style={styles.spinner} color={colors.signature} />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {sample && <Tag label="Sample content" tone="yellow" />}
          {section.fm_heading !== null && (
            <Text style={typography.annotation}>FM 21-76 section {section.fm_heading}</Text>
          )}
          {section.blocks
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((block) => (
              <BlockView key={block.id} block={block} />
            ))}
          <References rows={referenceRows(section, figures)} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  figureCard: {
    gap: 4,
    marginTop: 8,
  },
  figureImage: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
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
    gap: spacing.m,
  },
  block: {
    backgroundColor: colors.card,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    padding: spacing.l,
    gap: spacing.s,
  },
  blockLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bullets: {
    gap: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  bulletMark: {
    color: colors.ink3,
  },
  bulletText: {
    flex: 1,
  },
  warningCard: {
    backgroundColor: tagColors.red.bg,
    borderRadius: radius.surface,
    borderWidth: 1,
    borderColor: tagColors.red.text,
    padding: spacing.l,
    gap: spacing.s,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  warningLabel: {
    color: tagColors.red.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  warningText: {
    color: colors.ink,
  },
  noteCard: {
    backgroundColor: colors.gray.softBg,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray.softBorder,
    padding: spacing.l,
    gap: spacing.s,
  },
  referenceText: {
    fontStyle: 'italic',
  },
});
