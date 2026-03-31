import { useMemo } from 'react'
import type { OntologyNode, OntologyEdge, SourceNode } from '@/types/index'
import type { Edge } from '@xyflow/react'
import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'
import { useMappingStore } from '../store/mappingStore'

type MappingEdgeData = Record<string, unknown>
type MappingFlowEdge = Edge<MappingEdgeData, 'mappingEdge'>

export function useCanvasData(): { nodes: (OntologyNode | SourceNode)[]; edges: (OntologyEdge | MappingFlowEdge)[] } {
  const masterNodes = useOntologyStore((s) => s.nodes)
  const masterEdges = useOntologyStore((s) => s.edges)
  const sources = useSourcesStore((s) => s.sources)
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const mappings = useMappingStore((s) => s.mappings)

  const active = useMemo(
    () => sources.find((s) => s.id === activeSourceId),
    [sources, activeSourceId],
  )

  const nodes = useMemo(
    () => [...masterNodes, ...(active?.schemaNodes ?? [])],
    [masterNodes, active?.schemaNodes],
  )

  const mappingEdges = useMemo((): MappingFlowEdge[] => {
    const result: MappingFlowEdge[] = []

    // Collect all source schema nodes across all sources
    const allSourceNodes: SourceNode[] = sources.flatMap((src) => src.schemaNodes)

    for (const perSourceList of Object.values(mappings)) {
      for (const mapping of perSourceList) {
        // Find the source ReactFlow node whose data.uri matches
        const sourceNode = allSourceNodes.find((n) => n.data.uri === mapping.sourceClassUri)
        // Find the master ReactFlow node whose data.uri matches
        const targetNode = masterNodes.find((n) => n.data.uri === mapping.targetClassUri)

        if (!sourceNode || !targetNode) continue

        result.push({
          id: `mapping_${mapping.id}`,
          source: sourceNode.id,
          sourceHandle: mapping.sourceHandle,
          target: targetNode.id,
          targetHandle: mapping.targetHandle,
          type: 'mappingEdge',
          data: { mappingId: mapping.id, groupId: mapping.groupId, groupOrder: mapping.groupOrder },
        })
      }
    }

    return result
  }, [mappings, masterNodes, sources])

  const edges = useMemo(
    () => [...masterEdges, ...(active?.schemaEdges ?? []), ...mappingEdges],
    [masterEdges, active?.schemaEdges, mappingEdges],
  )

  return { nodes, edges }
}
