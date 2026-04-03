import { useEffect, useRef, useState } from 'react';
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { useMappingStore } from '@/store/mappingStore';
import { useSourcesStore } from '@/store/sourcesStore';
import { useOntologyStore } from '@/store/ontologyStore';
import { localName } from '@/lib/rdf';
import { getPropRange } from '@/lib/mappingHelpers';
import { generateConstruct } from '@/lib/sparql';
import { lightTheme } from '@/lib/codemirror-theme';
import type { Mapping, MappingGroup } from '@/types/index';

// ─── Lint badge helper (RD-05) ────────────────────────────────────────────────

function isValidConstruct(query: string): boolean {
  const lower = query.toLowerCase();
  return lower.includes('construct') && lower.includes('where');
}

// ─── SPARQL editor sub-component ──────────────────────────────────────────────

interface SparqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function SparqlEditor({
  value,
  onChange,
  readOnly = false,
}: SparqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    if (containerRef.current === null) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (isExternalUpdate.current) return;
      onChange(update.state.doc.toString());
    });

    const extensions = [
      basicSetup,
      lineNumbers(),
      highlightActiveLine(),
      lightTheme,
      updateListener,
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]); // Re-mount when readOnly changes

  // Sync external value changes to editor (when not focused)
  useEffect(() => {
    const view = viewRef.current;
    if (view === null) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc === value) return;
    if (view.hasFocus) return;

    isExternalUpdate.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
    });
    isExternalUpdate.current = false;
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden"
      aria-label="SPARQL CONSTRUCT editor"
    />
  );
}

// ─── MappingPanel ─────────────────────────────────────────────────────────────

export function MappingPanel() {
  const activeSourceId = useSourcesStore((s) => s.activeSourceId);
  const sources = useSourcesStore((s) => s.sources);
  const ontologyNodes = useOntologyStore((s) => s.nodes);
  const activeSource = sources.find((src) => src.id === activeSourceId) ?? null;
  const {
    getMappingsForSource,
    removeMapping,
    updateMapping,
    setSelectedMappingId,
    selectedMappingId,
    getGroupsForSource,
    getMappingsInGroup,
    updateGroup,
    ungroupMappings,
  } = useMappingStore();

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const mappings: Mapping[] =
    activeSourceId !== null ? getMappingsForSource(activeSourceId) : [];
  const groups =
    activeSourceId !== null ? getGroupsForSource(activeSourceId) : [];

  const ungroupedMappings = mappings.filter((m) => !m.groupId);

  const selectedMapping =
    mappings.find((m) => m.id === selectedMappingId) ?? null;
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  const sparqlToShow =
    selectedGroup?.sparqlConstruct ?? selectedMapping?.sparqlConstruct ?? '';
  const isGroupSelected = selectedGroup !== null;

  function handleSelectMapping(id: string) {
    setSelectedMappingId(selectedMappingId === id ? null : id);
    setSelectedGroupId(null);
  }

  function handleSelectGroup(id: string) {
    setSelectedGroupId(id);
    setSelectedMappingId(null);
  }

  function handleDeleteMapping(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    removeMapping(id);
  }

  function handleEditorChange(newValue: string) {
    if (selectedMappingId === null) return;
    updateMapping(selectedMappingId, { sparqlConstruct: newValue });
  }

  // Auto-regenerate SPARQL when kind-specific fields change (non-sparql kinds only)
  // Intentional: selectedMapping is omitted as a whole — it is a derived .find() value that
  // gets a new reference on every render. Listing only the specific fields that drive SPARQL
  // generation prevents spurious re-runs while still catching every meaningful change.
  // updateMapping is a stable Zustand action and is safe to include.
  useEffect(() => {
    if (!selectedMapping || selectedMapping.kind === 'sparql') return;
    const timer = setTimeout(() => {
      const newSparql = generateConstruct(selectedMapping);
      if (newSparql !== selectedMapping.sparqlConstruct) {
        updateMapping(selectedMapping.id, { sparqlConstruct: newSparql });
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    updateMapping,
    selectedMapping?.kind,
    selectedMapping?.templatePattern,
    selectedMapping?.constantValue,
    selectedMapping?.constantType,
    selectedMapping?.targetDatatype,
    selectedMapping?.languageTag,
    selectedMapping?.parentSourceId,
    selectedMapping?.parentRef,
    selectedMapping?.childRef,
    selectedMapping?.sourcePropUri,
    selectedMapping?.targetPropUri,
  ]);

  function reorderGroupMember(
    groupId: string,
    _mappingId: string,
    members: Mapping[],
    currentIdx: number,
    direction: -1 | 1,
  ) {
    const swapIdx = currentIdx + direction;
    if (swapIdx < 0 || swapIdx >= members.length) return;

    const current = members[currentIdx];
    const swap = members[swapIdx];
    if (current === undefined || swap === undefined) return;

    const currentOrder = current.groupOrder ?? currentIdx;
    const swapOrder = swap.groupOrder ?? swapIdx;

    updateMapping(current.id, { groupOrder: swapOrder });
    updateMapping(swap.id, { groupOrder: currentOrder });

    // Trigger SPARQL regen for the group after reorder
    updateGroup(groupId, {});
  }

  // ── No source selected ──
  if (activeSourceId === null) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-center text-muted-foreground px-4">
          Select a source tab above to map its fields to ontology classes.
        </p>
      </div>
    );
  }

  // ── No mappings yet ──
  if (mappings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground text-sm text-center">
          Drag from a source property to a master property to create a mapping
        </p>
      </div>
    );
  }

  const showEditor = selectedMapping !== null || selectedGroup !== null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Mapping list ── */}
      <div className="shrink-0 overflow-y-auto border-b border-border max-h-[40%]">
        <ul className="divide-y divide-border">
          {/* ── Group rows ── */}
          {groups.map((group) => (
            <li key={group.id} className="border-b border-border">
              {/* Group header */}
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setExpandedGroupId(
                    expandedGroupId === group.id ? null : group.id,
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    setExpandedGroupId(
                      expandedGroupId === group.id ? null : group.id,
                    );
                }}
                className="flex items-center justify-between px-3 py-2 cursor-pointer text-sm hover:bg-muted/50 bg-muted/20"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">
                    {expandedGroupId === group.id ? '▾' : '▸'}
                  </span>
                  <span className="text-master font-mono">
                    {localName(group.targetPropUri)}
                  </span>
                  <span className="text-sm bg-mapping/15 text-mapping px-1.5 py-0.5 rounded font-medium uppercase">
                    {group.strategy}({getMappingsInGroup(group.id).length})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    ungroupMappings(group.id);
                    if (selectedGroupId === group.id) setSelectedGroupId(null);
                    if (expandedGroupId === group.id) setExpandedGroupId(null);
                  }}
                  className="text-muted-foreground hover:text-destructive text-sm"
                  aria-label="Ungroup"
                >
                  ungroup
                </button>
              </div>

              {/* Expanded group details */}
              {expandedGroupId === group.id && (
                <div className="px-3 py-2 bg-muted/10 border-t border-border flex flex-col gap-2">
                  {/* Strategy picker */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">
                      Strategy
                    </label>
                    <select
                      value={group.strategy}
                      onChange={(e) =>
                        updateGroup(group.id, {
                          strategy: e.target.value as MappingGroup['strategy'],
                        })
                      }
                      className="text-sm border border-border rounded px-1.5 py-0.5 bg-background"
                    >
                      <option value="concat">concat</option>
                      <option value="coalesce">coalesce</option>
                      <option value="template">template</option>
                    </select>
                  </div>

                  {/* Separator input (concat) */}
                  {group.strategy === 'concat' && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">
                        Separator
                      </label>
                      <input
                        type="text"
                        value={group.separator}
                        onChange={(e) =>
                          updateGroup(group.id, { separator: e.target.value })
                        }
                        className="text-sm border border-border rounded px-1.5 py-0.5 bg-background w-16 font-mono"
                      />
                    </div>
                  )}

                  {/* Template input (template strategy) */}
                  {group.strategy === 'template' && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">
                        Template
                      </label>
                      <input
                        type="text"
                        value={
                          (
                            group as Extract<
                              MappingGroup,
                              { strategy: 'template' }
                            >
                          ).templatePattern
                        }
                        onChange={(e) =>
                          updateGroup(group.id, {
                            templatePattern: e.target.value,
                          } as Parameters<typeof updateGroup>[1])
                        }
                        className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 font-mono"
                        placeholder="{0}, {1}"
                      />
                    </div>
                  )}

                  {/* Member list with ordering */}
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground uppercase tracking-wide">
                      Members
                    </span>
                    {getMappingsInGroup(group.id)
                      .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0))
                      .map((m, idx, arr) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1 text-sm"
                        >
                          <span className="text-source-text font-mono flex-1">
                            {localName(m.sourcePropUri)}
                          </span>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() =>
                                reorderGroupMember(group.id, m.id, arr, idx, -1)
                              }
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-0.5"
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={idx === arr.length - 1}
                              onClick={() =>
                                reorderGroupMember(group.id, m.id, arr, idx, 1)
                              }
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30 px-0.5"
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* View SPARQL button */}
                  <button
                    type="button"
                    onClick={() => handleSelectGroup(group.id)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    View SPARQL ›
                  </button>
                </div>
              )}
            </li>
          ))}

          {/* ── Ungrouped mapping rows ── */}
          {ungroupedMappings.map((mapping) => {
            const isSelected = mapping.id === selectedMappingId;
            const sourceRange = getPropRange(
              mapping.sourcePropUri,
              activeSource?.schemaNodes ?? [],
            );
            const targetRange = getPropRange(
              mapping.targetPropUri,
              ontologyNodes,
            );
            return (
              <li
                key={mapping.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectMapping(mapping.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    handleSelectMapping(mapping.id);
                }}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm hover:bg-muted/50 transition-colors ${
                  isSelected ? 'bg-muted font-medium' : ''
                }`}
              >
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-source-text font-mono">
                    {localName(mapping.sourcePropUri)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {sourceRange} → {localName(mapping.targetPropUri)}{' '}
                    {targetRange}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteMapping(e, mapping.id)}
                  className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors leading-none"
                  aria-label={`Remove mapping ${localName(mapping.sourcePropUri)} → ${localName(mapping.targetPropUri)}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── SPARQL CONSTRUCT editor ── */}
      {showEditor && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {isGroupSelected ? 'Group SPARQL' : 'SPARQL Construct'}
              </span>
              {isGroupSelected ? (
                <span className="text-sm px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                  read-only
                </span>
              ) : selectedMapping !== null ? (
                <span
                  className={`text-sm px-1.5 py-0.5 rounded font-medium ${
                    isValidConstruct(selectedMapping.sparqlConstruct)
                      ? 'bg-mapping/15 text-mapping-text'
                      : 'bg-source/15 text-source-text'
                  }`}
                  title={
                    isValidConstruct(selectedMapping.sparqlConstruct)
                      ? 'Valid: CONSTRUCT and WHERE present'
                      : 'Missing CONSTRUCT or WHERE keyword'
                  }
                >
                  {isValidConstruct(selectedMapping.sparqlConstruct)
                    ? 'valid'
                    : 'incomplete'}
                </span>
              ) : null}
            </div>
          </div>

          {/* Kind picker — only for individual mappings */}
          {!isGroupSelected && selectedMapping !== null && (
            <>
              <div
                data-testid="kind-picker"
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/10"
              >
                <label
                  className="text-sm text-muted-foreground shrink-0"
                  htmlFor="kind-picker"
                >
                  Kind
                </label>
                <select
                  id="kind-picker"
                  aria-label="Mapping kind"
                  value={selectedMapping.kind}
                  onChange={(e) => {
                    const newKind = e.target.value as Mapping['kind'];
                    updateMapping(selectedMapping.id, { kind: newKind });
                  }}
                  className="text-sm border border-border rounded px-1.5 py-0.5 bg-background"
                >
                  <option value="direct">direct</option>
                  <option value="template">template</option>
                  <option value="constant">constant</option>
                  <option value="typecast">typecast</option>
                  <option value="language">language</option>
                  <option value="join">join</option>
                  <option value="sparql">sparql (custom)</option>
                </select>
              </div>

              {/* Kind-specific inline fields */}
              {[
                'template',
                'constant',
                'typecast',
                'language',
                'join',
              ].includes(selectedMapping.kind) && (
                <div className="shrink-0 flex flex-col gap-1.5 px-3 py-2 border-b border-border bg-muted/5">
                  {selectedMapping.kind === 'template' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-4 text-sm text-muted-foreground font-mono">
                        <span>
                          {'{'}prop1{'}'} ={' '}
                          {localName(selectedMapping.sourcePropUri)}
                        </span>
                        <span>
                          {'{'}prop2{'}'} ={' '}
                          {localName(selectedMapping.targetPropUri)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground w-20 shrink-0">
                          Pattern
                        </label>
                        <input
                          className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                          value={selectedMapping.templatePattern ?? ''}
                          onChange={(e) =>
                            updateMapping(selectedMapping.id, {
                              templatePattern: e.target.value,
                            })
                          }
                          placeholder='"{prop1} {prop2}"'
                        />
                      </div>
                    </div>
                  )}
                  {selectedMapping.kind === 'constant' && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground w-20 shrink-0">
                          Value
                        </label>
                        <input
                          className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                          value={selectedMapping.constantValue ?? ''}
                          onChange={(e) =>
                            updateMapping(selectedMapping.id, {
                              constantValue: e.target.value,
                            })
                          }
                          placeholder="literal value"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground w-20 shrink-0">
                          Datatype
                        </label>
                        <input
                          className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                          value={selectedMapping.constantType ?? ''}
                          onChange={(e) =>
                            updateMapping(selectedMapping.id, {
                              constantType: e.target.value,
                            })
                          }
                          placeholder="xsd:string"
                        />
                      </div>
                    </>
                  )}
                  {selectedMapping.kind === 'typecast' && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground w-20 shrink-0">
                        Datatype
                      </label>
                      <input
                        className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                        value={selectedMapping.targetDatatype ?? ''}
                        onChange={(e) =>
                          updateMapping(selectedMapping.id, {
                            targetDatatype: e.target.value,
                          })
                        }
                        placeholder="xsd:integer"
                      />
                    </div>
                  )}
                  {selectedMapping.kind === 'language' && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground w-20 shrink-0">
                        Language Tag
                      </label>
                      <input
                        className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                        value={selectedMapping.languageTag ?? ''}
                        onChange={(e) =>
                          updateMapping(selectedMapping.id, {
                            languageTag: e.target.value,
                          })
                        }
                        placeholder="en"
                      />
                    </div>
                  )}
                  {selectedMapping.kind === 'join' && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground w-20 shrink-0">
                          Parent Source
                        </label>
                        <input
                          className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                          value={selectedMapping.parentSourceId ?? ''}
                          onChange={(e) =>
                            updateMapping(selectedMapping.id, {
                              parentSourceId: e.target.value,
                            })
                          }
                          placeholder="source id"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground w-20 shrink-0">
                          Parent Ref URI
                        </label>
                        <input
                          className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                          value={selectedMapping.parentRef ?? ''}
                          onChange={(e) =>
                            updateMapping(selectedMapping.id, {
                              parentRef: e.target.value,
                            })
                          }
                          placeholder="property URI"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground w-20 shrink-0">
                          Child Ref URI
                        </label>
                        <input
                          className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                          value={selectedMapping.childRef ?? ''}
                          onChange={(e) =>
                            updateMapping(selectedMapping.id, {
                              childRef: e.target.value,
                            })
                          }
                          placeholder="property URI"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* CodeMirror editor */}
          <SparqlEditor
            value={sparqlToShow}
            onChange={handleEditorChange}
            readOnly={isGroupSelected}
          />
        </div>
      )}
    </div>
  );
}
