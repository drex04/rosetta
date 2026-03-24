import { useCallback } from 'react'
import { ReactFlow, MiniMap, Controls, Background, applyNodeChanges } from '@xyflow/react'
import type { NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasData } from '../../hooks/useCanvasData'
import { useOntologyStore } from '../../store/ontologyStore'
import { ClassNode } from '../nodes/ClassNode'
import { SubclassEdge } from '../edges/SubclassEdge'
import { ObjectPropertyEdge } from '../edges/ObjectPropertyEdge'
import type { OntologyNode } from '@/types/index'

const nodeTypes = {
  classNode: ClassNode,
} as const

const edgeTypes = {
  subclassEdge: SubclassEdge,
  objectPropertyEdge: ObjectPropertyEdge,
} as const

export function OntologyCanvas() {
  const { nodes, edges } = useCanvasData()
  const setNodes = useOntologyStore((s) => s.setNodes)

  const onNodesChange = useCallback(
    (changes: NodeChange<OntologyNode>[]) => {
      // Apply changes only to master ontology nodes; source nodes are managed
      // by the sources store (handled in a later phase).
      const masterNodes = useOntologyStore.getState().nodes
      const updated = applyNodeChanges(changes, masterNodes) as OntologyNode[]
      setNodes(updated)
    },
    [setNodes],
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
