# Architecture

**Analysis Date:** 2026-03-27

## Pattern Overview

**Overall:** Layered client-side SPA with unidirectional state flow, canvas-centric UI, and bidirectional editor↔canvas synchronization.

**Key Characteristics:**
- **Client-side only** — No backend; all RDF processing (parsing, serialization, SPARQL) runs in-browser via N3.js and Comunica
- **Zustand stores** — Four independent, orthogonal state trees (ontology, sources, mappings, UI)
- **React Flow canvas** — Visual graph representation of RDF ontologies and JSON schemas
- **Bidirectional sync** — Turtle editor and canvas stay in sync with debouncing and circular-update guards
- **Dual graph model** — Master ontology (blue nodes) overlaid with active source schema (amber nodes) and mapping edges (dashed green)

## Layers

**UI Layer:**
- Purpose: React components for canvas, panels, and editor
- Location: `src/components/`
- Contains: React Flow canvas, modal dialogs, tabbed panels, text editors
- Depends on: Zustand stores, React Flow, shadcn/ui, CodeMirror 6
- Used by: App.tsx, directly handles user input

**State Layer:**
- Purpose: Single source of truth for ontology, sources, mappings, and UI state
- Location: `src/store/`
- Contains: useOntologyStore, useSourcesStore, useMappingStore, useUiStore
- Depends on: zustand, idb-keyval (for persistence)
- Used by: All components and hooks

**Synchronization Layer:**
- Purpose: Keeps Turtle editor and canvas in sync without circular updates
- Location: `src/hooks/useOntologySync.ts`, `src/hooks/useAutoSave.ts`
- Contains: Debouncing logic, bidirectional change detection, circular-update guards
- Depends on: Zustand stores, RDF lib
- Used by: App.tsx, OntologyCanvas

**RDF Processing Layer:**
- Purpose: Parse/serialize Turtle, generate canvas nodes/edges, manage graph state
- Location: `src/lib/rdf.ts`, `src/lib/sparql.ts`, `src/lib/jsonToSchema.ts`
- Contains: N3.js integrations, tree layout, SPARQL CONSTRUCT compilation
- Depends on: N3.js, @xyflow/react types
- Used by: Synchronization layer and stores

**Canvas Data Layer:**
- Purpose: Merge ontology and source schemas into unified canvas graph
- Location: `src/hooks/useCanvasData.ts`
- Contains: Node/edge combining logic, active-source filtering
- Depends on: Zustand stores
- Used by: OntologyCanvas

## Data Flow

**Editor → Canvas:**

1. User types in Turtle editor
2. `onEditorChange` handler sets `turtleSource` immediately (raw text)
3. Parse debounced by 600ms (D-05)
4. `parseTurtle()` converts text → N3.Store → nodes/edges with tree layout
5. Positions preserved from existing nodes (D-04)
6. `isUpdatingFromEditor` flag prevents canvas-change handler from re-serializing
7. On parse error, canvas unchanged; editor error shown; `hasPendingEdits` remains true

**Canvas → Editor:**

1. User drags node, adds/removes node, creates/removes edge
2. Only structural changes (`add`, `remove`, `reset`) notify parent
3. `onCanvasChange` handler called, but blocked by `isUpdatingFromEditor` flag
4. `canvasToTurtle()` serializes nodes/edges → Turtle string
5. `turtleSource` updated; error cleared
6. `isUpdatingFromCanvas` flag prevents editor-change handler from re-parsing

**Persistence:**

1. All Zustand stores subscribed to in `useAutoSave`
2. Debounced by 500ms (500ms buffer before IDB write)
3. On save: snapshot `turtleSource`, `nodePositions`, all sources, all mappings to IDB
4. On mount: load snapshot, restore each store, preserve node positions
5. Type guards validate restored data; malformed data logged and skipped

**Mapping Creation:**

1. User draws edge from source property → ontology property in canvas
2. `isValidConnection` checks handles match `prop_*` pattern (RD-02)
3. `onConnect` calls `addMapping()` to insert into mappings record
4. Idempotent: duplicate (sourceClass + sourceProp + targetClass + targetProp) returns existing ID (RD-04)
5. `generateConstruct()` creates SPARQL CONSTRUCT template for mapping logic

**State Management:**

- No global Redux; Zustand stores operate independently
- `useOntologyStore` holds master ontology (turtle source, nodes, edges, parse errors)
- `useSourcesStore` holds JSON-derived schemas indexed by source ID
- `useMappingStore` holds mappings keyed by sourceId, with idempotency guarantee
- `useUiStore` persists active right tab (SRC/ONTO/MAP/OUT)
- Hydration on mount via `useAutoSave` populates all stores from IDB

## Key Abstractions

**ClassData:**
- Purpose: Represents an RDF class (OWL Class or derived JSON class)
- Examples: `src/types/index.ts` (interface definition), `src/lib/rdf.ts` (parsed from Turtle)
- Pattern: Immutable data; updated by replacing entire nodes array in store

**PropertyData:**
- Purpose: Represents a property (DatatypeProperty or ObjectProperty)
- Examples: Range stored as full URI (e.g., `http://www.w3.org/2001/XMLSchema#float`) or XSD alias
- Pattern: Part of ClassData.properties; not separately indexed

**OntologyNode / SourceNode:**
- Purpose: React Flow Node wrapper around ClassData with canvas position/state
- Examples: `src/components/nodes/ClassNode.tsx` (master), `src/components/nodes/SourceNode.tsx` (source)
- Pattern: Node.id derived from local name (`node_${localName(uri)}`); position mutable

**OntologyEdge:**
- Purpose: React Flow Edge with typed data (SubclassEdgeData or ObjectPropertyEdgeData)
- Examples: Subclass edges (parent→child, dashed-green), object property edges (property connection)
- Pattern: ID encodes type and endpoints (`e_${sourceId}_subclassEdge_${targetId}`)

**Mapping:**
- Purpose: Declarative link between source property and ontology property
- Examples: `{ sourceClassUri, sourcePropUri, targetClassUri, targetPropUri, kind, sparqlConstruct }`
- Pattern: Keyed by sourceId; idempotent insert via deduplication on composite key

**localName():**
- Purpose: Extract short name from URI (hash fragment or last slash segment)
- Examples: `http://nato.int/onto#Track` → `Track`, `http://src_foo_/Bar` → `Bar`
- Pattern: Used in all node IDs; CRITICAL — never re-implement (CLAUDE.md gotcha)

## Entry Points

**main.tsx:**
- Location: `src/main.tsx`
- Triggers: Page load
- Responsibilities: Bootstrap React, wrap with ReactFlowProvider, mount App

**App.tsx:**
- Location: `src/App.tsx`
- Triggers: On mount, loads SEED_TURTLE; on user interaction, coordinates panels
- Responsibilities: Layout shell (Header, SourceSelector, canvas, RightPanel, StatusBar), manage pendingSync dialog, initialize ontology with seed data

**OntologyCanvas:**
- Location: `src/components/canvas/OntologyCanvas.tsx`
- Triggers: All canvas user interactions (drag, connect, delete)
- Responsibilities: Merge ontology + source nodes/edges, handle structural changes, create/remove mappings, fit view on first load

**useOntologySync:**
- Location: `src/hooks/useOntologySync.ts`
- Triggers: Editor keystroke (debounced 600ms), canvas structural change (debounced 100ms)
- Responsibilities: Bidirectional sync with circular-update guards, parse errors, preserve positions

**useAutoSave:**
- Location: `src/hooks/useAutoSave.ts`
- Triggers: Any Zustand store subscription change, debounced 500ms
- Responsibilities: Persist to IDB, restore on mount, block tab close during save

## Error Handling

**Strategy:** Three-tier error isolation — parse errors logged to editor, serialization errors silent, IDB errors logged to console and UI.

**Patterns:**

- **Parse error (editor):** If Turtle invalid, `setParseError()` called; canvas unchanged; `hasPendingEdits` holds. User sees error in editor UI and can fix.
- **Serialization error (canvas→editor):** If `canvasToTurtle()` throws, editor left unchanged; `isUpdatingFromCanvas` cleared; operation silent (no user notification needed).
- **IDB error (persistence):** On read: malformed data skipped with console warning. On write: `setSaveStatus('error')`, shown in StatusBar; debounce allows retry.

## Cross-Cutting Concerns

**Logging:**
- Console.warn for IDB restore failures, type guard violations, circular reference detection
- Console.error for IDB write failures
- No remote logging (client-side only)

**Validation:**
- Type guards on IDB restore (CLAUDE.md requirement)
- `isValidConnection` enforces `prop_*` handle naming convention for mappings
- Parse errors bubble to editor; serialization errors silent

**Authentication:**
- Not applicable — no backend, no user accounts

## Canvas Semantics

**Color and Style Encoding (NEVER BREAK — per CLAUDE.md):**
- **Amber nodes** — Source schema classes (from active JSON source)
- **Blue nodes** — Master ontology classes
- **Dashed green edges** — Mapping edges linking source to master

**Layout:**
- Master ontology columns: X = 0 (COLUMN_X_MASTER)
- Source schema columns: X = -520 (COLUMN_X_SOURCE)
- Column spacing: 180px (COLUMN_SPACING)
- Tree layout applied via `applyTreeLayout()` for both
- Positions preserved on reload and after parse

---

*Architecture analysis: 2026-03-27*
