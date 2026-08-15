/**
 * The visual-guide content model. Each tile carries rephrased copy (never
 * manual text verbatim), organized as groups of items; an item is a blurb
 * plus launchers. A ToolLaunch names the widget to open and the context it
 * preloads (`prime` selects the model or coach the target readies, `subject`
 * narrows it to one item), so chat and the guide share one launch shape.
 */

import type { ChatTool } from '@/api/types';

export type ToolLaunch = ChatTool;

export interface GuideItem {
  id: string;
  title: string;
  blurb: string;
  tools: ToolLaunch[];
}

export interface GuideGroup {
  id: string;
  title: string;
  items: GuideItem[];
}

export interface TileGuide {
  tileId: number;
  intro: string;
  groups: GuideGroup[];
}
