# Roadmap

## Phase 1: Scaffolding & Core Setup
**Goal:** Working app shell deployable as a static site — canvas, panels, routing, design system in place.
**Requirements:** REQ-01 through REQ-08
**Exit criteria:** `npm run dev` serves the app; shadcn/ui components render; React Flow canvas pans/zooms; `npm run build` produces a deployable static bundle.

## Phase 2: RDF Backbone
**Goal:** Master ontology can be built visually and edited as Turtle — full bidirectional sync.
**Requirements:** REQ-09 through REQ-16
**Exit criteria:** User can drag ClassNodes onto canvas, connect with edges, and see live Turtle output. Edit Turtle → canvas updates. Project saves/loads from IndexedDB and exports to .onto-mapper.json.

## Phase 3: JSON Import (Multi-Source)
**Goal:** Multiple source systems can be loaded; each produces an RDFS schema displayed on the canvas.
**Requirements:** REQ-17 through REQ-24
**Exit criteria:** User can add 2+ sources, paste JSON for each, see auto-generated schema nodes on canvas left side. Switching sources swaps the left-side nodes.

## Phase 4: Mapping (Per-Source)
**Goal:** Full mapping workflow — visual 1:1 edges and SPARQL CONSTRUCT for complex transforms.
**Requirements:** REQ-25 through REQ-32
**Exit criteria:** User can drag mapping edges between source and master nodes; SPARQL editor shows auto-generated queries; complex CONSTRUCT queries render as grouped edges.

## Phase 5: SHACL Validation
**Goal:** Validate all source mappings against master ontology constraints; surface errors per source.
**Requirements:** REQ-33 through REQ-38
**Exit criteria:** Validate button runs SHACL; violations listed per source; clicking a violation navigates to the relevant node.

## Phase 6: Transform, Fuse & RML Export
**Goal:** Full data fusion pipeline — all sources transformed and merged into unified JSON output. Additionally, generate RML/YARRRML export files so users can take browser-designed mappings into production ETL pipelines.
**Requirements:** REQ-39 through REQ-50
**Exit criteria:** Transform button executes all source CONSTRUCT queries, fuses triples, and exports structured JSON-LD with provenance annotations. Mapping type picker supports direct/template/constant/typecast/language/join/sparql kinds. OUT tab offers RML (.rml.ttl) and YARRRML (.yarrrml.yml) downloads; SPARQL-kind mappings annotated as "requires manual conversion" in exports.

## Phase 7: UI Polish & Bug Fixes
**Goal:** Quick wins — fix mapping bugs, rename tabs, clean up OUTPUT tab, improve visual clarity.
**Requirements:** REQ-51 through REQ-57
**Exit criteria:** Tabs read INPUT/ONTOLOGY/MAP/OUTPUT with clear active styling; mapping SPARQL snippets auto-update on option changes; stale mappings auto-deleted on schema change; minimap hidden on mobile; ontology export .ttl button on ONTOLOGY tab.

## Phase 8: Source & Ontology Editing
**Goal:** Full source schema editing — XML support, file upload, editable source .ttl with bidirectional canvas sync, source node editor, full ontology canvas editor, and mapping groups for multi-field combinations.
**Requirements:** REQ-58 through REQ-67
**Exit criteria:** User can upload/paste JSON or XML; source .ttl is editable with live canvas sync; source nodes can be created/deleted/connected on canvas; reset button re-generates schema from raw data; ontology nodes can be created/deleted/connected directly on canvas (context menus + edge drawing); drawing multiple edges to same target auto-groups them with CONCAT/COALESCE/TEMPLATE strategy.

## Phase 9: Bug Fixes & UI/UX Overhaul
**Goal:** Fix critical bugs (node position jumps, CodeMirror selection, mapping invalidation, Transform & Fuse) and redesign panel UI — tab bar, SOURCE tab layout, button normalization, status indicators, SPARQL error display.
**Requirements:** REQ-79 through REQ-95
**Exit criteria:** All 6 bugs fixed and verified; tab bar clearly shows selected state; SOURCE tab has resizable RDFS pane with compact layout; Validate button lives in SHACL tab; MAP tab shows dataTypes; SPARQL errors visible to user; RML/YARRRML previews on OUTPUT tab.

## Phase 10: Canvas Interactions & Panel Integration
**Goal:** Rich inline editing on canvas nodes/edges/properties, bidirectional canvas↔panel navigation, and mapping edge labels.
**Requirements:** REQ-96 through REQ-107
**Exit criteria:** Double-click any node/edge/property to inline-edit; drawing same-type edges creates schema relationships; mapping edges show type labels; clicking canvas elements auto-navigates to relevant panel tab; selecting MAP tab mapping highlights canvas edge.

## Phase 11: RML-Native Transform
**Goal:** Replace the Comunica/SPARQL-CONSTRUCT execution path with RMLmapper-js, which runs generated RML directly against raw JSON/XML source data. Remove the `join` mapping kind. Replace the SPARQL snippet display in the MAP panel with an RML snippet for all non-custom-sparql mapping kinds.
**Requirements:** REQ-111 through REQ-115
**Exit criteria:** Transform & Fuse runs via RMLmapper-js; `join` kind removed from UI and types; MAP panel shows RML snippet for direct/template/constant/typecast/language kinds; `sparql` kind still shows a SPARQL CodeMirror editor; XML sources use `ql:XPath`; `fusion.ts` deleted; `@comake/rmlmapper-js` installed.

## Phase 12: SHACL Authoring
**Goal:** User-authored SHACL shapes with a Turtle editor, example shapes for sample data, and validation against custom shapes.
**Requirements:** REQ-108 through REQ-110
**Exit criteria:** SHACL tab has a Turtle editor for shape definitions; example shapes load with sample project; validation runs against user-defined shapes and surfaces results.

## Phase 14: UI Polish III
**Goal:** Mobile status bar fix, scroll containers for violations and fused JSON-LD, unified source chip hover, flattened Source Data pane, multi-format ontology upload on BUILD tab, and labeled download buttons.
**Requirements:** (housekeeping — no new REQ IDs)
**Exit criteria:** StatusBar visible on mobile; violations and fused JSON-LD scroll; source chips have unified hover; LOAD tab Source Data is flat; BUILD tab accepts .ttl/.rdf/.jsonld uploads; FUSE/EXPORT download buttons have text labels.

## Phase 13: Onboarding & Demo
**Goal:** Demo-ready product — sample project, guided tour, contextual education, empty states.
**Requirements:** REQ-68 through REQ-78
**Exit criteria:** First-time user gets interactive tour; sample NATO project loads with both sources pre-configured; all panels have empty states; About dialog explains the technology.
