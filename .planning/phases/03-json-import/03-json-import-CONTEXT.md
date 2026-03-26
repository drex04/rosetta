# Phase 3: JSON Import (Multi-Source) — Context

## Design Decisions

### DD-01: Recursive JSON→RDFS Inference
Array root → Class (singular of key). Primitive leaf → DatatypeProperty (XSD inferred: string/float/integer/boolean). Object value → new Class + ObjectProperty link. Circular references detected via visited set and skipped with a warning badge on the affected node.

### DD-02: Live Debounced Schema Update
JSON edits in SRC tab trigger schema regeneration after 500ms debounce (same pattern as Turtle editor). Parse errors show red banner and skip update. Empty/invalid root shows yellow "Paste JSON to generate schema" banner.

### DD-03: Inline Source Add
Clicking `+` in SourceSelector appends a new source with auto-name "Source N", auto-focuses the name for inline editing. Enter/blur commits, Esc cancels.

### DD-04: Column Layout for Both Source and Master Nodes
Source nodes: x = -520, y spacing = 180px, top-aligned.
Master ontology nodes: x = 0, y spacing = 180px (replaces dagre auto-layout in `lib/rdf.ts:parseTurtle`).
Column layout applies only when no saved positions exist; saved positions are always respected.

### DD-05: Canvas Color Semantics (locked from Phase 2)
Amber (`#f59e0b`) = source nodes. Blue (`#3b82f6`) = master ontology. Dashed green = mapping edges.

## Deferred
- Configurable inference depth (Gray area 1 option C) — deferred to Phase 7 polish
- Dialog-based source add — deferred, inline is sufficient
- Dagre layout as optional toggle — deferred

## Review Decisions (2026-03-25 — locked for /build subagents)

### RD-01: Circular-ref suppression
Circular-referencing *properties* are suppressed (not emitted); the parent Class node is still emitted; the circular path is added as a string to `warnings[]`. A yellow warning banner is shown in SourcePanel for any non-empty warnings array. Do not emit orphaned edges or nodes with `hasWarning` flags — suppress cleanly.

### RD-02: onNodesChange two-filter split
OntologyCanvas `onNodesChange` must split changes by node ID membership: master-node changes go to ontologyStore (existing path, unchanged); source-node changes go to `updateSource` via `applyNodeChanges`. Never apply changes to both stores for the same node. If `activeSource` is null, skip the source path.

### RD-03: URI prefix sanitization
`jsonToSchema` derives URI prefix by stripping all non-alphanumeric chars (except underscore) from source name, then lowercasing, prefixing `src_`, suffixing `_`. This is the canonical format across all plans — do not use spaces-to-underscores replacement, which leaves other special characters intact.

### RD-04: removeSource store consistency
`removeSource` in sourcesStore atomically updates `activeSourceId` in the same `set()` call. Callers (SourceSelector) do NOT need to separately call `setActiveSourceId` after removing the active source.

### RD-05: Empty name revert
SourceSelector inline-edit on blur/Enter: if committed value is empty or whitespace-only, revert to prior name without calling `updateSource`. This prevents invalid IRI prefix generation from empty-string source names.

### RD-06: Debounce closure captures source.id
SourcePanel debounce callback must capture `source.id` as a local const before creating the debounced function. Do NOT read `activeSourceId` from the store inside the callback — the active source may have changed before the 500ms fires.

### RD-07: Prefix collision detection
After successful `jsonToSchema`, derive the slug from the current source name and compare against all other sources' name slugs. If collision: show yellow banner in SourcePanel. This is a display-only warning in Phase 3; URI uniqueness is enforced in Phase 5.

### RD-08: crypto.randomUUID()
Use `crypto.randomUUID()` for `generateSourceId()`. Do not add nanoid as a dependency.

### RD-09: No singularization in jsonToSchema
`jsonToSchema` PascalCases array key names as-is without singularization: `'radarTracks'` → `'RadarTracks'`. Reason: source data may be in non-English languages (Norwegian, German) where English pluralization heuristics produce wrong results. No pluralization library is added.

### RD-10: N3.Writer rescue in jsonToSchema
N3.Writer serialization is wrapped in try/catch inside `jsonToSchema`. On failure: returns `{ nodes, edges, turtle: '', warnings: ['Failed to serialize schema to Turtle'] }`. The caller (SourcePanel) shows a yellow banner for any non-empty warnings[].

### RD-11: No hasFocus guard in SourcePanel external-update path
SourcePanel's external-update effect (triggered by `source?.json` dependency change on source switch) does NOT include a `hasFocus` guard. Unlike TurtleEditorPanel (where canvas can push turtle text while editing), source switching must always update CodeMirror content even if the editor currently has focus.

### RD-12: Esc+blur double-fire guard in SourceSelector
Inline source name editing uses an `isEscaping` ref. `onKeyDown(Esc)`: set `isEscaping.current = true`, revert value, call `input.blur()`. `onBlur`: if `isEscaping.current` is true, reset to false and return without committing. Prevents blur from re-committing the reverted value.

### RD-13: AlertDialog for source deletion
Delete (×) on a source with non-empty `json` opens a shadcn `AlertDialog` ("Delete source and all its schema nodes?" with Cancel/Delete buttons) before calling `removeSource`. Empty sources are deleted immediately without confirmation.

### RD-14: Unique auto-name on source add
The `+` button computes the auto-name as the smallest N ≥ 1 where `'Source N'` is not already in `sources.map(s => s.name)`. Prevents duplicate default names after source deletions.

### RD-15: Unified IDB persistence (single 'rosetta-project' key)
`useSourcesAutoSave` is NOT created. Instead, `useAutoSave` is extended to subscribe to both `ontologyStore` and `sourcesStore`, serializing `sources[]` and `activeSourceId` into the project snapshot. Load path restores sources to `sourcesStore`. This ensures the Export button produces a full project round-trip. Both stores share the same debounceTimer ref — either store change triggers a save.

### RD-16: useCanvasData type cast resolved in Plan 03-03
After `SourceNode` type is defined in `types/index.ts` (Plan 03-03 Task 1), `useCanvasData.ts` is updated to cast `active?.schemaNodes` as `SourceNode[]`. The `// source nodes typed properly in a later phase` comment is removed.

## NOT in scope (considered during review, explicitly deferred)
- sourcesStore Zustand persist middleware — using idb-keyval hook pattern (useSourcesAutoSave) instead, consistent with useAutoSave
- Source name character validation UI (red border + tooltip) — handled silently via revert-on-empty pattern (RD-05)
- Large JSON size guard / async walk — acceptable limitation for Phase 3; flag for Phase 7 polish
- Per-frame `updateSource` throttling during drag — acceptable for Phase 3 schemas; flag for Phase 7 polish
- Automated component tests for SourceSelector pill behavior — manual verification sufficient for this phase
