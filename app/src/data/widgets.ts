import { useEffect, useState } from 'react';

import type { WalkGuideCard } from '@/api/types';
import { PROCEDURES } from '@/data/coach';
import { VSS_SESSIONS } from '@/data/vss';
import { useSession } from '@/store/session';

/**
 * The video-widget registry: every camera surface in the product, one row
 * each, with a stable id. Home, the camera hub, and any launcher render
 * from this list, so a widget cannot hide inside one screen's hardcoded
 * cards. Walks come from the server's guide list when a pack is connected
 * and fall back to the known pack guides offline; coaches and VSS sessions
 * derive from their own data modules, so a new procedure or session joins
 * the registry by existing.
 */

export type VideoWidgetKind = 'walk' | 'coach' | 'vss' | 'trail';

export interface VideoWidget {
  /** Stable identifier: walk:<guide>, coach:<procedure>, vss:<session>, trail. */
  id: string;
  kind: VideoWidgetKind;
  title: string;
  /** Field-guide fragment under the title. */
  line: string;
  route: { pathname: string; params?: Record<string, string> };
}

export interface VideoWidgetGroup {
  /** Stable group id; coach groups derive one per owning tile. */
  id: string;
  kind: VideoWidgetKind;
  title: string;
  widgets: VideoWidget[];
  /** One category panel for home; people pick a task, not a knot name.
   * Absent means home shows the group's own leading widgets. */
  summary?: VideoWidget;
}

// The walks every pack carries; the live guide list replaces this when the
// server answers, so an offline home still shows the walk entries.
const FALLBACK_WALKS: VideoWidget[] = [
  walkWidget({ id: 'fungi-edibility', title: 'Mushrooms' }),
  walkWidget({ id: 'berry-edibility', title: 'Berries' }),
];

function walkWidget(guide: {
  id: string;
  title: string;
  species_count?: number;
  danger_count?: number;
}): VideoWidget {
  // A connected pack states its real coverage; offline keeps the generic line.
  const line =
    guide.species_count !== undefined && guide.species_count > 0
      ? `${guide.species_count} species, ${guide.danger_count ?? 0} dangerous.`
      : 'Feature by feature to a verdict.';
  return {
    id: `walk:${guide.id}`,
    kind: 'walk',
    title: guide.title,
    line,
    route: {
      pathname: '/walkthrough',
      // The default guide stays unnamed so pre-guide servers keep working.
      params: guide.id === 'fungi-edibility' ? {} : { guide: guide.id },
    },
  };
}

const VSS_LINES: Record<string, string> = {
  weather: 'What the sky will do next.',
  celestial: 'A bearing from stars or a shadow.',
};

// Coach procedures group by the encyclopedia tile that owns them, the
// taxonomy the data already carries: 8 Tools & Cordage, 3 Fire, 1 Medicine.
const COACH_GROUPS: { tileId: number; title: string; summaryTitle?: string }[] = [
  { tileId: 8, title: 'Knots', summaryTitle: 'Tie a knot' },
  { tileId: 3, title: 'Fire' },
  { tileId: 1, title: 'First aid' },
];

function coachWidget(p: (typeof PROCEDURES)[number]): VideoWidget {
  return {
    id: `coach:${p.id}`,
    kind: 'coach',
    title: p.name,
    line: 'One step at a time, camera checking.',
    route: { pathname: `/coach/${p.id}` },
  };
}

function coachGroups(): VideoWidgetGroup[] {
  const groups: VideoWidgetGroup[] = [];
  const placed = new Set<string>();
  for (const { tileId, title, summaryTitle } of COACH_GROUPS) {
    const members = PROCEDURES.filter((p) => p.tileId === tileId);
    if (members.length === 0) {
      continue;
    }
    members.forEach((p) => placed.add(p.id));
    groups.push({
      id: `coach-${tileId}`,
      kind: 'coach',
      title,
      widgets: members.map(coachWidget),
      summary:
        summaryTitle !== undefined && members.length > 1
          ? {
              id: `coach-group:${tileId}`,
              kind: 'coach',
              title: summaryTitle,
              line: `${members.length} knots, one step at a time.`,
              route: { pathname: '/capture' },
            }
          : undefined,
    });
  }
  // A procedure on an unlisted tile still surfaces rather than hiding.
  const rest = PROCEDURES.filter((p) => !placed.has(p.id));
  if (rest.length > 0) {
    groups.push({
      id: 'coach-other',
      kind: 'coach',
      title: 'Coach',
      widgets: rest.map(coachWidget),
    });
  }
  return groups;
}

const VSS_WIDGETS: VideoWidget[] = VSS_SESSIONS.map((s) => ({
  id: `vss:${s.id}`,
  kind: 'vss',
  title: s.title,
  line: VSS_LINES[s.id] ?? 'Short clip. Spoken interview.',
  route: { pathname: `/vss/${s.id}` },
}));

const TRAIL_WIDGET: VideoWidget = {
  id: 'trail',
  kind: 'trail',
  title: 'Record trail',
  line: 'Clips to the server. Ask about them later.',
  route: { pathname: '/capture/trail' },
};

const GROUP_TITLES: Record<VideoWidgetKind, string> = {
  walk: 'Identify',
  coach: 'Coach',
  vss: 'Read the conditions',
  trail: 'Trail',
};


export function widgetGroups(walks: VideoWidget[] = FALLBACK_WALKS): VideoWidgetGroup[] {
  return [
    { id: 'walk', kind: 'walk', title: GROUP_TITLES.walk, widgets: walks },
    ...coachGroups(),
    { id: 'vss', kind: 'vss', title: GROUP_TITLES.vss, widgets: VSS_WIDGETS },
    { id: 'trail', kind: 'trail', title: GROUP_TITLES.trail, widgets: [TRAIL_WIDGET] },
  ];
}

export function widgetById(id: string, groups: VideoWidgetGroup[]): VideoWidget | undefined {
  for (const group of groups) {
    const hit = group.widgets.find((w) => w.id === id);
    if (hit !== undefined) {
      return hit;
    }
  }
  return undefined;
}

/** The registry with walks refreshed from the connected pack's guide list. */
export function useVideoWidgets(): VideoWidgetGroup[] {
  const client = useSession((s) => s.client);
  const [walks, setWalks] = useState<VideoWidget[]>(FALLBACK_WALKS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const guides: WalkGuideCard[] = await client().walkthroughGuides();
        if (!cancelled && guides.length > 0) {
          setWalks(guides.map(walkWidget));
        }
      } catch {
        // Offline keeps the fallback walks; the walk screen reports the
        // missing pack when opened.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return widgetGroups(walks);
}
