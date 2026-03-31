---
phase: 08-source-ontology-editing
plan: 03
subsystem: canvas
tags: [canvas, context-menu, react-flow, ontology, store]
requires:
  - phase: 08-02
    provides: "source Turtle editing + XML upload"
provides:
  - "Granular ontologyStore CRUD actions (addNode, removeNode, addEdge, removeEdge, addPropertyToNode, removePropertyFromNode)"
  - "Canvas context menus for creating/deleting ontology classes and properties"
  - "Connectable ClassNode handles — drag to create SubclassEdge or ObjectPropertyEdge"
  - "Source node context menus + connectable handles with amber styling"
  - "Mapping invalidation callback wired in App.tsx"
affects: []
tech-stack:
  added: []
  patterns:
    - "Zustand setInvalidateMappingsCallback — decoupled cross-store cascade via App.tsx bridge"
    - "ReactFlowProvider wrapper + useReactFlow() inner component for screenToFlowPosition"
    - "O(1) Set-based isValidConnection covering 4 connection permutations"
key-files:
  created:
    - src/components/canvas/CanvasContextMenu.tsx
    - src/components/canvas/NodeContextMenu.tsx
    - src/components/canvas/AddPropertyDialog.tsx
    - src/__tests__/ontologyCanvasEditor.test.ts
  modified:
    - src/store/ontologyStore.ts
    - src/components/canvas/OntologyCanvas.tsx
    - src/components/nodes/ClassNode.tsx
    - src/components/nodes/SourceNode.tsx
    - src/App.tsx
key-decisions:
  - "Mapping invalidation wired via callback in App.tsx — ontologyStore stays decoupled from mappingStore"
  - "Rapid Add Class uses +30px position offset per call via ref to prevent overlap"
  - "Edge type picker for onto→onto uses simple state-driven div (not popover); rename uses window.prompt — both deferred for polish"
  - "isValidConnection uses Set<string> for O(1) node-type lookup over 4 permutations"
requirements-completed:
  - REQ-66
test_metrics:
  tests_passed: 212
  tests_failed: 0
  tests_total: 212
  coverage_line: null
  coverage_branch: null
  test_files_created:
    - src/__tests__/ontologyCanvasEditor.test.ts
  spec_tests_count: 19
duration: ~25 min
completed: 2026-03-31T20:10:00Z
---

## What Was Done

- **ontologyStore granular actions:** Added `addNode`, `removeNode`, `addPropertyToNode`, `removePropertyFromNode`, `addEdge`, `removeEdge` + `setInvalidateMappingsCallback` for decoupled cascade
- **CanvasContextMenu:** Right-click on canvas pane shows "Add Class" (always) and "Add Source Class" (when active source set); uses `screenToFlowPosition()` for accurate placement
- **NodeContextMenu:** Right-click on class/source node shows Add Property, Rename, Delete Node; deletion confirms if node has mappings
- **AddPropertyDialog:** shadcn Dialog with name, URI (auto-derived), XSD datatype picker; calls `addPropertyToNode` on submit
- **Connectable handles:** `isConnectable={true}` on ClassNode and SourceNode handles; onto→onto drag creates SubclassEdge/ObjectPropertyEdge; source→source creates schema edges
- **OntologyCanvas wiring:** `onPaneContextMenu`, extended `onConnect` (3-way routing), `isValidConnection` with O(1) Sets, `onEdgesDelete` extended for ontology edges
- **App.tsx bridge:** `setInvalidateMappingsCallback` registered on mount; removes mappings by `targetPropUri` when node/property deleted

## Test Results

- **Tests:** 212/212 passing (unit)
- **Coverage:** not configured
- **Test files created:** `src/__tests__/ontologyCanvasEditor.test.ts` (19 tests)
- **Note:** 15 e2e spec files picked up by Vitest are pre-existing failures (known gotcha — run with `npx playwright test`)

## Issues Encountered

- LSP reported `ReactFlowProvider` as unused (false positive — used in JSX wrapper at line 624); stale diagnostic, build clean
- `useMappingStore` import initially flagged as unused after agent used `.getState()` pattern; resolved by keeping the hook import (TypeScript accepts `.getState()` usage)

## Deviations from Plan

- Edge type picker implemented as fixed-position state div rather than cursor-positioned popover — `onConnect` doesn't expose viewport coords; deferred to polish pass
- Rename uses `window.prompt` as specified ("can be simple prompt") — inline editing deferred

## Next Phase Readiness

Plan 08-04 (Mapping Groups / JoinNode alternative) can proceed. The granular store actions and canvas editor patterns established here are foundational for that work.
