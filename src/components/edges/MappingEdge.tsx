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

  const KIND_LABEL: Record<string, string> = {
    direct: 'direct',
    template: 'tmpl',
    constant: 'const',
    typecast: 'cast',
    language: 'lang',
    join: 'join',
    sparql: 'sparql',
  };
  const kindLabel = kind ? (KIND_LABEL[kind] ?? kind) : null;

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
          stroke: selected ? '#059669' : groupId ? '#34d399' : '#4ade80',
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
            className="text-xs bg-emerald-100 text-emerald-700 px-1 rounded border border-emerald-300"
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
            className="text-xs bg-emerald-100 text-emerald-700 px-1 rounded border border-emerald-300"
          >
            {kindLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
