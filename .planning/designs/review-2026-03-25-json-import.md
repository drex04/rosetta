# Plan Review — Phase 3: JSON Import (Multi-Source)

**Date:** 2026-03-25
**Mode:** HOLD SCOPE
**Plans reviewed:** 03-01, 03-02, 03-03

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Phase 2 complete; 1 modified file (uiStore) |
|                      | No stash, no open branches                  |
| Step 0               | 3 architectural landmines identified before |
|                      | mode selection                               |
| Section 1  (Arch)    | 2 issues found (circular-ref spec,          |
|                      | onNodesChange split)                         |
| Section 2  (Errors)  | 9 error paths mapped, 4 CRITICAL GAPS       |
| Section 3  (Security)| 2 warnings, 0 high-severity findings         |
| Section 4  (Data/UX) | 9 edge cases mapped, 2 fixed                |
| Section 5  (Tests)   | Diagram produced, 5 gaps closed             |
| Section 6  (Future)  | Reversibility: 4/5, debt items: 4           |
+--------------------------------------------------------------------+
| PLAN.md updated      | 03-01: +5 truths, +2 artifacts, +1 task     |
|                      | 03-02: +5 truths, task descriptions updated |
|                      | 03-03: +1 truth, task description updated   |
| CONTEXT.md updated   | 8 decisions locked, 5 items deferred        |
| Error/rescue registry| 9 methods, 4 CRITICAL GAPS → PLAN.md        |
| Failure modes        | 9 total, 4 CRITICAL GAPS resolved           |
| Delight opportunities| 0 (HOLD SCOPE mode)                         |
| Diagrams produced    | 2 (system architecture, data flow)          |
| Unresolved decisions | 0                                           |
+====================================================================+
```

---

## System Architecture

```
03-01 (Wave 1)                03-02 (Wave 2)               03-03 (Wave 3)
──────────────                ──────────────               ─────────────
sourcesStore.ts               jsonToSchema.ts              SourceNode.tsx
  +updateSource       ──────► (new converter)              (new, amber)
  +removeSource fix            │                                │
  +generateSourceId            ▼                          OntologyCanvas.tsx
  (crypto.randomUUID)  SourcePanel.tsx                    +sourceNode type
        │              +JSON editor                        +onNodesChange split
rdf.ts                 +debounce 500ms                          │
  +COLUMN_X_MASTER     +Turtle preview               useCanvasData.ts
  +COLUMN_X_SOURCE     +collision warn               (already ready — reads
  +COLUMN_SPACING              │                      master+active source)
        │                      ▼
SourceSelector.tsx     RightPanel.tsx
  (pill bar)           SRC tab → SourcePanel
        │
useSourcesAutoSave.ts
  (idb-keyval persist)
```

---

## Data Flow (with shadow paths)

```
User types JSON in CodeMirror (SourcePanel)
       │
  500ms debounce (source.id captured in closure — RD-06)
       │
       ▼
JSON.parse(value)
  ├─ SyntaxError     → red banner, prior nodes preserved ✓
  └─ success
       │
       ▼
  typeof root check
  ├─ null / primitive → warnings:['Unexpected root type'], return empty ✓ (RD fixed)
  └─ object / array
       │
       ▼
jsonToSchema(value, source.name)
  ├─ sanitize name   → strip non-alphanum, lowercase, src_*_ prefix ✓ (RD-03)
  ├─ circular ref    → suppress property, add to warnings[], parent emits ✓ (RD-01)
  ├─ empty {}|[]     → empty result, yellow banner ✓
  └─ success
       │
       ▼
  prefix collision check (compare slug against other sources)
  ├─ collision       → yellow warning banner in SourcePanel ✓ (RD-07)
  └─ no collision    → clear banner
       │
       ▼
updateSource(id, { json, schemaNodes, schemaEdges })
  ├─ id gone         → no-op (acceptable) ✓
  └─ success → sourcesStore → useCanvasData → OntologyCanvas re-renders
                                                      │
                                              useSourcesAutoSave
                                              writes to IDB (800ms debounce)
```

---

## Issues Found and Decisions Made

| # | Issue | Decision |
|---|-------|----------|
| 1 | Circular-ref node emission underspecified | A: Suppress property + add to warnings[]; parent Class emits |
| 2 | onNodesChange split architecture ambiguous | A: Two-filter approach — master→ontologyStore, source→updateSource |
| 3 | null/primitive JSON roots crash jsonToSchema | A: Add guard + return empty + test cases |
| 4 | Duplicate URI prefix slug collision | B: Detect + show yellow banner in SourcePanel |
| 5 | removeSource leaves dangling activeSourceId | A: Fix atomically in store action |
| 6 | Source names with special chars produce invalid IRIs | A: Sanitize in jsonToSchema (regex strip) |
| 7 | Empty source name produces invalid URI prefix | A: Revert to prior name on blur/Enter |
| 8 | Debounce closure may write to wrong source on switch | A: Capture source.id in closure, add explicit note to plan |
| 9 | Sources lost on page refresh despite master ontology auto-saving | B: Add useSourcesAutoSave hook as Task 3 in 03-01 |

---

## What Already Exists (no rebuild needed)

- `useCanvasData.ts` — already merges master + active source nodes; 03-03 Task 2 just verifies it
- `useAutoSave` pattern — `useSourcesAutoSave` mirrors it exactly; no new patterns needed
- `isUpdatingFromStore` ref pattern — established in Phase 2, carried forward into SourcePanel
- `idb-keyval` — already in deps from Phase 2

---

## Dream State Delta

```
AFTER PHASE 3             12-MONTH IDEAL
─────────────             ──────────────
Multi-source pill UI   ✓  Full project save/load (sources + mappings + master)
Amber nodes on canvas  ✓  Import from file / URL drop
Positions preserved    ✓  Schema diff view between sources
Sources persist (IDB)  ✓  SPARQL across all source N3 stores
URI prefix unique      ~  Configurable inference depth (Phase 7)
Collision warning      ~  Automatic prefix conflict resolution
No SPARQL yet          ✗  Full mapping + SHACL + transform pipeline
```

Phase 3 leaves the project in a strong position for Phase 4 (Mapping). The URI prefix system and column layout constants are designed to extend cleanly.

---

## Second Review Pass — 2026-03-25 (Deep-Dive)

**Mode: HOLD SCOPE**

### New issues found and decisions locked (RD-09 through RD-16)

| # | Issue | Decision | Locked As |
|---|-------|----------|-----------|
| 1 | useAutoSave exports sources:[] — sources lost on file export/import | Fix: extend useAutoSave to serialize sources[] | RD-15 |
| 2 | SourcePanel mirrors hasFocus guard from TurtleEditorPanel — blocks source-switch content update | Drop hasFocus guard entirely in SourcePanel | RD-11 |
| 3 | singular() not defined — pluralization is language-specific (Norwegian/German data) | No singularization: PascalCase key as-is ('radarTracks'→'RadarTracks') | RD-09 |
| 4 | Delete confirmation UI not specified | shadcn AlertDialog | RD-13 |
| 5 | Auto-name 'Source N' reuses numbers after deletions | Find smallest unused N | RD-14 |
| 6 | N3.Writer can throw; no catch in jsonToSchema or SourcePanel | Wrap N3 in try/catch inside jsonToSchema; return warnings[] | RD-10 |
| 7 | useSourcesAutoSave has no IDB error handling | try/catch on both load and save with console.warn | RD-15 (consolidated) |
| 8 | Esc+blur double-fire in inline name edit | isEscaping ref pattern | RD-12 |
| 9 | useCanvasData type cast comment deferred indefinitely | Fix in Plan 03-03 after SourceNode type exists | RD-16 |
| 10 | N3.Writer failure path not in TDD test spec | Add mock test to jsonToSchema.test.ts | (03-02 plan updated) |
| 11 | Dual IDB keys create fragmented persistence | Consolidate: remove useSourcesAutoSave, extend useAutoSave to subscribe to both stores | RD-15 |

### Plan files updated in this pass
- `03-01-PLAN.md`: files_modified, 4 truths added, Task 3 replaced (useAutoSave extension instead of new useSourcesAutoSave), Task 2 updated (AlertDialog + unique naming + isEscaping)
- `03-02-PLAN.md`: 3 truths added, TDD test spec updated (no-singularization + N3 failure test), algorithm step 4 and 7 updated
- `03-03-PLAN.md`: 2 truths added, Task 2 step 5 added (useCanvasData type fix)
- `03-json-import-CONTEXT.md`: RD-09 through RD-16 appended
