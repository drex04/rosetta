import { useEffect, useRef } from 'react';
import { useOntologyStore } from '@/store/ontologyStore';
import { useMappingStore } from '@/store/mappingStore';
import type { OntologyNode } from '@/types/index';

/**
 * Subscribes to ontology node changes and removes any mappings whose
 * targetPropUri or sourcePropUri no longer exists in the current node set.
 * Handles property renames by treating them as remove + add.
 */
export function useInvalidateMappings(): void {
  const prevUrisRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const getPropertyUris = (nodes: OntologyNode[]): Set<string> => {
      const uris = nodes.flatMap(
        (n) => n.data.properties?.map((p) => p.uri) ?? [],
      );
      return new Set(uris);
    };

    // Initialise with current state so we don't fire spuriously on mount
    const initial = useOntologyStore.getState().nodes;
    prevUrisRef.current = getPropertyUris(initial);

    const unsub = useOntologyStore.subscribe((state) => {
      const currentUris = getPropertyUris(state.nodes);
      const prev = prevUrisRef.current ?? new Set<string>();

      // Check whether any URIs disappeared
      let anyRemoved = false;
      for (const uri of prev) {
        if (!currentUris.has(uri)) {
          anyRemoved = true;
          break;
        }
      }

      if (anyRemoved) {
        useMappingStore.getState().removeInvalidMappings(currentUris);
      }

      prevUrisRef.current = currentUris;
    });

    return unsub;
  }, []);
}
