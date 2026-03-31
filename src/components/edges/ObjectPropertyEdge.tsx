import { BaseEdge, getSmoothStepPath, type EdgeProps, type Edge } from '@xyflow/react'
import type { ObjectPropertyEdgeData } from '@/types/index'
import { MASTER_BLUE } from './shared'
import { EdgeLabel } from './EdgeLabel'

type ObjectPropertyEdgeType = Edge<ObjectPropertyEdgeData & Record<string, unknown>, 'objectPropertyEdge'>

export function ObjectPropertyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<ObjectPropertyEdgeType>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
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
        }}
      />
      <EdgeLabel labelX={labelX} labelY={labelY}>{data?.label ?? ''}</EdgeLabel>
    </>
  )
}
