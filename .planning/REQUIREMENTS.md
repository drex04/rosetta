# Requirements

## Phase 1: Scaffolding & Core Setup

REQ-01: Initialize Vite + React 18 + TypeScript project
REQ-02: Install and configure Tailwind CSS
REQ-03: Install and configure shadcn/ui: `npx shadcn@latest init --preset bcivVKZU`
         After init: verify components.json uses Phosphor Icons. If preset specified a different icon library, override:
         `npx shadcn@latest add phosphor-icons`
REQ-04: Set up Zustand store skeleton (ontology, sources, ui slices)
REQ-05: Set up React Flow with basic canvas (pan/zoom, minimap)
REQ-06: Implement app shell: header (logo, About placeholder, Help Tour button), toolbar, source selector stub, right panel tab shell
REQ-07: Configure Vitest for testing
REQ-08: Configure Vite for static export (`npm run build` → `dist/`); verify build succeeds and bundle is self-contained

## Phase 2: RDF Backbone

REQ-09: Integrate N3.js — RDF parse/serialize (Turtle, N-Triples, N-Quads)
REQ-10: Build Turtle code editor panel using CodeMirror 6
REQ-11: Implement bidirectional sync: canvas ↔ Turtle code editor (with isUpdatingFrom* flags)
REQ-12: Implement master ontology export (Turtle primary; JSON-LD + RDF/XML in collapsible section)
REQ-13: Implement ClassNode custom node type (header, URI, expandable property list, handles)
REQ-14: Implement SubclassEdge, ObjectPropertyEdge custom edge types
REQ-15: Implement project file export/import (.onto-mapper.json format)
REQ-16: IndexedDB auto-save via idb-keyval (500ms debounce, status indicator)

## Phase 3: JSON Import (Multi-Source)

REQ-17: Source data model: sources array with id, name, order; active source ID in store
REQ-18: Source selector UI: horizontal pills/tabs above canvas, add/rename/delete, status indicators
REQ-19: SRC tab: CodeMirror JSON editor per source, source name editable at top
REQ-20: JSON → RDFS converter (per-source URI prefixes; object→class, primitive→DatatypeProperty, XSD type inference)
REQ-21: Display active source's generated schema as nodes on left side of canvas (amber color scheme)
REQ-22: Show auto-generated source RDFS as read-only Turtle below JSON editor in SRC tab
REQ-23: Switching sources swaps canvas left-side nodes; each source preserves its own node positions
REQ-24: Store raw JSON per source for later transformation

## Phase 4: Mapping (Per-Source)

REQ-25: Simple mapping edge: drag from active source node → master ontology node
REQ-26: Auto-generate SPARQL CONSTRUCT for simple mappings (1:1, with type coercion for XSD mismatches)
REQ-27: MappingEdge custom edge type (dashed green, single-dash for simple)
REQ-28: Integrate YASGUI for SPARQL CONSTRUCT editor in MAP tab (scoped to active source)
REQ-29: Complex mapping groups: parse CONSTRUCT queries → extract source/target properties → render as MappingGroupEdge (double-dashed + "SPARQL" badge)
REQ-30: Mapping management panel in MAP tab: list all mappings, click to highlight on canvas
REQ-31: Mapping storage: per-source array of { id, type, groupId, sparqlConstruct, edges[] }
REQ-32: Warn state (orange dashed) for edges referencing non-existent properties

## Phase 5: SHACL Validation (All Sources)

REQ-33: Auto-generate SHACL shapes from master ontology (class→NodeShape, property→sh:property, cardinality, datatype, ranges)
REQ-34: Integrate rdf-validate-shacl
REQ-35: Validate pipeline: for each source, run CONSTRUCT queries → merge candidate triples → validate against SHACL shapes
REQ-36: Validation results UI: pass/fail, violations grouped by source, human-readable messages
REQ-37: Per-source status indicators on source selector (✓ mapped+valid, ⚠ errors, ○ unmapped)
REQ-38: Clicking a violation: switch to relevant source, highlight offending nodes/edges on canvas

## Phase 6: Transform, Fuse & RML Export

REQ-39: Integrate Comunica (@comunica/query-sparql) — in-browser SPARQL engine against N3.Store
REQ-40: For each source: execute CONSTRUCT queries → collect output quads
REQ-41: Merge all source output triples into single unified RDF graph (data fusion)
REQ-42: Add source provenance annotations (_source or JSON-LD provenance) per entity
REQ-43: JSON-LD framing: auto-generate frame from master ontology class hierarchy → serialize fused RDF to structured JSON
REQ-44: OUT tab: display fused JSON with source summary ("Fused from: Norwegian Radar (12 tracks), German Radar (8 tracks)")
REQ-45: Download as .json / .jsonld
REQ-46: Expand Mapping.kind to `direct | template | constant | typecast | language | join | sparql`.
         Kind-specific fields: template→templatePattern, constant→constantValue+constantType,
         typecast→targetDatatype (XSD URI), language→languageTag, join→parentSourceId+parentRef+childRef.
         Mapping panel UI shows a type picker when creating/editing a mapping.
REQ-47: Infer `rml:iterator` (JSONPath) from generated JSON schema per source
         (root array → `$[*]`, nested object → `$.parent.children[*]`)
REQ-48: Generate RML Turtle from all non-SPARQL mappings — one `rr:TriplesMap` per source class,
         `rml:logicalSource` with inferred JSONPath iterator, `rr:predicateObjectMap` per mapping.
         Modular generator in `src/lib/rml.ts` (pure functions, no React/store deps, extractable to separate package).
REQ-49: Generate equivalent YARRRML (.yml) from same mapping data, in `src/lib/yarrrml.ts`
         (pure functions, same extractability constraints as rml.ts)
REQ-50: OUT tab: "Download RML (.rml.ttl)" and "Download YARRRML (.yarrrml.yml)" export buttons.
         SPARQL-kind mappings listed with "requires manual conversion" annotation in exported files.

## Phase 7: UI Polish & Bug Fixes

REQ-51: Rename tabs: SRC→INPUT, ONTO→ONTOLOGY, MAP→MAP, OUT→OUTPUT
REQ-52: Make tabs visually distinct — clearer active/inactive styling so they are obviously tabs (not just text labels)
REQ-53: Hide React Flow minimap on mobile (< 640px breakpoint)
REQ-54: OUTPUT tab — remove ontology subtab (duplicate of ONTOLOGY tab); move "Export .ttl" download button to ONTOLOGY tab
REQ-55: Mapping SPARQL snippet must auto-update when mapping options change
         (constant value/datatype, template pattern, typecast target, language tag, join fields).
         Currently the snippet stays stale after edits.
REQ-56: Template mapping type — label which property is prop1 and which is prop2 in the template pattern editor,
         so the user knows which placeholder corresponds to which side of the mapping
REQ-57: Auto-delete mappings when source or ontology schema changes invalidate them
         (a mapped property no longer exists on either side → remove the mapping and its edge)

## Phase 8: Source & Ontology Editing

REQ-58: File upload for source data — file picker button alongside paste textarea (accept .json, .xml)
REQ-59: XML source support — parse XML input alongside JSON
REQ-60: Auto-detect filetype (JSON vs XML) from pasted or uploaded content (inspect first non-whitespace char: `{`/`[` → JSON, `<` → XML)
REQ-61: Auto-generate RDFS schema from XML source data (element→class, attribute→DatatypeProperty, nesting→ObjectProperty, text content→datatype property)
REQ-62: Source .ttl editor — make editable (replace read-only Turtle viewer with full CodeMirror editor, same as ontology editor)
REQ-63: Bidirectional sync: source .ttl editor ↔ source canvas nodes
         (mirror Phase 2 ontology sync pattern with isUpdatingFrom* flags; source URI prefix preserved)
REQ-64: Source node editor — create/delete nodes, add/remove properties, draw/delete edges, define edge types directly on canvas
         (amber color scheme preserved; same interaction patterns as ontology editor)
REQ-65: Reset source schema — button to clear all manual edits and re-run auto-generation from raw source data (JSON or XML)
REQ-66: Ontology node editor enhancements — audit Phase 2 implementation for completeness:
         create nodes, add properties, draw edges, define edge types must all work from canvas (not just .ttl)
REQ-67: Mapping groups — when user draws multiple mapping edges to the same ontology target property,
         auto-detect and prompt to group them. Grouped mappings share a groupId and generate a single
         SPARQL CONSTRUCT with CONCAT/COALESCE/TEMPLATE strategy. Canvas renders grouped edges converging
         near the target with a strategy badge. MAP tab shows groups as expandable rows with reordering,
         strategy picker, and separator/template config. Ungroup via right-click. Existing `join` kind
         (cross-source key join) remains separate and unchanged.

## Phase 9: Bug Fixes & UI/UX Overhaul

REQ-79: Fix source .ttl editing node position jump — editing node name in .ttl must not reset node position on canvas
REQ-80: Fix right-click node context menu — Add Property modal must not overlap/conflict with the context menu
REQ-81: Fix CodeMirror text selection — double-click word select, visible selection highlight, and correct copy behavior
REQ-82: Fix ontology Turtle live-update — adding/renaming nodes via canvas must immediately reflect in the .ttl editor
REQ-83: Fix mapping invalidation — renaming a DatatypeProperty in ontology .ttl must remove stale mappings from MAP tab list
REQ-84: Fix Transform & Fuse — direct mappings must produce correct triple count (not "0 triples from 1 source")
REQ-85: Redesign tab bar (SOURCE, ONTOLOGY, MAP, SHACL, OUTPUT) — clear tab appearance, clear selected state
REQ-86: Rename INPUT tab back to "SOURCE"
REQ-87: Normalize button/spacing across all tabs — use MAP tab as the design template
REQ-88: Source bar redesign — remove amber styling (back to gray), brainstorm discoverability for add-source flow
REQ-89: SOURCE tab layout — resizable RDFS schema pane (drag-to-resize), default expanded at same height as paste pane, compact header rows, clear JSON/XML filetype indication, move "Reset Schema" to RDFS pane bar
REQ-90: Move Validate button from top toolbar into SHACL tab, match button styling to other tabs
REQ-91: Brainstorm and relocate "Saved" status icon to a more visible position
REQ-92: Source chip status indicators — remove ambiguous green checkmark, add clear status indicators near relevant functions
REQ-93: MAP tab — show dataType for each mapped property in mapping selector (e.g. "lat xsd:float → latitude xsd:integer")
REQ-94: Show SPARQL validation errors to user (not just VALID/INCOMPLETE labels)
REQ-95: OUTPUT tab Export subtab — add inline RML and YARRRML previews alongside export buttons

## Phase 10: Canvas Interactions & Panel Integration

REQ-96: Double-click node to inline-edit Name and URI (not browser-native modal)
REQ-97: Replace right-click "Rename" browser modal with inline edit mode on the node itself
REQ-98: Double-click property on a node to inline-edit property name and dataType
REQ-99: Double-click edge (subClassOf, etc.) to change relationship type, with bidirectional .ttl sync
REQ-100: Drawing same-type edge (source→source or ontology→ontology) creates schema relationship — default subClassOf, opens with editable label
REQ-101: Add visible UI elements for creating Source and Ontology nodes (not only context menus — improve discoverability)
REQ-102: Show mapping relationship type label on mapping edges (direct, template, constant, etc.)
REQ-103: Click mapping edge on canvas → auto-open MAP tab with relevant mapping selected
REQ-104: Double-click ontology node → auto-switch right panel to ONTOLOGY tab
REQ-105: Double-click source node → auto-switch right panel to SOURCE tab
REQ-106: Select mapping in MAP tab → highlight corresponding edge on canvas with visible selected state
REQ-107: OUTPUT tab Export subtab — add inline RML and YARRRML previews alongside export buttons

## Phase 11: SHACL Authoring

REQ-108: Add Turtle editor to SHACL tab for user-defined SHACL shape definitions
REQ-109: Create example SHACL shape definition file with constraints for the sample NATO data
REQ-110: Run SHACL validation against user-defined shapes (replace current auto-generated-only approach)

## Phase 12: Onboarding & Demo

REQ-68: Interactive walkthrough tour (react-joyride) — 10 steps covering full workflow; launches on first visit
REQ-69: Sample project bundle: NATO air defense scenario with 2 sources (Nation Alpha + Nation Bravo), pre-built mappings including unit conversions and code translations
REQ-70: "Load Sample Project" on empty state + toolbar
REQ-71: Contextual tooltips (Phosphor info icons + shadcn Tooltip) on all key UI elements
REQ-72: About dialog (shadcn Dialog/Sheet): problem statement, Semantic Web approach, workflow diagram, key concepts glossary, NATO relevance, learn more links
REQ-73: Empty states on all panels (canvas, INPUT, ONTOLOGY, MAP, OUTPUT tabs)
REQ-74: Undo/redo support
REQ-75: SPARQL template library for common mapping patterns (rename, concatenate, restructure, filter, unit convert)
REQ-76: Keyboard shortcuts
REQ-77: Comprehensive error handling and loading states (progress indicator for Comunica queries)
REQ-78: Node palette on right edge of canvas for dragging new class/property nodes onto master ontology
