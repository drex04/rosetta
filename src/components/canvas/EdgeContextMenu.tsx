import { CheckIcon } from '@phosphor-icons/react';
import { useOntologyStore } from '@/store/ontologyStore';
import { useMappingStore } from '@/store/mappingStore';

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
  const updateEdge = useOntologyStore((s) => s.updateEdge);
  const removeEdge = useOntologyStore((s) => s.removeEdge);
  const ontologyEdges = useOntologyStore((s) => s.edges);

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
                    updateMapping(menu.edgeId, { kind: kind as MappingKind });
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
                removeMapping(menu.edgeId);
                onClose();
              }}
            >
              Delete mapping
            </button>
          </>
        )}

        {menu.edgeType === 'subclassEdge' && (
          <>
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
                const suggestedLabel = targetLabel
                  ? `has${targetLabel.charAt(0).toUpperCase()}${targetLabel.slice(1)}`
                  : 'hasRelation';
                const input = window.prompt(
                  'Relationship name:',
                  suggestedLabel,
                );
                if (!input || !input.trim()) return;
                updateEdge(menu.edgeId, {
                  type: 'objectPropertyEdge',
                  label: input.trim(),
                });
                onClose();
              }}
            >
              Change to Object Property
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

        {menu.edgeType === 'objectPropertyEdge' && (
          <>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-muted cursor-pointer flex items-center gap-2"
              onClick={() => {
                updateEdge(menu.edgeId, { type: 'subclassEdge', label: '' });
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
