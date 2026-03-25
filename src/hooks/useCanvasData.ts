import { useMemo } from 'react'
import type { OntologyNode, OntologyEdge, SourceNode } from '@/types/index'
import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'

export function useCanvasData(): { nodes: (OntologyNode | SourceNode)[]; edges: OntologyEdge[] } {
  const masterNodes = useOntologyStore((s) => s.nodes)
  const masterEdges = useOntologyStore((s) => s.edges)
  const sources = useSourcesStore((s) => s.sources)
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const active = useMemo(
    () => sources.find((s) => s.id === activeSourceId),
    [sources, activeSourceId],
  )

  const nodes = useMemo(
    () => [...masterNodes, ...(active?.schemaNodes ?? [])],
    [masterNodes, active?.schemaNodes],
  )

  const edges = useMemo(
    () => [...masterEdges, ...(active?.schemaEdges ?? [])],
    [masterEdges, active?.schemaEdges],
  )

  return { nodes, edges }
}
