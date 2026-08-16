import { StyleSheet } from 'react-native';

import { darkHome } from './biome';
import { radius, sizes, spacing, typography } from './tokens';

/**
 * The dark surface every screen shares with the home chat (PRD 1.2). Cards sit
 * as translucent panels over the faceted backdrop rather than as opaque sheets,
 * so the world stays visible behind the content and the app reads as one place.
 */
export const dark = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: darkHome.field,
  },
  card: {
    backgroundColor: darkHome.surface,
    borderRadius: radius.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkHome.line,
    padding: spacing.l,
    gap: spacing.m,
  },
  title: { ...typography.surfaceTitle, color: darkHome.ink },
  body: { ...typography.body, color: darkHome.ink2 },
  listBody: { ...typography.listBody, color: darkHome.ink },
  note: { ...typography.annotation, color: darkHome.ink3 },
  link: { ...typography.listBody, color: darkHome.link },
  chip: {
    height: sizes.chip,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: darkHome.line,
    backgroundColor: 'rgba(230, 237, 242, 0.06)',
    paddingHorizontal: spacing.m,
    justifyContent: 'center',
  },
  chipText: { ...typography.listBody, color: darkHome.ink },
  chipOn: {
    backgroundColor: darkHome.link,
    borderColor: darkHome.link,
  },
  chipTextOn: { ...typography.listBody, color: darkHome.field },
  primary: {
    height: sizes.control,
    borderRadius: radius.control,
    backgroundColor: darkHome.link,
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
  },
  primaryText: { ...typography.button, color: darkHome.field },
  secondary: {
    height: sizes.control,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: darkHome.line,
    paddingHorizontal: spacing.l,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryText: { ...typography.listBody, color: darkHome.ink },
});
