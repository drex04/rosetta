import { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { GraphIcon } from '@phosphor-icons/react'
import type { OntologyNode } from '@/types/index'
import { prefixFromUri, shortenUri, shortenRange } from '@/lib/rdf'

export function ClassNode({ id, data }: NodeProps<OntologyNode>) {
  const shortUri = shortenUri(data.uri, data.prefix || prefixFromUri(data.uri))

  // ── Header editing state ──────────────────────────────────────────────────
  const [editingHeader, setEditingHeader] = useState(false)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftUri, setDraftUri] = useState('')
  const [headerError, setHeaderError] = useState('')

  // ── Property editing state ────────────────────────────────────────────────
  const [editingPropUri, setEditingPropUri] = useState<string | null>(null)
  const [draftPropLabel, setDraftPropLabel] = useState('')
  const [draftPropType, setDraftPropType] = useState('')
  const [propError, setPropError] = useState('')

  // ── editTrigger effect — programmatic entry from canvas double-click / context menu ──
  // Intentional set-state-in-effect: imperative "start edit" signal from OntologyCanvas.
  // The double-render is benign — this is the correct pattern for an injected trigger.
  useEffect(() => {
    if (!data.editTrigger) return
    setDraftLabel(data.label)       // eslint-disable-line react-hooks/set-state-in-effect
    setDraftUri(data.uri)
    setHeaderError('')
    setEditingHeader(true)
  }, [data.editTrigger])

  // ── commitHeader ──────────────────────────────────────────────────────────
  function commitHeader(): boolean {
    if (!draftLabel.trim()) {
      setHeaderError('Label is required')
      return false
    }
    if (!draftUri.trim().includes(':')) {
      setHeaderError('URI must contain a colon')
      return false
    }
    if (typeof data.onCommitEdit === 'function') {
      data.onCommitEdit(id, { label: draftLabel.trim(), uri: draftUri.trim() })
    }
    setEditingHeader(false)
    return true
  }

  // ── commitProp ────────────────────────────────────────────────────────────
  function commitProp(): boolean {
    if (!draftPropLabel.trim()) {
      setPropError('Label required')
      return false
    }
    if (data.properties.some(p => p.uri !== editingPropUri && p.label === draftPropLabel.trim())) {
      setPropError('Duplicate property name')
      return false
    }
    if (typeof data.onCommitEdit === 'function') {
      data.onCommitEdit(id, {
        propertyUri: editingPropUri!,
        propPatch: { label: draftPropLabel.trim(), dataType: draftPropType },
      })
    }
    setEditingPropUri(null)
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
      className="bg-white border-2 border-master rounded-md shadow-md min-w-[200px] text-sm font-sans overflow-visible"
      onContextMenu={handleContextMenu}
    >
      <Handle
        id="class-top"
        type="source"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-master !border-master"
        isConnectable={true}
      />
      <Handle
        id="class-left"
        type="target"
        position={Position.Left}
        style={{ top: 26 }}
        className="!w-2.5 !h-2.5 !bg-master !border-master"
        isConnectable={true}
      />

      {/* ── Header ── */}
      <div
        className="bg-master px-3 py-2 flex items-center gap-2 rounded-t-[4px]"
        onDoubleClick={() => {
          setDraftLabel(data.label)
          setDraftUri(data.uri)
          setHeaderError('')
          setEditingHeader(true)
        }}
      >
        <GraphIcon weight="bold" className="text-white shrink-0" size={14} />
        {editingHeader ? (
          <div className="flex flex-col gap-1 py-1 nodrag w-full" onMouseDown={e => e.stopPropagation()}>
            <input
              autoFocus
              className="text-white bg-master/80 border border-white/40 rounded px-1 py-0.5 text-sm font-semibold w-full"
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
              className="text-white/80 bg-master/80 border border-white/40 rounded px-1 py-0.5 text-xs font-mono w-full"
              value={draftUri}
              onChange={e => setDraftUri(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitHeader()
                if (e.key === 'Escape') { setEditingHeader(false); setHeaderError('') }
              }}
              onBlur={() => commitHeader()}
              placeholder="URI (e.g. ex:MyClass)"
            />
            {headerError && <span className="text-red-300 text-xs">{headerError}</span>}
          </div>
        ) : (
          <div className="flex flex-col min-w-0">
            <span className="text-white font-semibold text-sm leading-tight truncate">
              {data.label}
            </span>
            <span className="text-white/60 text-xs leading-tight font-mono truncate">
              {shortUri}
            </span>
          </div>
        )}
      </div>

      {/* ── Properties ── */}
      {data.properties.length > 0 && (
        <div className="divide-y divide-border">
          {data.properties.map((prop) => (
            <div
              key={prop.uri}
              className="relative flex items-center justify-between px-3 pr-5 py-1.5 bg-white hover:bg-slate-50"
              onDoubleClick={() => {
                setEditingPropUri(prop.uri)
                setDraftPropLabel(prop.label ?? prop.uri)
                setDraftPropType(prop.dataType ?? 'xsd:string')
                setPropError('')
              }}
            >
              <Handle
                id={`target_prop_${prop.label}`}
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-blue-500 !border-blue-700"
                isConnectable={true}
              />
              {editingPropUri === prop.uri ? (
                <div className="flex gap-1 items-center nodrag w-full" onMouseDown={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    className="flex-1 bg-white border border-master/40 rounded px-1 py-0.5 text-xs min-w-0"
                    value={draftPropLabel}
                    onChange={e => setDraftPropLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitProp()
                      if (e.key === 'Escape') { setEditingPropUri(null); setPropError('') }
                    }}
                    onBlur={() => commitProp()}
                  />
                  <select
                    className="bg-white border border-master/40 rounded px-1 py-0.5 text-xs"
                    value={draftPropType}
                    onChange={e => setDraftPropType(e.target.value)}
                    onBlur={() => commitProp()}
                  >
                    {['xsd:string','xsd:integer','xsd:float','xsd:boolean','xsd:date','xsd:anyURI'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {propError && <span className="text-red-500 text-xs">{propError}</span>}
                </div>
              ) : (
                <>
                  <span className="text-foreground font-medium truncate max-w-[55%]">
                    {prop.label}
                  </span>
                  <span className="text-muted-foreground text-xs font-mono opacity-60 truncate ml-2">
                    {shortenRange(prop.range)}
                  </span>
                </>
              )}
              <Handle
                id={`prop_${prop.label}`}
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-master !border-master"
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
        className="!w-2.5 !h-2.5 !bg-master !border-master"
        isConnectable={true}
      />
      <Handle
        id="class-bottom"
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-master !border-master"
        isConnectable={true}
      />
    </div>
  )
}
