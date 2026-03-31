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

## Phase 7: Onboarding & Polish

REQ-51: Interactive walkthrough tour (react-joyride) — 10 steps covering full workflow; launches on first visit
REQ-52: Sample project bundle: NATO air defense scenario with 2 sources (Nation Alpha + Nation Bravo), pre-built mappings including unit conversions and code translations
REQ-53: "Load Sample Project" on empty state + toolbar
REQ-54: Contextual tooltips (Phosphor info icons + shadcn Tooltip) on all key UI elements
REQ-55: About dialog (shadcn Dialog/Sheet): problem statement, Semantic Web approach, workflow diagram, key concepts glossary, NATO relevance, learn more links
REQ-56: Empty states on all panels (canvas, SRC, MAP, OUT tabs)
REQ-57: Undo/redo support
REQ-58: SPARQL template library for common mapping patterns (rename, concatenate, restructure, filter, unit convert)
REQ-59: Keyboard shortcuts
REQ-60: Comprehensive error handling and loading states (progress indicator for Comunica queries)
REQ-61: Node palette on right edge of canvas for dragging new class/property nodes onto master ontology
