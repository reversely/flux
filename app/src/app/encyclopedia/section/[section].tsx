import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Block, SectionDetail } from '@/api/types';
import { Tag } from '@/components/Tag';
import { TopBar } from '@/components/TopBar';
import { loadSection } from '@/data/encyclopedia';
import { useSession } from '@/store/session';
import { colors, radius, spacing, tagColors, typography } from '@/theme/tokens';

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
  const annotations = (
    <>
      {block.figure_ref !== null && (
        <Text style={typography.annotation}>Figure {block.figure_ref}</Text>
      )}
      {block.review_status === 'needs_review' && <Tag label="Needs review" tone="yellow" />}
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
