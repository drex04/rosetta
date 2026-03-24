# Roadmap

## Phase 1: Scaffolding & Core Setup
**Goal:** Working app shell deployed to Vercel — canvas, panels, routing, design system in place.
**Requirements:** REQ-01 through REQ-08
**Exit criteria:** `npm run dev` serves the app; shadcn/ui components render; React Flow canvas pans/zooms; deploys to Vercel.

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

## Phase 6: Transform & Fuse
**Goal:** Full data fusion pipeline — all sources transformed and merged into unified JSON output.
**Requirements:** REQ-39 through REQ-45
**Exit criteria:** Transform button executes all source CONSTRUCT queries, fuses triples, and exports structured JSON-LD with provenance annotations.

## Phase 7: Onboarding & Polish
**Goal:** Demo-ready product — sample project, guided tour, contextual education, empty states.
**Requirements:** REQ-46 through REQ-56
**Exit criteria:** First-time user gets interactive tour; sample NATO project loads with both sources pre-configured; all panels have empty states; About dialog explains the technology.
