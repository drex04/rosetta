import { EdgeLabelRenderer } from '@xyflow/react';

interface EdgeLabelProps {
  labelX: number;
  labelY: number;
  children: React.ReactNode;
}

export function EdgeLabel({ labelX, labelY, children }: EdgeLabelProps) {
  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          pointerEvents: 'none',
        }}
        className="text-xs text-master bg-white/80 px-1 rounded border border-master/30"
      >
        {children}
      </div>
    </EdgeLabelRenderer>
  );
}
