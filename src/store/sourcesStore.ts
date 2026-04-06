import { create } from 'zustand';
import type { SourceNodeData, OntologyEdge, ClassData } from '@/types/index';

export interface Source {
  id: string;
  name: string;
  order: number;
  rawData: string;
  dataFormat: 'json' | 'xml';
  schemaNodes: SourceNodeData[];
  schemaEdges: OntologyEdge[];
  parseError: string | null;
}

/**
 * IDB migration guard: upgrades a persisted source record from the old
 * `json` field shape to the new `rawData` / `dataFormat` shape.
 * Safe to call on already-migrated records.
 */
export function migrateSource(record: Record<string, unknown>): Source {
  const migrated = { ...record };
  if ('json' in migrated && !('rawData' in migrated)) {
    migrated['rawData'] = migrated['json'] ?? '';
    migrated['dataFormat'] = 'json';
    delete migrated['json'];
  }
  // Ensure fields exist even on brand-new records missing both
  if (!('rawData' in migrated)) migrated['rawData'] = '';
  if (!('dataFormat' in migrated)) migrated['dataFormat'] = 'json';
  if (!('parseError' in migrated)) migrated['parseError'] = null;
  // Remove any stale json key
  delete migrated['json'];
  return migrated as unknown as Source;
}

interface SourcesState {
  sources: Source[];
  activeSourceId: string | null;
  setActiveSourceId: (id: string | null) => void;
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, patch: Partial<Source>) => void;
  /** Update a schema node's label or URI within a source. Safe no-op when ids don't exist. */
  updateSchemaNode: (
    sourceId: string,
    nodeId: string,
    patch: Partial<Pick<ClassData, 'label' | 'uri'>>,
  ) => void;
  reset: () => void;
}

export function generateSourceId(): string {
  return crypto.randomUUID();
}

export const useSourcesStore = create<SourcesState>((set) => ({
  sources: [],
  activeSourceId: null,
  setActiveSourceId: (activeSourceId) => set({ activeSourceId }),
  addSource: (source) =>
    set((s) => {
      const existingNames = new Set(s.sources.map((src) => src.name));
      let name = source.name;
      let counter = 2;
      while (existingNames.has(name)) {
        name = `${source.name} ${counter++}`;
      }
      return { sources: [...s.sources, { ...source, name }] };
    }),
  removeSource: (id) =>
    set((s) => {
      const sources = s.sources.filter((src) => src.id !== id);
      const activeSourceId =
        s.activeSourceId === id ? (sources[0]?.id ?? null) : s.activeSourceId;
      return { sources, activeSourceId };
    }),
  updateSource: (id, patch) =>
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === id ? { ...src, ...patch } : src,
      ),
    })),
  updateSchemaNode: (sourceId, nodeId, patch) =>
    set((s) => ({
      sources: s.sources.map((src) =>
        src.id === sourceId
          ? {
              ...src,
              schemaNodes: src.schemaNodes.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
              ),
            }
          : src,
      ),
    })),
  reset: () => set({ sources: [], activeSourceId: null }),
}));
