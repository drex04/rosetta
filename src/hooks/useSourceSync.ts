import { useCallback } from 'react';
import { useSourcesStore } from '@/store/sourcesStore';
import { useMappingStore } from '@/store/mappingStore';
import { jsonToSchema } from '@/lib/jsonToSchema';
import { xmlToSchema } from '@/lib/xmlToSchema';

// ─── useSourceSync ────────────────────────────────────────────────────────────
//
// Provides resetSourceSchema: re-derives schemaNodes/schemaEdges from rawData
// and clears mappings for the active source.

export function useSourceSync() {
  const resetSourceSchema = useCallback(() => {
    const { activeSourceId, sources } = useSourcesStore.getState();
    if (!activeSourceId) return;

    const source = sources.find((s) => s.id === activeSourceId);
    if (!source) return;

    try {
      const result =
        source.dataFormat === 'xml'
          ? xmlToSchema(source.rawData, source.name)
          : jsonToSchema(source.rawData, source.name);

      useSourcesStore.getState().updateSource(activeSourceId, {
        schemaNodes: result.nodes,
        schemaEdges: result.edges,
        parseError: null,
      });

      useMappingStore.getState().clearMappingsForSource(activeSourceId);
    } catch (e) {
      useSourcesStore.getState().updateSource(activeSourceId, {
        parseError: (e as Error).message ?? 'Reset failed',
      });
    }
  }, []);

  return { resetSourceSchema };
}
