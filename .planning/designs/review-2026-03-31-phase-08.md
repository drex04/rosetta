# Plan Review — Phase 08: Source & Ontology Editing
**Date:** 2026-03-31
**Mode:** HOLD SCOPE
**Plans reviewed:** 08-01, 08-02, 08-03, 08-04

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Phase 8 plans ready, no prior exec; wave    |
|                      | dependency bug found and fixed              |
| Step 0               | HOLD SCOPE; Plan 03 depends_on fixed to [2] |
| Section 1  (Arch)    | 3 issues found                              |
| Section 2  (Errors)  | 7 error paths mapped, 2 CRITICAL GAPS      |
| Section 3  (Security)| 0 High-severity; client-side only           |
| Section 4  (Data/UX) | 4 edge cases mapped, 3 addressed           |
| Section 5  (Tests)   | Diagram produced, 6 gaps found             |
| Section 6  (Future)  | Reversibility: 3/5, debt items: 2          |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 2 issues found (OntologyCanvas fan-out,     |
|                      | isValidConnection permutations)             |
| Section 8  (Code Ql) | 1 DRY concern (hook cloning); 0 over-eng   |
| Section 9  (Eng Test)| Test diagram produced, 6 gaps (all fixed)  |
| Section 10 (Perf)    | 1 Med (isValidConnection O(1)), 1 Low      |
+--------------------------------------------------------------------+
| PLAN.md updated      | 01: +8 truths, +1 artifact, +1 file        |
|                      | 02: +2 truths                               |
|                      | 03: +5 truths, +1 artifact, +1 file        |
|                      | 04: +3 truths                               |
| CONTEXT.md updated   | 12 decisions logged, 2 deferred ideas      |
| Error/rescue registry| 7 methods, 2 CRITICAL GAPS → PLAN.md       |
| Failure modes        | 9 total, 2 CRITICAL GAPS → PLAN.md         |
| Diagrams produced    | 3 (system arch, data flow, test coverage)  |
| Unresolved decisions | 0                                           |
+====================================================================+
```

---

## System Architecture (Post Phase 8)

```
File/Paste ──► detectFormat ──► xmlToSchema / jsonToSchema ──► SchemaResult
                                                                    │
                                        ┌───────────────────────────┘
                                        ▼
                              sourcesStore.updateSource()
                                   (rawData, dataFormat,
                                    schemaNodes, schemaEdges,
                                    turtleSource)
                                        │
                    ┌───────────────────┴────────────────────┐
                    ▼                                        ▼
           useSourceSync ◄──────────────────► OntologyCanvas
           (editor ↔ canvas)                  (source nodes, ontology nodes)
           isUpdatingFromCanvas ref           CanvasContextMenu
           isUpdatingFromEditor ref           NodeContextMenu
                    │
                    ├─► turtleSource (editor display)
                    └─► schemaNodes/Edges (canvas display)

ontologyStore (addNode/removeNode/addEdge/removeEdge)
     └─► useOntologySync (existing) ──► Turtle editor

mappingStore (createGroup/updateGroup/ungroupMappings)
     └─► sparql.ts (generateGroupConstruct)
     ▲
     └─ App.tsx cascade subscriptions (from removeNode + resetSourceSchema)
```

## Data Flow — Format Change Path

```
User uploads/pastes new format
        │
        ▼
detectFormat() ──► dataFormat changed?
                          │
                    YES ──┼──► clearMappingsForSource(sourceId) [App.tsx cascade]
                          │    toast("Format changed — mappings cleared")
                          │
                          └──► xmlToSchema/jsonToSchema [debounced 600ms]
                                      │
                                      ▼
                               updateSource(schemaNodes, schemaEdges, turtleSource)
```

## Test Coverage Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    TEST COVERAGE DIAGRAM (FINAL)                   │
├───────────────────────────────┬────────────┬───────────────────────┤
│ NEW CODEPATH                  │ TEST TYPE  │ STATUS                │
├───────────────────────────────┼────────────┼───────────────────────┤
│ xmlToSchema happy path        │ Unit       │ ✓ Plan 01 Task 2      │
│ xmlToSchema parseerror        │ Unit       │ ✓ [review] added      │
│ xmlToSchema empty input       │ Unit       │ ✓ [review] added      │
│ detectFormat JSON/XML/unknown │ Unit       │ ✓ Plan 01 Task 3      │
│ IDB migration json→rawData    │ Unit       │ ✓ Plan 01 Task 1      │
│ FileReader onerror            │ Unit       │ ✓ [review] added      │
│ useSourceSync bidi sync       │ Unit       │ ✓ Plan 02 Task 2      │
│ useSourceSync source-switch   │ Unit       │ ✓ Plan 02 Task 2      │
│ sourceCanvasToTurtle empty    │ Unit       │ ✓ [review] added      │
│ ontologyStore addNode/remove  │ Unit       │ ✓ Plan 03 Task 1      │
│ removeNode → mapping cascade  │ Unit       │ ✓ [review] noted      │
│ isValidConnection 4 permuts   │ Unit       │ ✓ [review] added      │
│ MappingGroup store CRUD       │ Unit       │ ✓ Plan 04 Task 1      │
│ generateGroupConstruct CONCAT │ Unit       │ ✓ Plan 04 Task 2      │
│ generateGroupConstruct TMPL   │ Unit       │ ✓ Plan 04 Task 2      │
│ generateGroupConstruct COAL.  │ Unit       │ ✓ [review] ordering   │
│ E2E: upload XML, see nodes    │ E2E        │ ✓ [review] Plan 01    │
│ E2E: canvas add class → sync  │ E2E        │ ✓ [review] Plan 03    │
└───────────────────────────────┴────────────┴───────────────────────┘
```

## Error & Rescue Registry

| METHOD/CODEPATH | ERROR TYPE | RESCUED? | RESCUE ACTION | USER SEES |
|---|---|---|---|---|
| xmlToSchema(xmlString) | parseerror document | Y | return {nodes:[], warnings:[]} | warnings displayed |
| xmlToSchema(xmlString) | empty string | Y | return empty SchemaResult | no nodes shown |
| FileReader.readAsText() | onerror | Y [review] | toast error | "Could not read file" |
| file upload | >1MB file | Y [review] | reject before read | "File too large" |
| format change | dataFormat changed | Y [review] | clearMappings + toast | "Mappings cleared" |
| parseTurtle (useSourceSync) | malformed Turtle | Y | set parseError | error in editor |
| source switch during debounce | stale activeSourceId | Y | discard pending parse | no corruption |
| generateGroupConstruct | templatePattern missing | Y [review] | TS discriminated union | compile error |
| addNode rapid | URI collision | Y [review] | position offset | no overlap |

## What Already Exists

- `useOntologySync.ts` (700 lines) — template for `useSourceSync` (Plan 02)
- `onConnect` handler in OntologyCanvas — extended for ontology-to-ontology and group detection
- Phase 7 mapping invalidation — extended to cover removeNode cascade and reset

## Dream State Delta

This phase leaves us at: full source + ontology editing, XML support, grouped mappings. Remaining gap to 12-month ideal: collaborative editing, URL-based schema import, semantic reasoning.
