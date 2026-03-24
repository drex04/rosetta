import { BaseEdge, getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { SubclassEdgeData } from '@/types/index'
import { MASTER_BLUE } from './shared'
import { EdgeLabel } from './EdgeLabel'

export type SubclassEdgeType = Edge<SubclassEdgeData & Record<string, unknown>, 'subclassEdge'>

export function SubclassEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps<SubclassEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: MASTER_BLUE,
          strokeWidth: 2,
          strokeDasharray: '6 3',
        }}
      />
      <EdgeLabel labelX={labelX} labelY={labelY}>subClassOf</EdgeLabel>
    </>
  )
}
