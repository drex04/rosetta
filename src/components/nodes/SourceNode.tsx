import { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { CirclesThreeIcon } from '@phosphor-icons/react'
import type { SourceNodeData as SourceNodeType } from '@/types/index'
import { prefixFromUri, shortenUri, shortenRange } from '@/lib/rdf'
import { useValidationStore } from '@/store/validationStore'

export function SourceNode({ id, data }: NodeProps<SourceNodeType>) {
  const shortUri = shortenUri(data.uri, data.prefix || prefixFromUri(data.uri))

  // Boolean selector: only this node re-renders when its own highlighted state changes
  const isHighlighted = useValidationStore((s) => s.highlightedCanvasNodeId === id)

  const [editingHeader, setEditingHeader] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftUri, setDraftUri] = useState('')
  const [headerError, setHeaderError] = useState('')

  // Programmatic entry from canvas double-click or context menu Rename.
  // Intentional: sync draft only when editTrigger fires, not on every label/uri change —
  // adding data.label/data.uri as deps would overwrite in-progress edits on external renames.
  useEffect(() => {
    if (!data.editTrigger) return
    setDraftLabel(data.label)
    setDraftUri(data.uri)
    setHeaderError('')
    setEditingHeader(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.editTrigger])

  const commitHeader = () => {
    if (!draftLabel.trim()) {
      setHeaderError('Label is required')
      return false
    }
    if (!draftUri.trim().includes(':')) {
      setHeaderError('URI must contain a colon')
      return false
    }
    data.onCommitEdit?.(id, { label: draftLabel.trim(), uri: draftUri.trim() })
    setEditingHeader(false)
    return true
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (typeof data.onContextMenu === 'function') {
      e.preventDefault()
      e.stopPropagation()
      data.onContextMenu(id, e.clientX, e.clientY)
    }
  }

  return (
    <div
      className={[
        'bg-white border-2 border-source rounded-md shadow-md min-w-[200px] text-sm font-sans overflow-visible',
        isHighlighted ? 'ring-2 ring-destructive ring-offset-2' : '',
      ].join(' ')}
      onContextMenu={handleContextMenu}
    >
      <Handle
        id="class-top"
        type="source"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={true}
      />
      <Handle
        id="class-left"
        type="target"
        position={Position.Left}
        style={{ top: 26 }}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={true}
      />

      <div
        className="bg-source px-3 py-2 flex items-center gap-2 rounded-t-[4px]"
        onDoubleClick={() => {
          if (!editingHeader) {
            setDraftLabel(data.label)
            setDraftUri(data.uri)
            setHeaderError('')
            setEditingHeader(true)
          }
        }}
      >
        <CirclesThreeIcon weight="bold" className="text-white shrink-0" size={14} />
        {editingHeader ? (
          <div className="flex flex-col gap-1 py-1 nodrag w-full" onMouseDown={e => e.stopPropagation()}>
            <input
              autoFocus
              className="text-white bg-amber-600/80 border border-white/40 rounded px-1 py-0.5 text-sm font-semibold w-full"
              value={draftLabel}
              onChange={e => setDraftLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitHeader()
                if (e.key === 'Escape') { setEditingHeader(false); setHeaderError('') }
              }}
              onBlur={() => commitHeader()}
              placeholder="Label"
            />
            <input
              className="text-white/80 bg-amber-600/80 border border-white/40 rounded px-1 py-0.5 text-xs font-mono w-full"
              value={draftUri}
              onChange={e => setDraftUri(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitHeader()
                if (e.key === 'Escape') { setEditingHeader(false); setHeaderError('') }
              }}
              onBlur={() => commitHeader()}
              placeholder="URI"
            />
            {headerError && <span className="text-red-300 text-xs">{headerError}</span>}
          </div>
        ) : (
          <div className="flex flex-col min-w-0">
            <span className="text-white font-semibold leading-tight truncate">
              {data.label}
            </span>
            <span className="text-white/70 text-xs leading-tight font-mono truncate">
              {shortUri}
            </span>
          </div>
        )}
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
        isConnectable={true}
      />
      <Handle
        id="class-bottom"
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-source !border-source"
        isConnectable={true}
      />
    </div>
  )
}
