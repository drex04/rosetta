import { useMemo, useState } from 'react';
import { useMappingStore } from '@/store/mappingStore';
import { useSourcesStore } from '@/store/sourcesStore';
import { useOntologyStore } from '@/store/ontologyStore';
import { localName } from '@/lib/rdf';
import { getPropRange } from '@/lib/mappingHelpers';
import { generateRml } from '@/lib/rml';
import { parseAndValidate } from '@/lib/formulaParser';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { CaretDownIcon } from '@phosphor-icons/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import type { Mapping, MappingGroup } from '@/types/index';

// ─── Allowed functions metadata ───────────────────────────────────────────────

const FN_META: Record<string, { minArgs: number; maxArgs: number }> = {
  CONCAT: { minArgs: 2, maxArgs: 8 },
  UPPER: { minArgs: 1, maxArgs: 1 },
  LOWER: { minArgs: 1, maxArgs: 1 },
  TRIM: { minArgs: 1, maxArgs: 1 },
  REPLACE: { minArgs: 3, maxArgs: 3 },
};

const FN_NAMES = Object.keys(FN_META) as Array<keyof typeof FN_META>;

// ─── FormBuilder ──────────────────────────────────────────────────────────────

interface FormBuilderProps {
  mapping: Mapping;
  updateMapping: (id: string, patch: Partial<Omit<Mapping, 'id'>>) => void;
}

function FormBuilder({ mapping, updateMapping }: FormBuilderProps) {
  const expr = mapping.formulaExpression ?? '';

  // Derive initial state from AST if parseable
  function deriveFromExpr(expression: string): {
    fn: string;
    args: string[];
  } | null {
    if (!expression) return null;
    const result = parseAndValidate(expression);
    if (result.errors.length > 0) return null;
    if (result.ast.type !== 'call') return null;
    const fnName = result.ast.fn.toUpperCase();
    if (!FN_META[fnName]) return null;
    // Only simple (non-nested) args
    const allSimple = result.ast.args.every(
      (a) => a.type === 'field' || a.type === 'literal',
    );
    if (!allSimple) return null;
    const args = result.ast.args.map((a) => {
      if (a.type === 'field') return `source.${a.path}`;
      if (a.type === 'literal') return `"${a.value}"`;
      return '';
    });
    return { fn: fnName, args };
  }

  const derived = deriveFromExpr(expr);
  const isComplex = expr !== '' && derived === null;

  // Controlled state derived from current expression on each render
  // We use a key-based approach via parent, so we just read from expr
  const [localFn, setLocalFn] = useState<string>(derived?.fn ?? 'CONCAT');
  const [localArgs, setLocalArgs] = useState<string[]>(
    derived?.args ?? ['', ''],
  );

  // If the expression changed externally (e.g. FormulaBar edit) and is parseable,
  // sync form state. We detect this by comparing reconstructed expr.
  const reconstructed = `${localFn}(${localArgs.join(', ')})`;
  if (expr !== '' && expr !== reconstructed && derived !== null) {
    if (derived.fn !== localFn) setLocalFn(derived.fn);
    if (JSON.stringify(derived.args) !== JSON.stringify(localArgs))
      setLocalArgs(derived.args);
  }

  if (isComplex) {
    return (
      <div className="text-sm text-muted-foreground italic px-1 py-2">
        Expression too complex for form view.
      </div>
    );
  }

  const meta = FN_META[localFn];
  const isVariadic = localFn === 'CONCAT';
  const fixedArity =
    meta && meta.minArgs === meta.maxArgs ? meta.minArgs : null;

  function emitUpdate(fn: string, args: string[]) {
    // Only emit if all args are non-empty to avoid invalid intermediate expressions
    if (args.every((a) => a.trim() !== '')) {
      const newExpr = `${fn}(${args.join(', ')})`;
      updateMapping(mapping.id, { formulaExpression: newExpr });
    }
  }

  function handleFnChange(newFn: string) {
    setLocalFn(newFn);
    const newMeta = FN_META[newFn];
    let newArgs = [...localArgs];
    if (newMeta) {
      if (newMeta.minArgs === newMeta.maxArgs) {
        // fixed arity — resize
        while (newArgs.length < newMeta.minArgs) newArgs.push('');
        newArgs = newArgs.slice(0, newMeta.minArgs);
      } else {
        // variadic (CONCAT): ensure at least minArgs
        while (newArgs.length < newMeta.minArgs) newArgs.push('');
      }
    }
    setLocalArgs(newArgs);
    emitUpdate(newFn, newArgs);
  }

  function handleArgChange(idx: number, value: string) {
    const newArgs = localArgs.map((a, i) => (i === idx ? value : a));
    setLocalArgs(newArgs);
    emitUpdate(localFn, newArgs);
  }

  function handleAddArg() {
    const newArgs = [...localArgs, ''];
    setLocalArgs(newArgs);
    emitUpdate(localFn, newArgs);
  }

  function handleRemoveArg(idx: number) {
    const newArgs = localArgs.filter((_, i) => i !== idx);
    setLocalArgs(newArgs);
    emitUpdate(localFn, newArgs);
  }

  const canAdd = isVariadic && meta && localArgs.length < meta.maxArgs;
  const canRemove = isVariadic && meta && localArgs.length > meta.minArgs;

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Function picker */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground w-20 shrink-0">
          Function
        </label>
        <select
          value={localFn}
          onChange={(e) => handleFnChange(e.target.value)}
          className="text-sm border border-border rounded px-2 py-1 bg-background"
        >
          {FN_NAMES.map((fn) => (
            <option key={fn} value={fn}>
              {fn}
            </option>
          ))}
        </select>
      </div>

      {/* Arg fields */}
      {localArgs.map((arg, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground w-20 shrink-0">
            Arg {idx + 1}
          </label>
          <input
            type="text"
            value={arg}
            onChange={(e) => handleArgChange(idx, e.target.value)}
            className="text-sm border border-border rounded px-2 py-1 bg-background flex-1 min-w-0"
            placeholder={
              idx === 0 ? 'source.field' : '"literal" or source.field'
            }
          />
          {canRemove && idx === localArgs.length - 1 && (
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => handleRemoveArg(idx)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              ×
            </Button>
          )}
        </div>
      ))}

      {/* Add arg button */}
      {canAdd && (
        <div className="flex">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={handleAddArg}
          >
            + Add arg
          </Button>
        </div>
      )}

      {/* Show fixed arity note */}
      {fixedArity !== null && !isVariadic && (
        <p className="text-xs text-muted-foreground">
          {localFn} requires exactly {fixedArity} argument
          {fixedArity !== 1 ? 's' : ''}.
        </p>
      )}
    </div>
  );
}

// ─── FormulaBar ───────────────────────────────────────────────────────────────

interface FormulaBarProps {
  value: string;
  onChange: (value: string) => void;
}

function FormulaBar({ value, onChange }: FormulaBarProps) {
  const result = value !== '' ? parseAndValidate(value) : null;
  const isValid = result !== null && result.errors.length === 0;
  const isInvalid = result !== null && result.errors.length > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-border rounded px-2 py-1 bg-background flex-1 min-w-0 font-mono"
        placeholder='e.g. CONCAT(source.firstName, " ", source.lastName)'
        aria-label="Formula expression"
      />
      {isValid && (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium text-green-700 bg-green-100 shrink-0">
          valid
        </span>
      )}
      {isInvalid && (
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium text-red-700 bg-red-100 shrink-0 max-w-[200px] truncate"
          title={result.errors[0]}
        >
          {result.errors[0]}
        </span>
      )}
    </div>
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

  const isGroupSelected = selectedGroup !== null;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const rmlSnippet = useMemo(() => {
    if (!selectedMapping || isGroupSelected) return '';
    const source = sources.find((s) => s.id === selectedMapping.sourceId);
    if (!source) return '';
    return generateRml([source], { [source.id]: [selectedMapping] });
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
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

    // Trigger regen for the group after reorder
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

                    {/* View button */}
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

      {/* ── Detail editor ── */}
      {showEditor && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {isGroupSelected ? 'Group' : 'RML'}
              </span>
              {isGroupSelected ? (
                <span className="text-sm px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                  read-only
                </span>
              ) : null}
            </div>
          </div>

          {/* ── Group detail ── */}
          {isGroupSelected && selectedGroup !== null && (
            <GroupDetail
              group={selectedGroup}
              rmlSnippet={''}
              updateGroup={updateGroup}
            />
          )}

          {/* ── Individual mapping detail ── */}
          {!isGroupSelected && selectedMapping !== null && (
            <MappingDetail
              key={selectedMapping.id}
              mapping={selectedMapping}
              updateMapping={updateMapping}
              rmlSnippet={rmlSnippet}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── GroupDetail ──────────────────────────────────────────────────────────────

interface GroupDetailProps {
  group: MappingGroup;
  rmlSnippet: string;
  updateGroup: (
    groupId: string,
    patch: Partial<{
      strategy: MappingGroup['strategy'];
      separator: string;
      templatePattern: string;
      formulaExpression: string;
      targetClassUri: string;
      targetPropUri: string;
    }>,
  ) => void;
}

function GroupDetail({ group, updateGroup }: GroupDetailProps) {
  const hasFormula = group.formulaExpression !== undefined;
  type GroupTier = 'formula' | 'rml';
  const [tier, setTier] = useState<GroupTier>('formula');

  if (!hasFormula) {
    // Plain read-only fallback (no formula on group)
    return (
      <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-muted/10 whitespace-pre text-muted-foreground">
        {group.formulaExpression ?? '# No formula expression set'}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 2-tier toggle */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/10">
        {(['formula', 'rml'] as GroupTier[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`text-sm px-2 py-0.5 rounded transition-colors ${
              tier === t
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'formula' ? 'Formula' : 'RML'}
          </button>
        ))}
      </div>

      {tier === 'formula' && (
        <FormulaBar
          value={group.formulaExpression ?? ''}
          onChange={(v) => updateGroup(group.id, { formulaExpression: v })}
        />
      )}

      {tier === 'rml' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-muted/10 whitespace-pre text-muted-foreground">
          # No RML generated — add mappings first
        </div>
      )}
    </div>
  );
}

// ─── MappingDetail ────────────────────────────────────────────────────────────

interface MappingDetailProps {
  mapping: Mapping;
  updateMapping: (id: string, patch: Partial<Omit<Mapping, 'id'>>) => void;
  rmlSnippet: string;
}

function MappingDetail({
  mapping,
  updateMapping,
  rmlSnippet,
}: MappingDetailProps) {
  type FormulaTier = 'form' | 'formula' | 'rml';
  const [formulaTier, setFormulaTier] = useState<FormulaTier>('form');

  return (
    <>
      {/* Kind picker */}
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
          value={mapping.kind}
          onChange={(e) => {
            const newKind = e.target.value as Mapping['kind'];
            updateMapping(mapping.id, { kind: newKind });
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
        mapping.kind,
      ) && (
        <div className="shrink-0 flex flex-col gap-1.5 px-3 py-2 border-b border-border bg-muted/5">
          {mapping.kind === 'template' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-4 text-sm text-muted-foreground font-mono">
                <span>
                  {'{'}prop1{'}'} = {localName(mapping.sourcePropUri)}
                </span>
                <span>
                  {'{'}prop2{'}'} = {localName(mapping.targetPropUri)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground w-20 shrink-0">
                  Pattern
                </label>
                <input
                  className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                  value={mapping.templatePattern ?? ''}
                  onChange={(e) =>
                    updateMapping(mapping.id, {
                      templatePattern: e.target.value,
                    })
                  }
                  placeholder='"{prop1} {prop2}"'
                />
              </div>
            </div>
          )}
          {mapping.kind === 'constant' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground w-20 shrink-0">
                  Value
                </label>
                <input
                  className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                  value={mapping.constantValue ?? ''}
                  onChange={(e) =>
                    updateMapping(mapping.id, {
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
                  value={mapping.constantType ?? ''}
                  onChange={(e) =>
                    updateMapping(mapping.id, {
                      constantType: e.target.value,
                    })
                  }
                  placeholder="xsd:string"
                />
              </div>
            </>
          )}
          {mapping.kind === 'typecast' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-20 shrink-0">
                Datatype
              </label>
              <input
                className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                value={mapping.targetDatatype ?? ''}
                onChange={(e) =>
                  updateMapping(mapping.id, {
                    targetDatatype: e.target.value,
                  })
                }
                placeholder="xsd:integer"
              />
            </div>
          )}
          {mapping.kind === 'language' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-20 shrink-0">
                Language Tag
              </label>
              <input
                className="text-sm border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
                value={mapping.languageTag ?? ''}
                onChange={(e) =>
                  updateMapping(mapping.id, {
                    languageTag: e.target.value,
                  })
                }
                placeholder="en"
              />
            </div>
          )}
        </div>
      )}

      {/* Formula tier toggle — only for formula kind */}
      {mapping.kind === 'formula' && (
        <div key={mapping.id} className="flex flex-col flex-1 overflow-hidden">
          {/* Tier toggle */}
          <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/10">
            {(['form', 'formula', 'rml'] as FormulaTier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormulaTier(t)}
                className={`text-sm px-2 py-0.5 rounded transition-colors capitalize ${
                  formulaTier === t
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'form' ? 'Form' : t === 'formula' ? 'Formula' : 'RML'}
              </button>
            ))}
          </div>

          {/* Tier content */}
          <div className="flex-1 overflow-auto">
            {formulaTier === 'form' && (
              <FormBuilder mapping={mapping} updateMapping={updateMapping} />
            )}
            {formulaTier === 'formula' && (
              <FormulaBar
                value={mapping.formulaExpression ?? ''}
                onChange={(v) =>
                  updateMapping(mapping.id, { formulaExpression: v })
                }
              />
            )}
            {formulaTier === 'rml' && (
              <div className="p-3 font-mono text-xs bg-muted/10 whitespace-pre text-muted-foreground min-h-full">
                {rmlSnippet || '# No RML generated — add mappings first'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Non-formula RML snippet */}
      {mapping.kind !== 'formula' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-muted/10 whitespace-pre text-muted-foreground">
          {rmlSnippet || '# No RML generated — add mappings first'}
        </div>
      )}
    </>
  );
}
