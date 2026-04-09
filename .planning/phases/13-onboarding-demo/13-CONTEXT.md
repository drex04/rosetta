---
phase: 13
title: Onboarding & Demo
created: 2026-04-07
---

# Phase 13 Context — Locked Decisions

## Plans completed
- 13-01: Example Data Assets ✅
- 13-02: Example Project Wiring ✅
- 13-03: Interaction Bug Fixes ✅
- 13-04: Visual & Display Fixes ✅

## Plans remaining
- 13-08: Node Search improvements (always visible, property search, bolder ring, property-level highlight)
- 13-09: Edge context menus (double-click/right-click → context menu on mapping + ontology edges)
- 13-10: Onboarding improvements (modal-first, Help button, tab switching, step reorder/fixes)

## Decisions

### D1 — uiStore migration strategy
Remove `persist` from `uiStore`. Add `activeRightTab` to `ProjectFile` type so it is included in project export/import. Also add to the IDB snapshot (whichever store/hook owns the main IDB save).
**Rationale:** Exit criteria explicitly bans uiStore using Zustand persist/localStorage. Two persistence paths for the same value are confusing.

### D2 — Formula evaluation approach
Add `evaluate(expr: Expr, record: Record<string, unknown>): string | number` to `formulaParser.ts`. The existing AST (call/field/literal node types) is sufficient for a pure recursive interpreter. No eval(), no Function(). Wire into `rmlExecute.ts` to replace the current warn-and-skip.
**Rationale:** Parser already produces a complete, typed AST. Supported ops are CONCAT, UPPER, LOWER, TRIM, REPLACE + field refs + literals — straightforward to interpret.

### D3 — Bundle splitting strategy
- `React.lazy()` + `Suspense` for `SourcePanel` and `TurtleEditorPanel` (CodeMirror is only imported there)
- `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split N3.js, jsonld, rmlmapper-js into vendor chunks
- Target: main entrypoint chunk gzip < 500KB
- Comunica and YASGUI are not imported in the codebase (removed in Phase 11) — no action needed on those

### D4 — Node search UX (revised in 13-08)
Always-visible `<Panel position="top-right">` search input — no toggle. Ctrl+F focuses the input; Escape clears the query. Searches ALL nodes by label/URI AND all property labels/URIs. Matching nodes highlighted with `ring-2 ring-primary ring-offset-2`. Matching property rows highlighted with `bg-primary/10`. `matchedPropUrisMap` (Map<nodeId, string[]>) passed into node data alongside `isSearchHighlighted`.

### D5 — Keyboard shortcuts scope (revised in 13-08)
Global `keydown` listener in `useKeyboardShortcuts`. Ctrl+F focuses the always-visible search input via `searchInputRef.current?.focus()` (no toggle). Delete/Backspace deletes selected node or edge. Escape clears search query. No hotkey library — native addEventListener.

### D6 — Onboarding tour trigger (revised in 13-10)
`react-joyride` library. First-visit flow: Welcome modal appears first → user chooses "Load Example & Start Tour" (loads sample data, then starts Joyride) or "Start Fresh" (closes modal, no tour). `rosetta-tour-seen` is set ONLY on tour finish/skip — not on "Start Fresh". Help button in Header opens tour; standalone Tour button removed. Each step fires `setActiveRightTab` for the relevant tab. Tour step order: source → add-source → ontology → canvas → map → transform → validate → start-fresh. No blue beacon dots (`disableBeacon: true` on all steps).
