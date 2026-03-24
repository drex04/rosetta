import { ReactFlow, MiniMap, Controls, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasData } from '../../hooks/useCanvasData'

export function OntologyCanvas() {
  const { nodes, edges } = useCanvasData()
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      aria-label="Ontology mapping canvas"
    >
      <MiniMap />
      <Controls aria-label="Canvas controls" />
      <Background />
    </ReactFlow>
  )
}
