/**
 * In-app trail routing (#149): A* over a server-fetched graph corridor
 * (#229), run locally so avoid-marker penalties stay on the phone. The
 * caller falls back to a straight bearing line whenever this returns null:
 * corridor unavailable, endpoints too far from any trail, or no path.
 */

import type { GraphWindow } from '@/api/types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TrailRoute {
  /** [lng, lat] pairs, GeoJSON order, from start to destination. */
  coords: [number, number][];
  distanceM: number;
}

// An endpoint farther than this from any graph node has no useful trail
// access; the bearing line is the honest answer there.
const MAX_SNAP_M = 600;

// Edges touching a node within this range of an avoid marker cost extra,
// so routes bend around reported hazards instead of through them (#149).
const AVOID_RANGE_M = 75;
const AVOID_PENALTY_M = 2000;

export function haversineM(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const half =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(half));
}

export function planRoute(
  window: GraphWindow,
  from: LatLng,
  to: LatLng,
  avoid: LatLng[],
): TrailRoute | null {
  const position = new Map<number, LatLng>();
  for (const [id, lat, lng] of window.nodes) {
    position.set(id, { lat, lng });
  }
  const nearestNode = (point: LatLng): { id: number; snapM: number } | null => {
    let best: { id: number; snapM: number } | null = null;
    for (const [id, lat, lng] of window.nodes) {
      const d = haversineM(point, { lat, lng });
      if (best === null || d < best.snapM) {
        best = { id, snapM: d };
      }
    }
    return best !== null && best.snapM <= MAX_SNAP_M ? best : null;
  };
  const start = nearestNode(from);
  const goal = nearestNode(to);
  if (start === null || goal === null) {
    return null;
  }

  const penalized = new Set<number>();
  if (avoid.length > 0) {
    for (const [id, lat, lng] of window.nodes) {
      if (avoid.some((marker) => haversineM(marker, { lat, lng }) <= AVOID_RANGE_M)) {
        penalized.add(id);
      }
    }
  }
  // Cost carries the avoid penalty; walked keeps the true edge meters so
  // the reported distance stays honest on a penalized detour.
  const adjacency = new Map<number, [number, number][]>();
  const walked = new Map<string, number>();
  for (const [a, b, meters] of window.edges) {
    const cost = meters + (penalized.has(a) || penalized.has(b) ? AVOID_PENALTY_M : 0);
    (adjacency.get(a) ?? adjacency.set(a, []).get(a)!).push([b, cost]);
    (adjacency.get(b) ?? adjacency.set(b, []).get(b)!).push([a, cost]);
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    walked.set(key, Math.min(walked.get(key) ?? Infinity, meters));
  }

  // A* with a haversine heuristic over a binary heap.
  const goalPos = position.get(goal.id)!;
  const g = new Map<number, number>([[start.id, 0]]);
  const prev = new Map<number, number>();
  const heap: [number, number][] = [[haversineM(position.get(start.id)!, goalPos), start.id]];
  const pop = (): [number, number] | undefined => {
    if (heap.length === 0) {
      return undefined;
    }
    let bestIndex = 0;
    for (let i = 1; i < heap.length; i += 1) {
      if (heap[i][0] < heap[bestIndex][0]) {
        bestIndex = i;
      }
    }
    return heap.splice(bestIndex, 1)[0];
  };
  let found = false;
  for (let next = pop(); next !== undefined; next = pop()) {
    const [, node] = next;
    if (node === goal.id) {
      found = true;
      break;
    }
    for (const [neighbor, cost] of adjacency.get(node) ?? []) {
      const tentative = g.get(node)! + cost;
      if (tentative < (g.get(neighbor) ?? Infinity)) {
        g.set(neighbor, tentative);
        prev.set(neighbor, node);
        heap.push([tentative + haversineM(position.get(neighbor)!, goalPos), neighbor]);
      }
    }
  }
  if (!found) {
    return null;
  }

  const nodePath: number[] = [goal.id];
  while (nodePath[0] !== start.id) {
    nodePath.unshift(prev.get(nodePath[0])!);
  }
  const coords: [number, number][] = [[from.lng, from.lat]];
  let distance = start.snapM + goal.snapM;
  for (let i = 0; i < nodePath.length; i += 1) {
    const p = position.get(nodePath[i])!;
    coords.push([p.lng, p.lat]);
    if (i > 0) {
      const a = nodePath[i - 1];
      const b = nodePath[i];
      distance += walked.get(a < b ? `${a}:${b}` : `${b}:${a}`) ?? 0;
    }
  }
  coords.push([to.lng, to.lat]);
  return { coords, distanceM: Math.round(distance) };
}
