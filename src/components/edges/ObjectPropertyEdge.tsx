import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { Edge } from '@xyflow/react'
import type { ObjectPropertyEdgeData } from '@/types/index'

export type ObjectPropertyEdgeType = Edge<ObjectPropertyEdgeData & Record<string, unknown>, 'objectPropertyEdge'>

const MASTER_BLUE = '#3b82f6' // matches --color-master hsl(221 83% 53%)

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
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'none',
          }}
          className="text-xs text-master font-mono bg-white/80 px-1 rounded border border-master/30"
        >
          {data?.label ?? ''}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
