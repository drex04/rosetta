import { useMemo } from 'react'
import type { OntologyNode, OntologyEdge, SourceNodeData } from '@/types/index'
import type { Edge } from '@xyflow/react'
import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'
import { useMappingStore } from '../store/mappingStore'

type MappingEdgeData = Record<string, unknown>
type MappingFlowEdge = Edge<MappingEdgeData, 'mappingEdge'>

export function useCanvasData(): { nodes: (OntologyNode | SourceNodeData)[]; edges: (OntologyEdge | MappingFlowEdge)[] } {
  const masterNodes = useOntologyStore((s) => s.nodes)
  const masterEdges = useOntologyStore((s) => s.edges)
  const sources = useSourcesStore((s) => s.sources)
  const activeSourceId = useSourcesStore((s) => s.activeSourceId)
  const mappings = useMappingStore((s) => s.mappings)
  const selectedMappingId = useMappingStore((s) => s.selectedMappingId)

  const active = useMemo(
    () => sources.find((s) => s.id === activeSourceId),
    [sources, activeSourceId],
  )

  const nodes = useMemo(
    () => [...masterNodes, ...(active?.schemaNodes ?? [])],
    [masterNodes, active?.schemaNodes],
  )

  const mappingEdgesBase = useMemo((): MappingFlowEdge[] => {
    const result: MappingFlowEdge[] = []

    // Only render mapping edges for the active source to avoid ghost edges from inactive sources
    const activeMappings = activeSourceId ? (mappings[activeSourceId] ?? []) : []

    for (const mapping of activeMappings) {
      // Scope source node lookup to the correct source (by sourceId) to handle duplicate URIs
      const sourceWithMapping = sources.find((src) => src.id === mapping.sourceId)
      const sourceNode = sourceWithMapping?.schemaNodes.find((n) => n.data.uri === mapping.sourceClassUri)
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
        data: { mappingId: mapping.id, groupId: mapping.groupId, groupOrder: mapping.groupOrder, kind: mapping.kind },
      })
    }

    return result
  }, [mappings, masterNodes, sources, activeSourceId])

  const mappingEdges = useMemo(
    () =>
      mappingEdgesBase.map((e) => ({
        ...e,
        selected: (e.data as { mappingId?: string })?.mappingId === selectedMappingId,
        data: {
          ...(e.data as object),
          selected: (e.data as { mappingId?: string })?.mappingId === selectedMappingId,
        },
      })),
    [mappingEdgesBase, selectedMappingId],
  )

  const edges = useMemo(
    () => [...masterEdges, ...(active?.schemaEdges ?? []), ...mappingEdges],
    [masterEdges, active?.schemaEdges, mappingEdges],
  )

  return { nodes, edges }
}
