import { useCallback, useEffect, useRef } from 'react'
import { ReactFlow, MiniMap, Controls, Background, applyNodeChanges } from '@xyflow/react'
import type { NodeChange, Connection, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasData } from '../../hooks/useCanvasData'
import { generateConstruct } from '@/lib/sparql'
import { useOntologyStore } from '../../store/ontologyStore'
import { useSourcesStore } from '../../store/sourcesStore'
import { useMappingStore } from '../../store/mappingStore'
import { useValidationStore } from '../../store/validationStore'
import { ClassNode } from '../nodes/ClassNode'
import { SourceNode as SourceNodeComponent } from '../nodes/SourceNode'
import { SubclassEdge } from '../edges/SubclassEdge'
import { ObjectPropertyEdge } from '../edges/ObjectPropertyEdge'
import { MappingEdge } from '../edges/MappingEdge'
import type { OntologyNode, OntologyEdge, SourceNode } from '@/types/index'

const nodeTypes = {
  classNode: ClassNode,
  sourceNode: SourceNodeComponent,
} as const

const edgeTypes = {
  subclassEdge: SubclassEdge,
  objectPropertyEdge: ObjectPropertyEdge,
  mappingEdge: MappingEdge,
} as const

interface OntologyCanvasProps {
  onCanvasChange?: (nodes: OntologyNode[], edges: OntologyEdge[]) => void
}

// Only these change types modify the RDF graph — position/select/dimensions do not
const STRUCTURAL_CHANGE_TYPES = new Set(['add', 'remove', 'reset'])

export function OntologyCanvas({ onCanvasChange }: OntologyCanvasProps) {
  const { nodes, edges } = useCanvasData()
  const setNodes = useOntologyStore((s) => s.setNodes)
  const updateSource = useSourcesStore((s) => s.updateSource)
  const addMapping = useMappingStore((s) => s.addMapping)
  const removeMapping = useMappingStore((s) => s.removeMapping)
  const canvasDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rfInstance = useRef<{ fitView: (opts?: { padding?: number; duration?: number }) => void } | null>(null)
  const prevHadNodes = useRef(false)
  const highlightedCanvasNodeId = useValidationStore((s) => s.highlightedCanvasNodeId)

  useEffect(() => {
    const hasNodes = nodes.length > 0
    if (hasNodes && !prevHadNodes.current && rfInstance.current) {
      rfInstance.current.fitView({ padding: 0.15, duration: 400 })
    }
    prevHadNodes.current = hasNodes
  }, [nodes.length])

  useEffect(() => {
    if (!highlightedCanvasNodeId || !rfInstance.current) return
    rfInstance.current.fitView({ padding: 0.4, duration: 400 })
  }, [highlightedCanvasNodeId])

  const onNodesChange = useCallback(
    (changes: NodeChange<OntologyNode | SourceNode>[]) => {
      // RD-02: Split changes by source node ID membership.
      // Source-node changes → updateSource; master-node changes → ontologyStore.
      const { activeSourceId, sources } = useSourcesStore.getState()
      const activeSource = activeSourceId !== null
        ? sources.find((s) => s.id === activeSourceId)
        : undefined
      const sourceNodeIds = new Set(activeSource?.schemaNodes.map((n) => n.id) ?? [])

      const masterChanges = changes.filter((c) => !('id' in c) || !sourceNodeIds.has(c.id))
      const sourceChanges = changes.filter((c) => 'id' in c && sourceNodeIds.has(c.id))

      // Apply master changes (existing path — unchanged)
      if (masterChanges.length > 0) {
        const masterNodes = useOntologyStore.getState().nodes
        const updated = applyNodeChanges(masterChanges as NodeChange<OntologyNode>[], masterNodes) as OntologyNode[]
        setNodes(updated)

        // Only notify parent for structural changes
        const hasStructural = masterChanges.some((c) => STRUCTURAL_CHANGE_TYPES.has(c.type))
        if (hasStructural && onCanvasChange !== undefined) {
          if (canvasDebounceTimer.current !== null) {
            clearTimeout(canvasDebounceTimer.current)
          }
          canvasDebounceTimer.current = setTimeout(() => {
            const currentEdges = useOntologyStore.getState().edges
            onCanvasChange(updated, currentEdges)
          }, 100)
        }
      }

      // Apply source changes — only when activeSource exists and Set is non-empty
      if (sourceChanges.length > 0 && activeSource !== undefined && sourceNodeIds.size > 0) {
        const updatedSourceNodes = applyNodeChanges(
          sourceChanges as NodeChange<SourceNode>[],
          activeSource.schemaNodes,
        ) as SourceNode[]
        updateSource(activeSource.id, { schemaNodes: updatedSourceNodes })
      }
    },
    [setNodes, updateSource, onCanvasChange],
  )

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const { sourceHandle, targetHandle } = connection
    return (
      (sourceHandle ?? '').startsWith('prop_') &&
      (targetHandle ?? '').startsWith('target_prop_')
    )
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    const { source, sourceHandle, target, targetHandle } = connection
    if (!source || !sourceHandle || !target || !targetHandle) return

    // Find the source node across all sources
    const { sources } = useSourcesStore.getState()
    let sourceNode: SourceNode | undefined
    let activeSourceId: string | undefined
    for (const src of sources) {
      const found = src.schemaNodes.find((n) => n.id === source)
      if (found) {
        sourceNode = found
        activeSourceId = src.id
        break
      }
    }

    // Find the target node from the ontology store
    const { nodes: allNodes } = useOntologyStore.getState()
    const targetNode = allNodes.find((n) => n.id === target)

    if (!sourceNode || !targetNode || !activeSourceId) return

    const propLabel = sourceHandle.replace('prop_', '')
    const targetPropLabel = targetHandle.replace('target_prop_', '')
    const sourceProp = sourceNode.data.properties.find((p) => p.label === propLabel)
    const targetProp = targetNode.data.properties.find((p) => p.label === targetPropLabel)
    if (!sourceProp || !targetProp) return

    const sparqlConstruct = generateConstruct({
      sourceId: activeSourceId,
      sourceClassUri: sourceNode.data.uri,
      sourcePropUri: sourceProp.uri,
      sourceHandle,
      targetClassUri: targetNode.data.uri,
      targetPropUri: targetProp.uri,
      targetHandle,
    })

    addMapping({
      sourceId: activeSourceId,
      sourceClassUri: sourceNode.data.uri,
      sourcePropUri: sourceProp.uri,
      targetClassUri: targetNode.data.uri,
      targetPropUri: targetProp.uri,
      sourceHandle,
      targetHandle,
      kind: 'direct',
      sparqlConstruct,
    })
  }, [addMapping])

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    for (const edge of deletedEdges) {
      if (edge.id.startsWith('mapping_')) {
        removeMapping(edge.id)
      }
    }
  }, [removeMapping])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onEdgesDelete={onEdgesDelete}
      isValidConnection={isValidConnection}
      nodesDraggable={true}
      fitView
      onInit={(instance) => { rfInstance.current = instance }}
      aria-label="Ontology mapping canvas"
    >
      <MiniMap />
      <Controls aria-label="Canvas controls" />
      <Background />
    </ReactFlow>
  )
}
