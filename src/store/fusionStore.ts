import { create } from 'zustand';
import { executeAllConstructs, type FusionResult } from '../lib/fusion';
import { compactToJsonLd } from '../lib/jsonldFramer';
import { useSourcesStore } from './sourcesStore';
import { useMappingStore } from './mappingStore';
import { useOntologyStore } from './ontologyStore';

interface FusionState {
  result: FusionResult | null;
  jsonLd: object | null;
  loading: boolean;
  stale: boolean;
  error: string | null;
  lastRun: number | null;
  runFusion: () => Promise<void>;
  setStale: (stale: boolean) => void;
  reset: () => void;
}

export const useFusionStore = create<FusionState>()((set, get) => ({
  result: null,
  jsonLd: null,
  loading: false,
  stale: false,
  error: null,
  lastRun: null,

  runFusion: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const sources = useSourcesStore.getState().sources;
      const { mappings } = useMappingStore.getState();
      const { nodes: ontologyNodes } = useOntologyStore.getState();
      const fusionResult = await executeAllConstructs(
        sources,
        mappings,
        ontologyNodes,
      );
      const jsonLd = await compactToJsonLd(fusionResult.store, ontologyNodes);
      set({
        result: fusionResult,
        jsonLd,
        loading: false,
        stale: false,
        lastRun: Date.now(),
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Fusion failed';
      set({ loading: false, error: message });
    }
  },

  setStale: (stale) => set({ stale }),

  reset: () =>
    set({
      result: null,
      jsonLd: null,
      loading: false,
      stale: false,
      error: null,
      lastRun: null,
    }),
}));

export function subscribeFusionToMappings(): () => void {
  return useMappingStore.subscribe(() =>
    useFusionStore.getState().setStale(true),
  );
}
