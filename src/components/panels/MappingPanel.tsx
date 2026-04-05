import { useMemo, useState } from 'react';
import { useMappingStore } from '@/store/mappingStore';
import { useSourcesStore } from '@/store/sourcesStore';
import { useOntologyStore } from '@/store/ontologyStore';
import { localName } from '@/lib/rdf';
import { getPropRange } from '@/lib/mappingHelpers';
import { generateRml } from '@/lib/rml';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { CaretDownIcon } from '@phosphor-icons/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import type { Mapping, MappingGroup } from '@/types/index';

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

  const sparqlToShow = selectedGroup?.formulaExpression ?? '';
  const isGroupSelected = selectedGroup !== null;

  const rmlSnippet = useMemo(() => {
    if (!selectedMapping || isGroupSelected) return '';
    const source = sources.find((s) => s.id === selectedMapping.sourceId);
    if (!source) return '';
    return generateRml([source], { [source.id]: [selectedMapping] });
  }, [selectedMapping, isGroupSelected, sources]);

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
        {/* ── Group rows ── */}
        {groups.length > 0 && (
          <Accordion
            type="single"
            collapsible
            value={expandedGroupId ?? ''}
            onValueChange={(v) => setExpandedGroupId(v || null)}
          >
            {groups.map((group) => (
              <AccordionItem
                key={group.id}
                value={group.id}
                className="border-b border-border border-x-0 first:border-t-0"
              >
                <AccordionPrimitive.Header className="flex items-center">
                  <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between px-3 py-2 text-sm bg-muted/20 hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    <span className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-master font-mono truncate">
                        {localName(group.targetPropUri)}
                      </span>
                      <span className="text-sm bg-mapping/15 text-mapping px-1.5 py-0.5 rounded font-medium uppercase shrink-0">
                        {group.strategy}({getMappingsInGroup(group.id).length})
                      </span>
                    </span>
                    <CaretDownIcon
                      size={16}
                      className="shrink-0 transition-transform duration-200"
                    />
                  </AccordionPrimitive.Trigger>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      ungroupMappings(group.id);
                      if (selectedGroupId === group.id)
                        setSelectedGroupId(null);
                      if (expandedGroupId === group.id)
                        setExpandedGroupId(null);
                    }}
                    className="text-muted-foreground hover:text-destructive text-sm px-2 mr-1 shrink-0"
                    aria-label="Ungroup"
                  >
                    ungroup
                  </button>
                </AccordionPrimitive.Header>
                <AccordionContent className="px-3 bg-muted/10 border-t border-border pb-0">
                  <div className="flex flex-col gap-2 py-2">
                    {/* Strategy picker */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">
                        Strategy
                      </label>
                      <select
                        value={group.strategy}
                        onChange={(e) =>
                          updateGroup(group.id, {
                            strategy: e.target
                              .value as MappingGroup['strategy'],
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
                        .sort(
                          (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0),
                        )
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
                                  reorderGroupMember(
                                    group.id,
                                    m.id,
                                    arr,
                                    idx,
                                    -1,
                                  )
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
                                  reorderGroupMember(
                                    group.id,
                                    m.id,
                                    arr,
                                    idx,
                                    1,
                                  )
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* ── Ungrouped mapping rows ── */}
        <ul className="divide-y divide-border">
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
                <span className="flex items-baseline gap-1 min-w-0 flex-1 truncate">
                  <span className="text-foreground">
                    {localName(mapping.sourcePropUri)}
                  </span>
                  {sourceRange ? (
                    <span className="font-mono text-muted-foreground text-sm shrink-0">
                      {sourceRange}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground shrink-0">→</span>
                  <span className="text-foreground">
                    {localName(mapping.targetPropUri)}
                  </span>
                  {targetRange ? (
                    <span className="font-mono text-muted-foreground text-sm shrink-0">
                      {targetRange}
                    </span>
                  ) : null}
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
                {isGroupSelected ? 'Group SPARQL' : 'RML'}
              </span>
              {isGroupSelected ? (
                <span className="text-sm px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                  read-only
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
                  <option value="formula">formula</option>
                </select>
              </div>

              {/* Kind-specific inline fields */}
              {['template', 'constant', 'typecast', 'language'].includes(
                selectedMapping.kind,
              ) && (
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
                </div>
              )}
            </>
          )}

          {/* Formula expression or RML snippet */}
          {isGroupSelected ? (
            <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-muted/10 whitespace-pre text-muted-foreground">
              {sparqlToShow || '# No formula expression set'}
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-muted/10 whitespace-pre text-muted-foreground">
              {rmlSnippet || '# No RML generated — add mappings first'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
