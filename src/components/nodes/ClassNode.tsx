import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { GraphIcon } from '@phosphor-icons/react'
import type { OntologyNode } from '@/types/index'

// Derive a short "prefix:LocalName" form from a full URI and its namespace prefix
function shortenUri(uri: string, ns: string): string {
  if (ns.length > 0 && uri.startsWith(ns)) {
    const local = uri.slice(ns.length)
    if (local.length > 0) {
      // Build alias from the last segment of the namespace
      const withoutTrailing = ns.replace(/[#/]$/, '')
      const lastSlash = withoutTrailing.lastIndexOf('/')
      const lastHash = withoutTrailing.lastIndexOf('#')
      const sep = Math.max(lastSlash, lastHash)
      const alias = sep >= 0 ? withoutTrailing.slice(sep + 1) : withoutTrailing
      return `${alias}:${local}`
    }
  }
  return uri
}

// Best-effort shorten for a range URI that may use standard namespaces
function shortenRange(range: string): string {
  const standards: Array<[string, string]> = [
    ['http://www.w3.org/2001/XMLSchema#', 'xsd'],
    ['http://www.w3.org/2002/07/owl#', 'owl'],
    ['http://www.w3.org/2000/01/rdf-schema#', 'rdfs'],
    ['http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf'],
  ]
  for (const [ns, alias] of standards) {
    if (range.startsWith(ns)) {
      return `${alias}:${range.slice(ns.length)}`
    }
  }
  // Fall back to local name extraction
  const hashIdx = range.lastIndexOf('#')
  if (hashIdx !== -1) return range.slice(hashIdx + 1)
  const slashIdx = range.lastIndexOf('/')
  if (slashIdx !== -1) return range.slice(slashIdx + 1)
  return range
}

export function ClassNode({ data }: NodeProps<OntologyNode>) {
  const shortUri = shortenUri(data.uri, data.prefix)

  return (
    <div className="bg-white border-2 border-master rounded-md shadow-md min-w-[200px] text-sm font-sans overflow-visible">
      {/* Top handle — target for subclass edges */}
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-master !border-master"
        isConnectable={false}
      />

      {/* Blue header */}
      <div className="bg-master px-3 py-2 flex items-center gap-2 rounded-t-[4px]">
        <GraphIcon weight="bold" className="text-white shrink-0" size={14} />
        <div className="flex flex-col min-w-0">
          <span className="text-white font-semibold leading-tight truncate">
            {data.label}
          </span>
          <span className="text-white/70 text-xs leading-tight font-mono truncate">
            {shortUri}
          </span>
        </div>
      </div>

      {/* Property rows */}
      {data.properties.length > 0 && (
        <div className="divide-y divide-border">
          {data.properties.map((prop) => (
            <div
              key={prop.uri}
              className="relative flex items-center justify-between px-3 pr-5 py-1.5 bg-white hover:bg-slate-50"
            >
              <span className="text-foreground font-medium truncate max-w-[55%]">
                {prop.label}
              </span>
              <span className="text-muted-foreground text-xs font-mono truncate ml-2">
                {shortenRange(prop.range)}
              </span>
              {/* Right-side handle per property row */}
              <Handle
                id={`prop_${prop.label}`}
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-master !border-master"
                isConnectable={false}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom handle — source for subclass edges */}
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-master !border-master"
        isConnectable={false}
      />
    </div>
  )
}
