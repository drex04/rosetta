# Rosetta — Product Requirements Document (v1 Reverse-Engineered)

> **Purpose:** This document describes what Rosetta v1 actually is — its goals, users, features, and behavior — as-built. It is intended to give a Claude Opus planning instance complete product context for designing Rosetta v2.

---

## 1. Product Overview

**Rosetta** is a client-side, browser-only web application for learning and applying Semantic Web technologies (OWL/RDF/SPARQL/SHACL) in the context of NATO defense data interoperability. There is no backend, no login, and no server — the entire application runs in the browser using IndexedDB for persistence.

**Core metaphor:** You have heterogeneous source data (JSON, XML, RDF) from multiple NATO member systems (e.g. Norwegian, German, UK national C2 formats). You have a shared ontology (e.g. C2SIM — Command and Control Systems Interoperability). Rosetta lets you visually map fields from each source system to the shared ontology, then generate and execute the RML mapping rules that produce a fused, interoperable RDF graph.

**Primary audience:** Defense data architects and developers learning Semantic Web interoperability techniques. Also educators teaching RDF/SHACL/RML.

---

## 2. User Goals

| Goal                                     | How Rosetta addresses it                                           |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Understand a shared ontology visually    | Interactive canvas shows OWL classes and properties as nodes/edges |
| Import real-world source data            | Upload JSON, XML, or RDF files; schema is inferred automatically   |
| Map source fields to ontology properties | Draw connections on canvas or use mapping panel UI                 |
| Express non-trivial transformations      | Formula engine, templates, constants, typecasts, language tags     |
| Validate data against SHACL shapes       | Auto-generated or user-supplied shapes; run against fused output   |
| Export mappings for production use       | Download RML (Turtle) or YARRRML; execute in-browser for preview   |
| Save and resume work                     | Auto-save to IndexedDB; export/import as JSON project bundle       |
| Learn via worked example                 | Load a pre-built NATO air defense scenario with 3 source systems   |

---

## 3. Layout & Navigation

### 3.1 Overall Layout

```
┌─────────────────────────────────────────────────────┐
│  Header (toolbar)                                   │
├──────────────────────────────┬──────────────────────┤
│                              │  Right Panel         │
│  Ontology Canvas             │  [SOURCE|ONTOLOGY|   │
│  (React Flow)                │   MAP|OUTPUT|VALIDATE│
│                              │  ]                   │
└──────────────────────────────┴──────────────────────┘
│  Status Bar                                         │
└─────────────────────────────────────────────────────┘
```

- Uses `h-dvh` for iOS Safari compatibility.
- Right panel has three modes: **collapsed strip** (`w-10`), **mobile full-width overlay** (z-20), **desktop resizable** (drag handle, `shrink-0`).
- Breakpoint: `window.innerWidth < 640` toggles mobile overlay mode.

### 3.2 Header (Toolbar)

- **File menu:** New Project, Load Example, Export Project (`.rosetta.json`), Import Project
- **Source selector:** Dropdown to switch active source
- **Keyboard shortcuts:** Undo/redo, layout, fit view

### 3.3 Right Panel Tabs

| Tab      | Panel             | Purpose                                  |
| -------- | ----------------- | ---------------------------------------- |
| SOURCE   | SourcePanel       | Upload & inspect source data             |
| ONTOLOGY | TurtleEditorPanel | Edit ontology as Turtle text             |
| MAP      | MappingPanel      | Create and configure field mappings      |
| OUTPUT   | OutputPanel       | Export RML/YARRRML, preview fused output |
| VALIDATE | ValidationPanel   | Run SHACL validation, import/edit shapes |

### 3.4 Status Bar

Displays auto-save status: `idle | saving | saved | error`.

---

## 4. Features

### 4.1 Ontology Canvas

The main canvas is built on **React Flow** and is the central workspace.

**Node types:**

- **ClassNode (blue):** Represents an OWL class from the master ontology. Displays class label, URI prefix, and a list of data/object properties. Supports inline editing of class name, property names, and datatypes via double-click.
- **SourceNode (amber):** Represents a class/entity from a loaded source system. Same visual structure but amber-colored.

**Edge types:**

- **SubclassEdge:** `rdfs:subClassOf` relationship — dashed gray.
- **ObjectPropertyEdge:** `owl:ObjectProperty` between two ontology classes — solid labeled arrow.
- **MappingEdge (dashed green):** Visual link from a source node property to an ontology class property. Created by drag-connecting handles.

**Canvas interactions:**

- Drag to pan, scroll to zoom, select and move nodes
- Right-click node → context menu: rename, add property, delete class
- Right-click property → context menu: rename, change datatype, delete property
- Right-click edge → context menu: change edge type (subclass vs. object property)
- Draw edge by dragging from a property handle to another handle
- Edge type picker dialog when ambiguous edge target
- Group prompt when connecting mappings to grouped properties
- Minimap, background grid
- Fit-view keyboard shortcut
- Auto-layout button (re-runs hierarchical layout algorithm)

**Canvas ↔ Editor sync:**

- Changes on canvas → serialize to Turtle → update editor
- Changes in Turtle editor → parse → re-render canvas
- Circular update guard: `isUpdatingFromEditor` flag; conflict shows confirm dialog

### 4.2 Source Panel

- **File upload:** Accepts `.json`, `.xml`, `.ttl`, `.rdf`, `.n3`, `.jsonld`
- **Format auto-detection** via `detectFormat.ts` (content sniffing + extension hints)
- **Schema inference:**
  - JSON → walks object tree, infers properties and types, generates RDF schema nodes
  - XML → walks element tree, infers iterator and properties
  - RDF formats → parsed directly via N3.js
- **Source naming:** User sets a name; a URI prefix is derived (slugified, unique per source)
- **Inline editor:** CodeMirror 6 editor shows raw source content (read-only reference)
- **Multiple sources:** Each source is independent; active source is selected in header dropdown
- **Warning banners:** Prefix collision detection, parse errors, unsupported format

### 4.3 Turtle Editor Panel (Ontology tab)

- **CodeMirror 6** editor with Turtle syntax highlighting
- Upload `.ttl` / `.rdf` / `.n3` / `.jsonld` / `.owl` to replace ontology
- Download current ontology as `.ttl`
- Parse errors displayed inline as alert banners
- Bidirectional sync with canvas (changes propagate both directions)

### 4.4 Mapping Panel

Each **Mapping** links one source property to one ontology property. Mappings are stored per source.

**Mapping kinds:**

| Kind       | Description                                      |
| ---------- | ------------------------------------------------ |
| `direct`   | Field value used verbatim                        |
| `template` | String template with `{field}` placeholders      |
| `constant` | Hard-coded literal value with optional XSD type  |
| `typecast` | Cast source value to a target XSD datatype       |
| `language` | Tag literal with a BCP-47 language tag           |
| `formula`  | Expression using a custom formula DSL (see §4.5) |

**Mapping groups:** Multiple mappings targeting the same ontology property can be grouped with a strategy:

- `concat` — join values with a separator
- `coalesce` — use first non-null value
- `template` — apply a template across the group

Groups can also carry a `formulaExpression`.

**UI interactions:**

- Click a MappingEdge on canvas to select and open in panel
- Accordion list of all mappings for the active source
- Delete mapping (with confirmation)
- Reorder group members up/down
- Edit kind, template pattern, constant value, datatype, language tag, formula expression
- Validation status badge per mapping (valid / warning / error from SHACL)

### 4.5 Formula Engine

A custom expression language for field transformations.

**AST nodes:** `call`, `fieldRef` (e.g. `source.trackId`), `literal` (string/number)

**Built-in functions:** `concat`, `upper`, `lower`, `replace`, `substring`, `trim`, `coalesce`, `if`, and others (extensible)

**Formula bar:** Inline text input in MappingPanel with real-time parse feedback

**Two-tier editing:**

- **Form tier:** GUI dropdowns/inputs for simple function + arguments
- **Formula tier:** Raw expression text for complex compositions

Formulas compile to **RML FnO (Function Ontology)** predicateObjectMaps in the generated RML. The AST evaluator also supports direct in-browser evaluation for fusion preview.

### 4.6 Output Panel

Five sub-views accessible via internal tabs:

| Sub-view            | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| **RML**             | Full RML Turtle document for all mappings across all sources           |
| **YARRRML**         | YAML-flavored RML shorthand (human-friendly alternative)               |
| **Fused (RDF)**     | In-browser RML execution result as Turtle (via `@comake/rmlmapper-js`) |
| **Fused (JSON-LD)** | Same result framed as JSON-LD (via `jsonld.js`)                        |
| **SPARQL**          | In-browser SPARQL query editor (YASGUI) against the fused graph        |

**Export buttons:** Download RML as `.ttl`, YARRRML as `.yaml`, fused RDF as `.ttl`, fused JSON-LD as `.json`.

**Fusion execution:** Triggered manually ("Run Fusion" button). Result is stale-marked when mappings change and must be re-run.

### 4.7 Validation Panel

- **Auto-generated SHACL shapes** from the current ontology (node shapes per class, property shapes per data property)
- **User-supplied shapes:** Import custom `.ttl` SHACL file; edit in CodeMirror
- **Validation targets:** Fused RDF output (post-fusion)
- **Results display:** Per-violation list with severity (Violation/Warning/Info), target node, property path, constraint component, and message
- **Reactive:** Validation re-runs automatically when mappings change (via `subscribeValidationToMappings`)

### 4.8 Project Management

- **New Project:** Resets all stores, loads seed ontology
- **Load Example:** Loads NATO air defense scenario (Norwegian JSON + German JSON + UK XML sources mapped to C2SIM ontology)
- **Export Project:** Serializes all state to a `.rosetta.json` bundle (version 1 schema)
- **Import Project:** Loads a `.rosetta.json` bundle, fully restores all state
- **Auto-save:** Debounced (500ms) writes to IndexedDB on every state change; restored on next page load
- **Project bundle schema (v1):**
  ```
  { version, ontology: { turtleSource, nodePositions },
    sources[], activeSourceId, mappings{}, groups{},
    userShapesTurtle, activeRightTab, timestamp }
  ```

### 4.9 Onboarding

- **About dialog:** Shown on first visit (localStorage flag); can be reopened from header
- **Product tour:** `react-joyride` guided walkthrough of canvas, panels, and key interactions
- Tour steps defined in `tourSteps.ts`; uses `skipBeacon: true` per step (v3 API)

### 4.10 Keyboard Shortcuts

Managed by `useKeyboardShortcuts` hook:

- Undo/redo mapping deletions
- Fit canvas to view
- Trigger auto-layout
- Open/close right panel

---

## 5. Data Model

### Ontology

- Stored as **Turtle text** (`turtleSource`) — the source of truth
- Parsed into N3.Store by `parseTurtle()` in `src/lib/rdf.ts`
- Represented as React Flow nodes/edges on canvas (derived, not source of truth)
- Canvas node positions stored separately in `nodePositions` record

### Sources

Each source has:

- `id`, `name`, `format` (`json | xml | turtle | rdf | n3 | jsonld`)
- `uriPrefix` — unique RDF namespace for this source's instances
- `rawContent` — original file text
- `schemaNodes` — inferred or parsed RDF class/property nodes
- `schemaEdges` — inferred edges between schema nodes
- `instanceQuads` — parsed RDF quads for actual data records (N3.Store)

### Mappings

Per-source array of `Mapping` objects (see §4.4 for fields). Stored as `Record<sourceId, Mapping[]>` in mappingStore.

### Fusion Result

`{ quads: Quad[], jsonLd?: object }` — transient, not persisted to IDB.

---

## 6. Example Project (NATO Air Defense Scenario)

Pre-loaded via "Load Example" menu option:

| Source    | Format | Contents                                   |
| --------- | ------ | ------------------------------------------ |
| Norwegian | JSON   | Air track data (Norwegian national format) |
| German    | JSON   | Air track data (German national format)    |
| UK        | XML    | Air track data (UK national format)        |

All three sources are mapped to the **C2SIM** ontology (Command and Control Systems Interoperability). The example demonstrates multi-source fusion, cross-format heterogeneity, and ontology alignment.

Additional C2SIM ontology extensions bundled: `C2SIM_LOX.rdf`, `C2SIM_SMX.rdf`.

---

## 7. Non-Functional Requirements (as-built)

| Concern           | Current state                                                          |
| ----------------- | ---------------------------------------------------------------------- |
| **Performance**   | Schema inference and SPARQL are synchronous; freezes UI on files >10MB |
| **Persistence**   | Full IDB auto-save; export/import for portability                      |
| **Security**      | No eval; formula parser is a hand-rolled recursive descent AST         |
| **Accessibility** | Keyboard shortcuts; Radix UI primitives; ARIA not deeply audited       |
| **Offline**       | Fully offline; no network requests at runtime                          |
| **Testing**       | Vitest unit tests (70% threshold) + Playwright E2E; CI not configured  |
| **Deployment**    | Static hosting; no server required                                     |

---

## 8. Known Gaps & Limitations (v1)

1. **Formula validation is deferred to export** — no real-time feedback in editor
2. **Synchronous schema inference blocks UI thread** on large files (no Web Worker)
3. **No undo/redo for ontology edits** — only mapping deletions are undoable
4. **Undo stack unbounded** — accumulates indefinitely, no GC
5. **No CI/CD pipeline** — tests must be run manually
6. **No error tracking or analytics** — console + toasts only
7. **Canvas is a 1100+ line god component** — hard to extend safely
8. **SPARQL editor** (YASGUI) is present but basic — no result export, no query history
9. **No collaboration** — single-user, single-browser
10. **No versioning** of ontology or mappings — point-in-time snapshots only
