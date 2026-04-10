# Rosetta — Architecture Document (v1 Reverse-Engineered)

> **Purpose:** Complete technical architecture of Rosetta v1 as-built. Intended to give a Claude Opus planning instance full technical context for designing Rosetta v2.

---

## 1. System Overview

Rosetta is a **pure client-side SPA** (Single Page Application). There is no backend, no API server, no database server, and no authentication system. Everything runs in the browser.

```
Browser
├── React 19 UI
├── Zustand 5 state stores
├── N3.js (RDF parsing/serialization)
├── Comunica (in-browser SPARQL)
├── rdf-validate-shacl (in-browser SHACL)
├── @comake/rmlmapper-js (in-browser RML execution)
├── CodeMirror 6 (editors)
├── @xyflow/react 12 (canvas)
└── IndexedDB (persistence via idb-keyval)
```

**Build:** Vite 8 + TypeScript 5.9, output to `dist/` as static files.  
**Hosting:** Any static host (GitHub Pages, Netlify, etc.)

---

## 2. Tech Stack

| Layer          | Technology            | Version         |
| -------------- | --------------------- | --------------- |
| Language       | TypeScript            | ~5.9.3          |
| UI framework   | React                 | 19.2.4          |
| Canvas         | @xyflow/react         | 12.10.2         |
| State          | Zustand               | 5.0.12          |
| RDF            | N3.js                 | 2.0.3           |
| SPARQL         | Comunica (in-browser) | bundled         |
| SHACL          | rdf-validate-shacl    | 0.6.5           |
| RML execution  | @comake/rmlmapper-js  | 0.5.2           |
| JSON-LD        | jsonld                | 9.0.0           |
| XPath          | fontoxpath            | 3.34.0          |
| Editors        | CodeMirror 6          | 6.0.2           |
| Persistence    | idb-keyval            | 6.2.2           |
| UI primitives  | shadcn/ui (Radix)     | preset bcivVKZU |
| Icons          | @phosphor-icons/react | 2.1.10          |
| Toasts         | sonner                | 2.0.7           |
| Onboarding     | react-joyride         | 3.0.2           |
| Build          | Vite                  | 8.0.5           |
| Testing (unit) | Vitest                | 4.1.2           |
| Testing (E2E)  | Playwright            | 1.58.2          |

---

## 3. Directory Structure

```
src/
├── App.tsx                    # Root: mounts hooks, wires canvas + panels + dialogs
├── main.tsx                   # Vite entry: ReactFlowProvider, subscribeFusionToMappings()
├── index.css                  # Tailwind CSS 4 (CSS-first, no tailwind.config.js)
│
├── components/
│   ├── canvas/
│   │   ├── OntologyCanvas.tsx      # Main canvas (1300 lines, god component)
│   │   ├── CanvasContextMenu.tsx   # Background right-click menu
│   │   ├── NodeContextMenu.tsx     # Node right-click menu
│   │   ├── EdgeContextMenu.tsx     # Edge right-click menu
│   │   └── AddPropertyDialog.tsx   # Add property to class dialog
│   ├── nodes/
│   │   ├── ClassNode.tsx           # Blue ontology class node
│   │   └── SourceNode.tsx          # Amber source data node
│   ├── edges/
│   │   ├── MappingEdge.tsx         # Dashed green mapping edge
│   │   ├── SubclassEdge.tsx        # rdfs:subClassOf edge
│   │   ├── ObjectPropertyEdge.tsx  # owl:ObjectProperty edge
│   │   ├── EdgeLabel.tsx           # Shared edge label component
│   │   └── shared.ts               # Edge geometry helpers
│   ├── panels/
│   │   ├── SourcePanel.tsx         # SOURCE tab (450 lines)
│   │   ├── TurtleEditorPanel.tsx   # ONTOLOGY tab (208 lines)
│   │   ├── MappingPanel.tsx        # MAP tab (922 lines)
│   │   ├── OutputPanel.tsx         # OUTPUT tab (291 lines)
│   │   └── ValidationPanel.tsx     # VALIDATE tab (284 lines)
│   ├── layout/
│   │   ├── AppLayout.tsx           # Header + children layout wrapper
│   │   ├── Header.tsx              # Toolbar (443 lines): file ops, project menu
│   │   ├── RightPanel.tsx          # Tab container + resize handle
│   │   ├── SourceSelector.tsx      # Active source dropdown
│   │   └── StatusBar.tsx           # Save status indicator
│   ├── onboarding/
│   │   ├── OnboardingModal.tsx     # About dialog (first-visit)
│   │   ├── TourProvider.tsx        # react-joyride wrapper
│   │   └── tourSteps.ts            # Tour step definitions
│   ├── ui/                         # shadcn/ui component overrides
│   │   ├── button.tsx, tabs.tsx, accordion.tsx, tooltip.tsx
│   │   ├── dropdown-menu.tsx, scroll-area.tsx, alert.tsx
│   │   ├── sonner.tsx, confirm-dialog.tsx, about-dialog.tsx
│   └── ErrorBoundary.tsx
│
├── store/
│   ├── ontologyStore.ts       # Turtle source, nodes, edges, parse state
│   ├── sourcesStore.ts        # Source records (schema, instance quads)
│   ├── mappingStore.ts        # Mappings + groups per source, undo stack
│   ├── validationStore.ts     # SHACL results, shapes Turtle
│   ├── fusionStore.ts         # Fusion status + FusionResult
│   └── uiStore.ts             # Active right tab
│
├── hooks/
│   ├── useAutoSave.ts         # IDB persist/restore for all stores
│   ├── useOntologySync.ts     # Bidirectional canvas ↔ Turtle editor sync
│   ├── useSourceSync.ts       # Source upload → schema inference → store update
│   ├── useCanvasData.ts       # Derive React Flow nodes/edges from stores
│   ├── useKeyboardShortcuts.ts
│   └── useInvalidateMappings.ts  # Notify mapping store when ontology changes
│
├── lib/
│   ├── rdf.ts                 # N3.js wrapper: parseTurtle, localName, etc.
│   ├── parseOntologyFile.ts   # Parse any RDF format into Turtle
│   ├── jsonToSchema.ts        # JSON → RDF schema nodes inference
│   ├── xmlToSchema.ts         # XML → RDF schema nodes inference
│   ├── detectFormat.ts        # Sniff file format from content + extension
│   ├── rml.ts                 # Generate RML Turtle from sources + mappings
│   ├── rmlExecute.ts          # Execute RML in-browser via rmlmapper-js
│   ├── yarrrml.ts             # Generate YARRRML from mappings
│   ├── formulaParser.ts       # Hand-rolled tokenizer + recursive descent parser
│   ├── mappingHelpers.ts      # Shared mapping utilities
│   ├── layout.ts              # React Flow auto-layout algorithm
│   ├── stringUtils.ts         # String helpers (slugify, etc.)
│   ├── codemirror-theme.ts    # Custom CodeMirror dark theme
│   ├── exampleProject.ts      # Load NATO example scenario
│   └── shacl/
│       ├── index.ts           # Re-exports + validateSource entry point
│       ├── shapesGenerator.ts # Auto-generate SHACL shapes from ontology nodes
│       ├── validator.ts       # Run rdf-validate-shacl against N3.Store
│       ├── instanceGenerator.ts  # Generate test instances from shapes
│       └── constructExecutor.ts  # SPARQL CONSTRUCT queries via Comunica
│
├── types/
│   └── index.ts               # All shared TypeScript types (PropertyData, ClassData,
│                              #   OntologyNode, Mapping, MappingGroup, ProjectFile, etc.)
│
└── data/
    ├── sample-ontology.ttl        # Seed NATO C2SIM ontology (Turtle)
    ├── sample-shapes.ttl          # Seed SHACL shapes
    ├── sample-source-a-norwegian.json
    ├── sample-source-b-german.json
    ├── sample-source-c-uk.xml
    ├── C2SIM.rdf, C2SIM_LOX.rdf, C2SIM_SMX.rdf  # Full C2SIM ontology variants
    └── directory-tree.png
```

---

## 4. Architecture Layers

### Layer 1: Presentation (React Components)

- Renders UI; reads from Zustand stores; dispatches store actions
- No direct RDF/N3 manipulation — always through lib utilities
- Canvas (OntologyCanvas) is the only component with complex internal state

### Layer 2: State (Zustand Stores)

Six independent stores, each with a `hydrate()` action for IDB restore:

| Store             | Key State                                                                            | Key Actions                                                       |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `ontologyStore`   | `turtleSource`, `nodes`, `edges`, `parseError`, `isUpdatingFromEditor`               | `setTurtleSource`, `setNodes`, `setEdges`, `hydrate`              |
| `sourcesStore`    | `sources: Record<id, Source>`, `activeSourceId`                                      | `addSource`, `updateSource`, `removeSource`, `hydrate`            |
| `mappingStore`    | `mappings: Record<sourceId, Mapping[]>`, `groups`, `selectedMappingId`, `_undoStack` | `addMapping`, `updateMapping`, `removeMapping`, `hydrate`, `undo` |
| `validationStore` | `results: ViolationRecord[]`, `userShapesTurtle`, `isRunning`                        | `runValidation`, `setUserShapes`, `hydrate`                       |
| `fusionStore`     | `result: FusionResult \| null`, `isRunning`, `isStale`                               | `runFusion`, `markStale`                                          |
| `uiStore`         | `activeRightTab: RightTab`                                                           | `setActiveRightTab`                                               |

### Layer 3: Effects (Hooks)

Connect React lifecycle to stores; handle side effects:

| Hook                    | Mounted in     | Purpose                                                                        |
| ----------------------- | -------------- | ------------------------------------------------------------------------------ |
| `useAutoSave`           | App.tsx        | IDB restore on mount; debounced IDB write on every state change                |
| `useOntologySync`       | App.tsx        | Canvas↔editor two-way sync with guard flags                                    |
| `useSourceSync`         | App.tsx        | Source upload → format detection → schema inference → store                    |
| `useCanvasData`         | OntologyCanvas | Derive React Flow nodes/edges from ontologyStore + sourcesStore + mappingStore |
| `useKeyboardShortcuts`  | App.tsx        | Global keybindings                                                             |
| `useInvalidateMappings` | App.tsx        | Trigger mapping invalidation when ontology properties change                   |

### Layer 4: Utilities (Pure Lib)

Stateless, no React or store imports. Fully testable in isolation.

---

## 5. Data Flow Diagrams

### 5.1 Ontology: Canvas → Editor

```
User drags node or edits property
  → OntologyCanvas.onNodesChange() / onEdgesChange()
  → useOntologySync.onCanvasChange()
  → check isUpdatingFromEditor (abort if true)
  → check hasPendingEdits (show ConfirmDialog if editor has unsaved text)
  → canvasToTurtle(nodes, edges) → Turtle string
  → ontologyStore.setTurtleSource()
  → TurtleEditorPanel re-renders
```

### 5.2 Ontology: Editor → Canvas

```
User types in TurtleEditorPanel
  → debounced onEditorChange()
  → useOntologySync.onEditorChange()
  → parseTurtle(text) → N3 quads
  → set isUpdatingFromEditor = true
  → ontologyStore.setNodes() / setEdges() (derived from quads)
  → OntologyCanvas re-renders
  → set isUpdatingFromEditor = false (after effect)
```

### 5.3 Source Upload → Mapping

```
User uploads file in SourcePanel
  → detectFormat(content, ext) → format
  → if JSON: jsonToSchema(content) → schemaNodes, schemaEdges
  → if XML:  xmlToSchema(content) → schemaNodes, schemaEdges
  → if RDF:  parseOntologyFile(content) → quads
  → sourcesStore.addSource({ id, name, format, uriPrefix, rawContent,
                              schemaNodes, schemaEdges, instanceQuads })
  → useCanvasData derives SourceNodes for canvas
  → User drags handle from SourceNode to ClassNode → MappingEdge created
  → mappingStore.addMapping()
  → subscribeValidationToMappings() marks validation stale
  → subscribeFusionToMappings() marks fusion stale
```

### 5.4 Fusion Pipeline

```
User clicks "Run Fusion"
  → fusionStore.runFusion()
  → executeAllRml(sources, mappingsBySource)
    → generateRml(sources, mappings) → RML Turtle string
    → @comake/rmlmapper-js.parseTurtle() → RDF quads
    → jsonld.fromRDF() → JSON-LD framing
  → fusionStore.result = { quads, jsonLd }
  → OutputPanel renders Turtle + JSON-LD views
  → ValidationPanel re-runs SHACL against quads
```

### 5.5 SHACL Validation

```
subscribeValidationToMappings() listener fires
  → validationStore.runValidation()
  → generateShapesTurtle(ontologyNodes) → auto-shapes
  → merge with userShapesTurtle (if any)
  → validateSource(instanceQuads, shapeStore) → ViolationRecord[]
  → validationStore.results updated
  → ValidationPanel renders violation list
```

### 5.6 IDB Persistence

```
Mount:
  useAutoSave → idb-keyval.get('rosetta-project') → ProjectFile
    → isValidProjectFile() type guard
    → ontologyStore.hydrate(turtleSource, nodePositions)
    → sourcesStore.hydrate(sources, activeSourceId)
    → mappingStore.hydrate(mappings, groups)
    → uiStore.hydrate(activeRightTab)
    → hydratedRef.current = true

On state change (any store):
  subscriber fires → debounce 500ms
    → snapshot all stores into ProjectFile shape
    → idb-keyval.set('rosetta-project', snapshot)
    → uiStore.setSaveStatus('saved' | 'error')
```

---

## 6. Key Type Definitions

```typescript
// Core ontology node on canvas
interface ClassData {
  uri: string;
  label: string;
  prefix: string;
  comment?: string;
  properties: PropertyData[];
  // callback refs (canvas-only, not persisted)
  onCommitEdit?: (nodeId: string, patch: ClassEditPatch) => void;
  onContextMenu?: (nodeId, x, y) => void;
}

interface PropertyData {
  uri: string;
  label: string;
  range: string; // xsd:float or full URI for ObjectProperty
  kind: 'datatype' | 'object';
  dataType?: string; // XSD shorthand for inline editing
}

// A field mapping from source to ontology
interface Mapping {
  id: string;
  sourceId: string;
  sourceClassUri: string;
  sourcePropUri: string;
  targetClassUri: string;
  targetPropUri: string;
  sourceHandle: string; // React Flow handle ID
  targetHandle: string;
  kind:
    | 'direct'
    | 'template'
    | 'constant'
    | 'typecast'
    | 'language'
    | 'formula';
  templatePattern?: string;
  constantValue?: string;
  constantType?: string; // XSD URI
  targetDatatype?: string;
  languageTag?: string;
  formulaExpression?: string;
  groupId?: string;
  groupOrder?: number;
}

// A multi-source mapping group with strategy
type MappingGroup =
  | {
      id;
      strategy: 'concat';
      separator;
      targetClassUri;
      targetPropUri;
      formulaExpression?;
    }
  | {
      id;
      strategy: 'coalesce';
      separator;
      targetClassUri;
      targetPropUri;
      formulaExpression?;
    }
  | {
      id;
      strategy: 'template';
      separator;
      templatePattern;
      targetClassUri;
      targetPropUri;
      formulaExpression?;
    };

// Persisted project bundle
interface ProjectFile {
  version: 1;
  ontology: { turtleSource: string; nodePositions: Record<string, { x; y }> };
  sources: Source[];
  activeSourceId?: string | null;
  mappings: Record<string, Mapping[]>;
  groups?: Record<string, MappingGroup[]>;
  userShapesTurtle?: string;
  activeRightTab?: RightTab;
  timestamp: string;
}
```

---

## 7. Formula Language

Custom expression DSL compiled to RML FnO (Function Ontology).

**Grammar (informal):**

```
expr     := call | fieldRef | literal
call     := IDENT '(' [expr (',' expr)*] ')'
fieldRef := 'source' '.' IDENT
literal  := STRING | NUMBER
```

**Examples:**

- `upper(source.name)` → maps `source.name` field through UPPER function
- `concat(source.first, " ", source.last)` → concatenation
- `substring(source.code, 0, 3)` → substring extraction

**Pipeline:** `tokenize → Parser.parseTop() → Expr AST → validateFormula() → emitFnOPOM()` (to RML) or `evaluate(expr, record)` (to literal value for preview).

---

## 8. RML Generation

`generateRml(sources, mappingsBySource)` produces a complete RML document:

1. For each source, emits a `rml:LogicalSource` with format-specific iterator:
   - JSON: JSONPath iterator inferred from data structure
   - XML: XPath iterator inferred from element hierarchy
   - RDF: uses `rml:RDFSource`

2. For each mapped class in the source, emits a `rr:TriplesMap` with:
   - `rr:subjectMap` with `rr:template` derived from ID field
   - One `rr:predicateObjectMap` per mapping

3. Mapping kind → RML predicate-object map:
   - `direct` → `rml:reference`
   - `template` → `rr:template`
   - `constant` → `rr:constant`
   - `typecast` → `rml:reference` + `rr:datatype`
   - `language` → `rml:reference` + `rr:language`
   - `formula` → FnO `fnml:functionValue` block

---

## 9. Canvas Architecture

`OntologyCanvas` wraps `OntologyCanvasInner` (needs `useReactFlow` context) inside `ReactFlowProvider`.

**Internal state (OntologyCanvasInner):**

- `contextMenu`: background right-click menu state
- `nodeMenu`: node right-click menu state
- `propMenu`: property right-click menu state
- `edgePicker`: edge type picker dialog state
- `groupPrompt`: group assignment dialog state

**Node/Edge type registry:**

```typescript
nodeTypes = { classNode: ClassNode, sourceNode: SourceNode };
edgeTypes = {
  mappingEdge: MappingEdge,
  subclassEdge: SubclassEdge,
  objectPropertyEdge: ObjectPropertyEdge,
};
```

**Handle naming convention:**

- Source node property handles: `prop_{localName}` (output handles on source nodes)
- Target node property handles: `target_prop_{localName}` (input handles on ontology nodes)
- Handles are matched by name in RML generation via `resolveSourceReference()`

---

## 10. Known Technical Debt

| Issue                                   | Location                          | Severity |
| --------------------------------------- | --------------------------------- | -------- |
| IDB hydration race condition            | `useAutoSave.ts:67-77`            | Medium   |
| Undo stack unbounded                    | `mappingStore.ts:95-96`           | Low      |
| Formula validation deferred to export   | `rmlExecute.ts:38-49`             | High     |
| OntologyCanvas god component            | `OntologyCanvas.tsx` (1300 lines) | High     |
| Sync guard can deadlock on async paths  | `useOntologySync.ts:16-26`        | Medium   |
| Property URI matching via label strings | `rml.ts:131-147`                  | Medium   |
| Schema inference blocks UI thread       | `jsonToSchema.ts:51-100`          | High     |
| No CI pipeline                          | —                                 | Medium   |
| No error tracking                       | —                                 | Low      |

---

## 11. Testing

**Unit tests** (`src/__tests__/`, Vitest, jsdom):

- RDF round-trips, SPARQL CONSTRUCT, JSON/XML schema inference
- Formula parser/evaluator, RML generation
- Store actions and hydration logic
- Component rendering (smoke tests)
- Coverage threshold: 70% (branches, functions, lines, statements)

**E2E tests** (`e2e/`, Playwright, Chromium only):

- `fixtures.ts` provides `freshPage` fixture: clears IDB, loads app, dismisses onboarding
- Test files: sources, mappings, output/fusion, edge cases

**Run commands:**

- `npm run test` — Vitest unit tests only
- `npx playwright test` — E2E tests (requires dev server running)
- `npm run build` — TypeScript compile check (catches type errors that Vitest misses)
