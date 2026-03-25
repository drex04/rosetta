import { useCallback, useRef } from 'react'
import { ReactFlow, MiniMap, Controls, Background, applyNodeChanges } from '@xyflow/react'
import type { NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasData } from '../../hooks/useCanvasData'
import { useOntologyStore } from '../../store/ontologyStore'
import { useSourcesStore } from '../../store/sourcesStore'
import { ClassNode } from '../nodes/ClassNode'
import { SourceNode as SourceNodeComponent } from '../nodes/SourceNode'
import { SubclassEdge } from '../edges/SubclassEdge'
import { ObjectPropertyEdge } from '../edges/ObjectPropertyEdge'
import type { OntologyNode, OntologyEdge, SourceNode } from '@/types/index'

const nodeTypes = {
  classNode: ClassNode,
  sourceNode: SourceNodeComponent,
} as const

const edgeTypes = {
  subclassEdge: SubclassEdge,
  objectPropertyEdge: ObjectPropertyEdge,
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
  const canvasDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          activeSource.schemaNodes as SourceNode[],
        ) as SourceNode[]
        updateSource(activeSource.id, { schemaNodes: updatedSourceNodes })
      }
    },
    [setNodes, updateSource, onCanvasChange],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      nodesDraggable={true}
      fitView
      aria-label="Ontology mapping canvas"
    >
      <MiniMap />
      <Controls aria-label="Canvas controls" />
      <Background />
    </ReactFlow>
  )
}
