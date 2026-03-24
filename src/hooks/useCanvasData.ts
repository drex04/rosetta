import { useMemo } from 'react'
import type { OntologyNode, OntologyEdge } from '@/types/index'
import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'

export function useCanvasData(): { nodes: OntologyNode[]; edges: OntologyEdge[] } {
  const masterNodes = useOntologyStore((s) => s.nodes)
  const masterEdges = useOntologyStore((s) => s.edges)
  const sources = useSourcesStore((s) => s.sources)
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const active = useMemo(
    () => sources.find((s) => s.id === activeSourceId),
    [sources, activeSourceId],
  )

  const nodes = useMemo(
    () => [...masterNodes, ...(active?.schemaNodes ?? [])] as OntologyNode[], // source nodes typed properly in a later phase
    [masterNodes, active?.schemaNodes],
  )

  const edges = useMemo(
    () => [...masterEdges, ...(active?.schemaEdges ?? [])] as OntologyEdge[], // source edges typed properly in a later phase
    [masterEdges, active?.schemaEdges],
  )

  return { nodes, edges }
}
