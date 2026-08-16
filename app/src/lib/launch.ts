import type { router } from 'expo-router';

import type { ChatTool } from '@/api/types';

type Router = typeof router;

/**
 * Route a tool launch to its widget with the context it preloads: `prime`
 * selects the model or coach the target readies, `subject` narrows it to one
 * item. Chat answers and encyclopedia guide items share this one shape, so a
 * natural-language answer can open the camera already primed for its task.
 */
export function launchTool(nav: Router, tool: ChatTool): void {
  switch (tool.kind) {
    case 'camera':
      nav.push({
        pathname: '/capture',
        params: { prime: tool.prime ?? '', subject: tool.subject ?? '' },
      });
      return;
    case 'chat':
      nav.push({ pathname: '/', params: { ask: tool.question ?? '' } });
      return;
    case 'reference':
      nav.push({
        pathname: '/reference',
        params: tool.chapter ? { chapter: String(tool.chapter) } : {},
      });
      return;
    case 'catalog':
      nav.push({ pathname: '/mushrooms' });
      return;
    case 'walkthrough':
      nav.push({
        pathname: '/walkthrough',
        params: { camera: tool.camera ? '1' : '0' },
      });
      return;
  }
}
