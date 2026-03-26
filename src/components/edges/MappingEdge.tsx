import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export function MappingEdge({ sourceX, sourceY, targetX, targetY, selected }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY })
  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: selected ? '#16a34a' : '#4ade80',
        strokeWidth: selected ? 2.5 : 1.5,
        strokeDasharray: '5 3',
      }}
    />
  )
}
