import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { CirclesThreeIcon } from '@phosphor-icons/react'
import type { SourceNode as SourceNodeType } from '@/types/index'
import { prefixFromUri, shortenUri, shortenRange } from '@/lib/rdf'
import { useValidationStore } from '@/store/validationStore'

export function SourceNode({ id, data }: NodeProps<SourceNodeType>) {
  const shortUri = shortenUri(data.uri, data.prefix || prefixFromUri(data.uri))

  // Boolean selector: only this node re-renders when its own highlighted state changes
  const isHighlighted = useValidationStore((s) => s.highlightedCanvasNodeId === id)

  return (
    <div className={[
      'bg-white border-2 border-source rounded-md shadow-md min-w-[200px] text-sm font-sans overflow-visible',
      isHighlighted ? 'ring-2 ring-destructive ring-offset-2' : '',
    ].join(' ')}>
      <Handle
        id="class-top"
        type="source"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={false}
      />
      <Handle
        id="class-left"
        type="target"
        position={Position.Left}
        style={{ top: 26 }}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={false}
      />

      <div className="bg-source px-3 py-2 flex items-center gap-2 rounded-t-[4px]">
        <CirclesThreeIcon weight="bold" className="text-white shrink-0" size={14} />
        <div className="flex flex-col min-w-0">
          <span className="text-white font-semibold leading-tight truncate">
            {data.label}
          </span>
          <span className="text-white/70 text-xs leading-tight font-mono truncate">
            {shortUri}
          </span>
        </div>
      </div>

      {data.properties.length > 0 && (
        <div className="divide-y divide-border">
          {data.properties.map((prop) => (
            <div
              key={prop.uri}
              className="relative flex items-center justify-between px-3 pr-5 py-1.5 bg-white hover:bg-amber-50"
            >
              <span className="text-foreground font-medium truncate max-w-[55%]">
                {prop.label}
              </span>
              <span className="text-muted-foreground text-xs font-mono truncate ml-2">
                {shortenRange(prop.range)}
              </span>
              <Handle
                id={`prop_${prop.label}`}
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-source !border-source"
                isConnectable={true}
              />
            </div>
          ))}
        </div>
      )}

      <Handle
        id="class-right"
        type="source"
        position={Position.Right}
        style={{ top: 26 }}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={false}
      />
      <Handle
        id="class-bottom"
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={false}
      />
    </div>
  )
}
