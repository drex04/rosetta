import { useCallback, useRef } from 'react'
import { ReactFlow, MiniMap, Controls, Background, applyNodeChanges } from '@xyflow/react'
import type { NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasData } from '../../hooks/useCanvasData'
import { useOntologyStore } from '../../store/ontologyStore'
import { ClassNode } from '../nodes/ClassNode'
import { SubclassEdge } from '../edges/SubclassEdge'
import { ObjectPropertyEdge } from '../edges/ObjectPropertyEdge'
import type { OntologyNode, OntologyEdge } from '@/types/index'

const nodeTypes = {
  classNode: ClassNode,
} as const

const edgeTypes = {
  subclassEdge: SubclassEdge,
  objectPropertyEdge: ObjectPropertyEdge,
} as const

interface OntologyCanvasProps {
  onCanvasChange?: (nodes: OntologyNode[], edges: OntologyEdge[]) => void
}

export function OntologyCanvas({ onCanvasChange }: OntologyCanvasProps) {
  const { nodes, edges } = useCanvasData()
  const setNodes = useOntologyStore((s) => s.setNodes)
  const canvasDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onNodesChange = useCallback(
    (changes: NodeChange<OntologyNode>[]) => {
      // Apply changes only to master ontology nodes; source nodes are managed
      // by the sources store (handled in a later phase).
      const masterNodes = useOntologyStore.getState().nodes
      const updated = applyNodeChanges(changes, masterNodes) as OntologyNode[]
      setNodes(updated)

      // Notify parent after a short debounce to batch rapid drag frames
      if (onCanvasChange !== undefined) {
        if (canvasDebounceTimer.current !== null) {
          clearTimeout(canvasDebounceTimer.current)
        }
        canvasDebounceTimer.current = setTimeout(() => {
          const currentEdges = useOntologyStore.getState().edges
          onCanvasChange(updated, currentEdges)
        }, 100)
      }
    },
    [setNodes, onCanvasChange],
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
