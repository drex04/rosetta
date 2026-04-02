import { useRef, useState } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import { useSourcesStore, generateSourceId } from '@/store/sourcesStore';
import { useMappingStore } from '@/store/mappingStore';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface DeleteTarget {
  id: string;
  name: string;
}

export function SourceSelector() {
  const sources = useSourcesStore((s) => s.sources);
  const activeSourceId = useSourcesStore((s) => s.activeSourceId);
  const addSource = useSourcesStore((s) => s.addSource);
  const removeSource = useSourcesStore((s) => s.removeSource);
  const setActiveSourceId = useSourcesStore((s) => s.setActiveSourceId);
  const removeMappingsForSource = useMappingStore(
    (s) => s.removeMappingsForSource,
  );
  const updateSource = useSourcesStore((s) => s.updateSource);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const isEscaping = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setEditValue(currentName);
    isEscaping.current = false;
  }

  function commitEdit(id: string) {
    const trimmed = editValue.trim();
    if (trimmed !== '') {
      updateSource(id, { name: trimmed });
    }
    // If empty/whitespace-only, revert silently (RD-05)
    setEditingId(null);
    setEditValue('');
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    _id: string,
    previousName: string,
  ) {
    if (e.key === 'Enter') {
      e.preventDefault();
      isEscaping.current = false;
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // RD-12: set flag, revert, blur — onBlur will see the flag and skip commit
      isEscaping.current = true;
      setEditValue(previousName);
      inputRef.current?.blur();
    }
  }

  function handleBlur(id: string) {
    // RD-12: guard against Esc+blur double-fire
    if (isEscaping.current) {
      isEscaping.current = false;
      setEditingId(null);
      setEditValue('');
      return;
    }
    commitEdit(id);
  }

  function handleDeleteClick(id: string, name: string, rawData: string) {
    if (rawData !== '') {
      // RD-13: non-empty rawData → show confirmation dialog
      setDeleteTarget({ id, name });
    } else {
      removeMappingsForSource(id);
      removeSource(id);
    }
  }

  function confirmDelete() {
    if (deleteTarget) {
      removeMappingsForSource(deleteTarget.id);
      removeSource(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function handleAddSource() {
    // RD-14: find smallest N ≥ 1 where 'Source N' is not already taken
    const existingNames = new Set(sources.map((s) => s.name));
    let n = 1;
    while (existingNames.has(`Source ${n}`)) {
      n++;
    }
    const name = `Source ${n}`;
    const newSource = {
      id: generateSourceId(),
      name,
      order: sources.length,
      rawData: '',
      dataFormat: 'json' as const,
      schemaNodes: [],
      schemaEdges: [],
      turtleSource: '',
      parseError: null,
    };
    addSource(newSource);
    setActiveSourceId(newSource.id);
  }

  return (
    <>
      <div
        className="h-8 flex items-center px-3 gap-1.5 border-b border-border bg-slate-50 shrink-0 overflow-x-auto"
        role="navigation"
        aria-label="Source selector"
      >
        {sources.length === 0 && (
          <span className="text-xs text-muted-foreground select-none mr-1">
            No sources yet
          </span>
        )}

        {sources.map((source) => {
          const isActive = source.id === activeSourceId;
          const isEditing = editingId === source.id;

          return (
            <div
              key={source.id}
              className={[
                'flex items-center gap-1.5 h-6 pl-2.5 pr-1.5 rounded text-xs font-medium select-none shrink-0 transition-colors border',
                isActive
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              {isEditing ? (
                <input
                  ref={inputRef}
                  className={[
                    'bg-transparent outline-none border-none text-xs font-medium w-20 min-w-0',
                    isActive
                      ? 'text-amber-800 placeholder:text-amber-400'
                      : 'text-foreground',
                  ].join(' ')}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, source.id, source.name)}
                  onBlur={() => handleBlur(source.id)}
                  aria-label={`Rename source ${source.name}`}
                />
              ) : (
                <button
                  className={[
                    'bg-transparent border-none p-0 cursor-pointer text-xs font-medium',
                    isActive ? 'text-amber-800' : 'text-slate-600',
                  ].join(' ')}
                  onClick={() => setActiveSourceId(source.id)}
                  onDoubleClick={() => {
                    setActiveSourceId(source.id);
                    startEditing(source.id, source.name);
                    requestAnimationFrame(() => {
                      inputRef.current?.focus();
                      inputRef.current?.select();
                    });
                  }}
                  aria-label={`Select source ${source.name}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {source.name}
                </button>
              )}

              <button
                className={[
                  'flex items-center justify-center w-4 h-4 rounded text-xs leading-none border-none p-0 cursor-pointer transition-colors',
                  isActive
                    ? 'text-amber-400 hover:text-amber-700 hover:bg-amber-100'
                    : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(source.id, source.name, source.rawData);
                }}
                aria-label={`Delete source ${source.name}`}
                tabIndex={-1}
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          onClick={handleAddSource}
          className="flex items-center gap-1 shrink-0 text-xs px-2 py-0.5 rounded border border-dashed border-slate-300 text-slate-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
          aria-label="Add source"
        >
          <PlusIcon size={12} />
          Add Source
        </button>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete source?"
        description={`Delete source and all its schema nodes? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
