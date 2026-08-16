import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

// One JSON file in the app's document directory holds every observation:
// local-first per #147, tiny at any realistic count, and no native storage
// dependency that would force a dev-client rebuild.
const FILE = `${FileSystem.documentDirectory}observations.json`;

export type ObservationCategory = 'water' | 'food' | 'hazard' | 'camp' | 'note';

export interface Observation {
  id: string;
  lat: number;
  lng: number;
  category: ObservationCategory;
  note: string;
  createdAt: string;
}

export const CATEGORY_LABEL: Record<ObservationCategory, string> = {
  water: 'Water',
  food: 'Food',
  hazard: 'Avoid',
  camp: 'Camp',
  note: 'Note',
};

// First launch seeds a few example observations around Snoqualmie Pass so
// the layer reads immediately; they edit and delete like any other entry.
const SEEDS: Observation[] = [
  {
    id: 'seed-water',
    lat: 47.4459,
    lng: -121.4289,
    category: 'water',
    note: 'Creek runs year-round. Filter before drinking.',
    createdAt: '2026-08-16T00:00:00Z',
  },
  {
    id: 'seed-hazard',
    lat: 47.3921,
    lng: -121.4004,
    category: 'hazard',
    note: 'Wasp nest by the log crossing. Go around the north side.',
    createdAt: '2026-08-16T00:00:00Z',
  },
  {
    id: 'seed-camp',
    lat: 47.4234,
    lng: -121.4137,
    category: 'camp',
    note: 'Flat bench, wind-sheltered. Firewood nearby.',
    createdAt: '2026-08-16T00:00:00Z',
  },
];

interface ObservationState {
  observations: Observation[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (obs: Omit<Observation, 'id' | 'createdAt'>) => Promise<Observation>;
  remove: (id: string) => Promise<void>;
  update: (
    id: string,
    changes: Partial<Pick<Observation, 'category' | 'note'>>,
  ) => Promise<void>;
}

async function write(observations: Observation[]) {
  await FileSystem.writeAsStringAsync(FILE, JSON.stringify(observations));
}

export const useObservations = create<ObservationState>((set, get) => ({
  observations: [],
  loaded: false,
  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(FILE);
      if (info.exists) {
        set({ observations: JSON.parse(await FileSystem.readAsStringAsync(FILE)), loaded: true });
        return;
      }
    } catch {
      // A corrupt file falls back to the seeds rather than a dead layer.
    }
    await write(SEEDS);
    set({ observations: SEEDS, loaded: true });
  },
  add: async (obs) => {
    const entry: Observation = {
      ...obs,
      id: `obs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const observations = [...get().observations, entry];
    set({ observations });
    await write(observations);
    return entry;
  },
  remove: async (id) => {
    const observations = get().observations.filter((o) => o.id !== id);
    set({ observations });
    await write(observations);
  },
  update: async (id, changes) => {
    const observations = get().observations.map((o) =>
      o.id === id ? { ...o, ...changes } : o,
    );
    set({ observations });
    await write(observations);
  },
}));

/** GeoJSON the map layer renders: category drives color, note drives label. */
export function observationsToGeoJSON(observations: Observation[]) {
  return {
    type: 'FeatureCollection' as const,
    features: observations.map((o) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [o.lng, o.lat] },
      properties: { id: o.id, category: o.category, label: CATEGORY_LABEL[o.category] },
    })),
  };
}
