import { useState } from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import { useOntologyStore } from '@/store/ontologyStore';
import { useMappingStore } from '@/store/mappingStore';
import { useUiStore } from '@/store/uiStore';
import type { ObjectPropertyEdgeData, SubclassEdgeData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EdgeCtxMenu {
  edgeId: string;
  edgeType: 'mapping' | 'subclassEdge' | 'objectPropertyEdge';
  edgeData: Record<string, unknown>;
  x: number;
  y: number;
}

interface Props {
  menu: EdgeCtxMenu;
  onClose: () => void;
}

// ─── Mapping kind options ─────────────────────────────────────────────────────

const MAPPING_KINDS = [
  'direct',
  'template',
  'constant',
  'typecast',
  'language',
  'formula',
] as const;

type MappingKind = (typeof MAPPING_KINDS)[number];

// ─── Component ────────────────────────────────────────────────────────────────

export function EdgeContextMenu({ menu, onClose }: Props) {
  const updateMapping = useMappingStore((s) => s.updateMapping);
  const removeMapping = useMappingStore((s) => s.removeMapping);
  const setSelectedMappingId = useMappingStore((s) => s.setSelectedMappingId);
  const setActiveRightTab = useUiStore((s) => s.setActiveRightTab);
  const updateEdge = useOntologyStore((s) => s.updateEdge);
  const removeEdge = useOntologyStore((s) => s.removeEdge);
  const ontologyEdges = useOntologyStore((s) => s.edges);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999 }}
        className="bg-background border border-border rounded-md shadow-lg py-1 min-w-[160px] text-sm"
      >
        {menu.edgeType === 'mapping' && (
          <>
            {MAPPING_KINDS.map((kind) => {
              const current = menu.edgeData.kind as string | undefined;
              const isActive = current === kind;
              return (
                <button
                  key={kind}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2 capitalize"
                  onClick={() => {
                    const mappingId = (menu.edgeData as { mappingId: string })
                      .mappingId;
                    updateMapping(mappingId, { kind: kind as MappingKind });
                    setSelectedMappingId(mappingId);
                    setActiveRightTab('MAP');
                    onClose();
                  }}
                >
                  {isActive ? (
                    <CheckIcon size={14} className="text-primary shrink-0" />
                  ) : (
                    <span className="w-[14px] shrink-0" />
                  )}
                  {kind}
                </button>
              );
            })}
            <div className="border-t border-border my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 cursor-pointer flex items-center gap-2 text-destructive"
              onClick={() => {
                removeMapping(
                  (menu.edgeData as { mappingId: string }).mappingId,
                );
                onClose();
              }}
            >
              Delete mapping
            </button>
          </>
        )}

        {menu.edgeType === 'subclassEdge' && (
          <>
            {pendingLabel === null ? (
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2"
                onClick={() => {
                  const ontoEdge = ontologyEdges.find(
                    (e) => e.id === menu.edgeId,
                  );
                  const targetId = ontoEdge?.target ?? '';
                  const { nodes } = useOntologyStore.getState();
                  const targetNode = nodes.find((n) => n.id === targetId);
                  const targetLabel =
                    (targetNode?.data.label as string | undefined) ?? '';
                  const suggested = targetLabel
                    ? `has${targetLabel.charAt(0).toUpperCase()}${targetLabel.slice(1)}`
                    : 'hasRelation';
                  setPendingLabel(suggested);
                }}
              >
                Change to Object Property
              </button>
            ) : (
              <div className="px-3 py-2 flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Relationship name
                </span>
                <input
                  autoFocus
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={pendingLabel}
                  onChange={(e) => setPendingLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && pendingLabel.trim()) {
                      updateEdge(menu.edgeId, {
                        type: 'objectPropertyEdge',
                        data: {
                          ...menu.edgeData,
                          label: pendingLabel.trim(),
                        } as ObjectPropertyEdgeData & Record<string, unknown>,
                      });
                      onClose();
                    } else if (e.key === 'Escape') {
                      setPendingLabel(null);
                    }
                  }}
                />
                <div className="flex gap-1 justify-end">
                  <button
                    className="px-2 py-0.5 text-xs rounded hover:bg-muted"
                    onClick={() => setPendingLabel(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-2 py-0.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    disabled={!pendingLabel.trim()}
                    onClick={() => {
                      if (!pendingLabel.trim()) return;
                      updateEdge(menu.edgeId, {
                        type: 'objectPropertyEdge',
                        data: {
                          ...menu.edgeData,
                          label: pendingLabel.trim(),
                        } as ObjectPropertyEdgeData & Record<string, unknown>,
                      });
                      onClose();
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
            <div className="border-t border-border my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 cursor-pointer flex items-center gap-2 text-destructive"
              onClick={() => {
                removeEdge(menu.edgeId);
                onClose();
              }}
            >
              Delete edge
            </button>
          </>
        )}

        {menu.edgeType === 'objectPropertyEdge' && (
          <>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2"
              onClick={() => {
                updateEdge(menu.edgeId, {
                  type: 'subclassEdge',
                  data: {
                    ...menu.edgeData,
                    label: '',
                  } as unknown as SubclassEdgeData & Record<string, unknown>,
                });
                onClose();
              }}
            >
              Change to Subclass
            </button>
            <div className="border-t border-border my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 cursor-pointer flex items-center gap-2 text-destructive"
              onClick={() => {
                removeEdge(menu.edgeId);
                onClose();
              }}
            >
              Delete edge
            </button>
          </>
        )}
      </div>
    </>
  );
}
