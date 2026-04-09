import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export function MappingEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}: EdgeProps) {
  const {
    groupId,
    groupOrder: groupOrderRaw,
    kind,
  } = (data as
    | {
        groupId?: string;
        groupOrder?: number;
        kind?: string;
      }
    | undefined) ?? {};
  const groupOrder = groupOrderRaw ?? 0;

  const kindLabel = kind ?? null;

  // Apply vertical offset for grouped edges to prevent overlap
  const offsetY = groupId ? (groupOrder - 0.5) * 6 : 0;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY: sourceY + offsetY,
    targetX,
    targetY: targetY + offsetY,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: 'var(--color-mapping-val)',
          strokeOpacity: selected ? 1 : groupId ? 0.8 : 0.6,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: '5 3',
        }}
      />
      {groupId && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-sm bg-mapping/15 text-mapping px-1 rounded border border-mapping/40"
          >
            ⊕
          </div>
        </EdgeLabelRenderer>
      )}
      {!groupId && kindLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="text-sm bg-mapping/15 text-mapping px-1 rounded border border-mapping/40"
          >
            {kindLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
