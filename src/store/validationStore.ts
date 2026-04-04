import { create } from 'zustand';
import { validateSource, type ViolationRecord } from '../lib/shacl/index';
import { generateShapesTurtle } from '../lib/shacl/shapesGenerator';
import { useSourcesStore } from './sourcesStore';
import { useOntologyStore } from './ontologyStore';
import { useMappingStore } from './mappingStore';
import type { OntologyNode } from '../types';

interface ValidationState {
  results: Record<string, ViolationRecord[]>;
  loading: boolean;
  stale: boolean;
  error: string | null;
  lastRun: number | null;
  highlightedCanvasNodeId: string | null;
  userShapesTurtle: string;

  runValidation: () => Promise<void>;
  setStale: (stale: boolean) => void;
  reset: () => void;
  setHighlightedCanvasNodeId: (id: string | null) => void;
  setUserShapesTurtle: (turtle: string) => void;
  resetShapesToAuto: (ontologyNodes: OntologyNode[]) => Promise<void>;
  snapshot: () => { userShapesTurtle: string };
  hydrate: (s: { userShapesTurtle?: unknown }) => void;
}

export const useValidationStore = create<ValidationState>()((set, get) => ({
  results: {},
  loading: false,
  stale: false,
  error: null,
  lastRun: null,
  highlightedCanvasNodeId: null,
  userShapesTurtle: '',

  runValidation: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });

    const sources = useSourcesStore.getState().sources;
    const ontologyNodes = useOntologyStore.getState().nodes;
    const getMappingsForSource =
      useMappingStore.getState().getMappingsForSource;

    const results: Record<string, ViolationRecord[]> = {};
    const errors: string[] = [];

    for (const source of sources) {
      try {
        const violations = await validateSource(
          source,
          ontologyNodes,
          getMappingsForSource(source.id),
          get().userShapesTurtle,
        );
        results[source.id] = violations as ViolationRecord[];
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Validation failed';
        errors.push(`${source.name}: ${message}`);
      }
    }

    set({
      results,
      loading: false,
      stale: false,
      error: errors.length > 0 ? errors.join('; ') : null,
      lastRun: Date.now(),
      highlightedCanvasNodeId: null,
    });
  },

  setStale: (stale) => set({ stale }),

  reset: () =>
    set({
      results: {},
      loading: false,
      stale: false,
      error: null,
      lastRun: null,
      highlightedCanvasNodeId: null,
    }),

  setHighlightedCanvasNodeId: (id) => set({ highlightedCanvasNodeId: id }),

  setUserShapesTurtle: (turtle) => set({ userShapesTurtle: turtle }),

  resetShapesToAuto: async (ontologyNodes) => {
    try {
      const t = await generateShapesTurtle(ontologyNodes);
      set({ userShapesTurtle: t });
    } catch {
      // leave unchanged on error
    }
  },

  snapshot: () => ({ userShapesTurtle: get().userShapesTurtle }),

  hydrate: (s) => {
    if (typeof s.userShapesTurtle === 'string')
      set({ userShapesTurtle: s.userShapesTurtle });
  },
}));

export function subscribeValidationToMappings(): () => void {
  const unsubMappings = useMappingStore.subscribe(() =>
    useValidationStore.getState().setStale(true),
  );
  const unsubSources = useSourcesStore.subscribe((state, prev) => {
    if (state.sources !== prev.sources) {
      useValidationStore.getState().setStale(true);
    }
  });
  return () => {
    unsubMappings();
    unsubSources();
  };
}
