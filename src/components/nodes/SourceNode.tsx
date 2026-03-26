import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { CirclesThreeIcon } from '@phosphor-icons/react'
import type { SourceNode as SourceNodeType } from '@/types/index'
import { localName, prefixFromUri } from '@/lib/rdf'

const STANDARD_NAMESPACES: ReadonlyArray<readonly [string, string]> = [
  ['http://www.w3.org/2001/XMLSchema#', 'xsd'],
  ['http://www.w3.org/2002/07/owl#', 'owl'],
  ['http://www.w3.org/2000/01/rdf-schema#', 'rdfs'],
  ['http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf'],
]

function shortenUri(uri: string, prefix: string): string {
  if (prefix.length > 0 && uri.startsWith(prefix)) {
    const local = uri.slice(prefix.length)
    if (local.length > 0) {
      const withoutTrailing = prefix.replace(/[#/]$/, '')
      const alias = localName(withoutTrailing)
      return `${alias}:${local}`
    }
  }
  return uri
}

function shortenRange(range: string): string {
  for (const [ns, alias] of STANDARD_NAMESPACES) {
    if (range.startsWith(ns)) {
      return `${alias}:${range.slice(ns.length)}`
    }
  }
  return localName(range)
}

export function SourceNode({ data }: NodeProps<SourceNodeType>) {
  const shortUri = shortenUri(data.uri, data.prefix || prefixFromUri(data.uri))

  return (
    <div className="bg-white border-2 border-source rounded-md shadow-md min-w-[200px] text-sm font-sans overflow-visible">
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
        style={{ top: 14 }}
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
        style={{ top: 14 }}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={false}
      />
      <Handle
        id="class-bottom"
        type="target"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={false}
      />
    </div>
  )
}
