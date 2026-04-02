# Ontology Mapper — Project Plan

## Overview

A fully client-side web application for learning Semantic Web technologies in the context of **defense systems interoperability**. The tool demonstrates how ontology mapping can solve a core NATO challenge: integrating data from air defense systems contributed by different nations, each with its own schema describing the same operational reality (radar tracks, threat assessments, asset status).

Users can visually build OWL/RDF ontologies, import JSON schemas from heterogeneous systems, map between schemas using a node-based UI, validate with SHACL, and transform data — all in the browser.

---

## Core Workflow

### Step 1: Define Master Ontology

The user builds their "target" ontology using a visual node-based editor.

- **Nodes** represent OWL/RDFS classes (e.g., `AirTrack`, `Position`, `RadarSystem`).
- **Edges** represent relationships: `rdfs:subClassOf`, `owl:ObjectProperty` (links between classes), and `owl:DatatypeProperty` (leaf attributes with XSD types like `xsd:string`, `xsd:integer`, `xsd:dateTime`).
- Each node is expandable to show/edit its datatype properties inline.
- A **code editor panel** shows the live Turtle serialization of the ontology. Edits in the code editor are parsed and reflected back in the visual editor (bidirectional sync).
- Users can set property constraints: cardinality (`owl:minCardinality`, `owl:maxCardinality`), required vs. optional, value ranges.

**Serialization format:** Turtle (`.ttl`) is the primary authoring format — it's human-readable and the most common in practice. The app should also support export to JSON-LD and RDF/XML.

### Step 2: Import Source JSON(s)

The user can add **multiple sources**, each representing a different system (e.g., a Norwegian radar, a German radar, a British command system). Each source has a user-defined name and its own JSON input.

**Adding sources:**

- Click "Add Source" in the toolbar or source selector. A new source is created with a default name ("Source 1", "Source 2", etc.).
- The user can **rename** each source to something meaningful (e.g., "Norwegian Radar", "German Radar").
- Each source has its own JSON input, auto-generated RDFS schema, and set of mappings to the master ontology.
- Sources can be deleted (with confirmation if mappings exist).

**Per-source behavior:**
The user pastes JSON into the active source's JSON input panel (a full-height code editor with JSON syntax highlighting). The app parses it and auto-generates an RDFS schema from its structure. Each source gets a unique URI prefix (e.g., `http://example.org/source-norwegian-radar#`, derived from the source name).

**JSON → RDFS conversion logic:**

1. **Objects** → `rdfs:Class`. Nested objects create new classes with `owl:ObjectProperty` linking parent to child.
2. **Arrays of objects** → `owl:ObjectProperty` with the array item type as range, plus an implicit cardinality of 0..\*.
3. **Primitive values** → `owl:DatatypeProperty` with inferred XSD types:
   - `string` → `xsd:string`
   - `number` (integer) → `xsd:integer`
   - `number` (float) → `xsd:decimal`
   - `boolean` → `xsd:boolean`
   - ISO 8601 date strings → `xsd:dateTime`
   - `null` → property exists but range is `xsd:anySimpleType`
4. **Arrays of primitives** → `owl:DatatypeProperty` with cardinality 0..\*.
5. **Class naming:** derived from JSON keys, converted to PascalCase. Properties use camelCase. A configurable base URI prefix (e.g., `http://example.org/source#`) is applied.

The generated schema appears as nodes on the **left side** of the React Flow canvas (only the active source is shown at a time — see UI Layout). The user can rearrange nodes but not structurally edit the source schema (it's derived from the data).

### Step 3: Create Mappings (Visual + SPARQL)

The user maps the **active source's** schema elements to master ontology elements by drawing edges between the two graphs. Each source has its own independent set of mappings.

**Simple mappings (visual drag-and-drop):**

- **1:1 property alignment:** draw an edge from a source property node to a target property node. Generates a SPARQL CONSTRUCT pattern: `CONSTRUCT { ?s target:prop ?val } WHERE { ?s source:prop ?val }`.
- **Class alignment:** draw an edge from a source class to a target class. Generates `CONSTRUCT { ?s a target:Class } WHERE { ?s a source:Class }`.
- **Type coercion:** if source is `xsd:string` and target is `xsd:integer`, the mapping auto-inserts an XSD cast function in the SPARQL.
- Mapping edges are visually distinct (dashed, different color) from ontology edges.

**Complex mappings (SPARQL CONSTRUCT editor):**

For transformations that can't be expressed as simple 1:1 alignments:

- **Concatenation:** combining `firstName` + `lastName` → `fullName`.
- **Restructuring:** flattening nested objects or nesting flat properties.
- **Conditional mapping:** `IF source:status = "active" THEN target:isActive = true`.
- **Computed values:** string manipulation, arithmetic, URI construction.

The user opens a SPARQL CONSTRUCT editor panel (powered by YASGUI) to write these queries. The app provides:

- Autocompletion of prefixes, class names, and property names from both ontologies.
- A template library for common patterns (rename, concatenate, restructure, filter).
- Live preview: execute the CONSTRUCT against sample data and show the result triples.

**Complex mappings are also shown as visual edges.** A single SPARQL CONSTRUCT query may reference multiple source and target properties, so complex mappings are rendered as a **mapping group**: a set of edges sharing the same color/label and a group ID. Clicking any edge in the group selects the entire group and opens the SPARQL CONSTRUCT editor for that mapping. Mapping groups are visually distinguished from simple mappings by a double-dashed line style and a small badge showing "SPARQL" on the edge label.

When a user writes or edits a SPARQL CONSTRUCT query, the app parses the query to extract the source and target properties referenced in the WHERE and CONSTRUCT clauses, and auto-generates the corresponding visual edges on the canvas. If the query references properties that don't exist in either schema, the edges are shown in a warning state (orange dashed).

**Mapping storage:** All mappings (simple + SPARQL) are collected into a **Mapping Definition** — internally stored as a set of SPARQL CONSTRUCT queries. Simple visual mappings are just auto-generated CONSTRUCT queries. This means the entire transformation pipeline is uniform: a list of SPARQL CONSTRUCT queries.

### Step 4: Validate with SHACL

Before transformation, the app validates that the mapping output from **all sources** will conform to the master ontology's constraints.

**Validation process:**

1. For **each source**, run its SPARQL CONSTRUCT queries against that source's RDF data to produce candidate output triples.
2. Merge all candidate triples from all sources into a single graph.
3. Auto-generate SHACL shapes from the master ontology:
   - Each class → a `sh:NodeShape` with `sh:targetClass`.
   - Required properties → `sh:minCount 1`.
   - Cardinality constraints → `sh:minCount` / `sh:maxCount`.
   - Datatype constraints → `sh:datatype`.
   - Object property ranges → `sh:class`.
4. Run SHACL validation on the candidate output.
5. Display results:
   - **Pass:** green checkmarks, proceed to transform.
   - **Fail:** list violations with human-readable messages, **grouped by source**. Each violation indicates which source produced the offending data. Highlight the relevant nodes/edges in the visual editor (switching to the relevant source's canvas view). Each violation links back to the specific SHACL constraint and the offending triple.
   - **Per-source status:** show a summary indicator for each source (e.g., "Norwegian Radar: 0 errors", "German Radar: 3 errors") so the user knows which sources need attention.

### Step 5: Transform & Export (Data Fusion)

Once validation passes for all sources:

1. For **each source**, execute its SPARQL CONSTRUCT queries against that source's RDF dataset (via Comunica).
2. **Merge** all resulting triples from all sources into a single unified RDF graph. This is the data fusion step — tracks from Norwegian, German, and any other radar systems now coexist in a single graph conforming to the master ontology.
3. Apply **JSON-LD framing** to serialize the fused RDF back into structured JSON:
   - The frame is derived from the master ontology's class hierarchy.
   - Nested objects follow `owl:ObjectProperty` relationships.
   - Arrays are used where cardinality allows multiple values.
   - The `@context` maps property URIs back to clean JSON keys.
4. Display the output JSON in a formatted code viewer. The fused output contains data from all sources, unified under the master ontology's schema. Each entity retains a `_source` annotation (or equivalent JSON-LD provenance) indicating which source it originated from (e.g., "Norwegian Radar", "German Radar").
5. Offer download as `.json` (JSON-LD) or `.jsonld`.

---

## Technology Stack

### UI Framework

- **React 18** with TypeScript
- **Vite** for build tooling
- **shadcn/ui** as the design system — provides accessible, composable primitives (Dialog, Sheet, Tabs, Button, Tooltip, Command, etc.) built on Radix UI. Styled with Tailwind CSS.
- **Tailwind CSS** — used by shadcn/ui; also use for all custom layout and styling.
- **Zustand** for state management — lightweight, no boilerplate, works well with React Flow

### Node-Based Visual Editor

- **React Flow** (`@xyflow/react` v12) — the node/edge canvas for ontology editing and mapping
  - Custom node types: `ClassNode`, `PropertyNode`, `MappingEdge`, etc.
  - Multiple groups/layers: master ontology nodes, source schema nodes, mapping edges
  - Minimap for navigation

### RDF/OWL Processing

- **N3.js** (`n3`) — fast RDF parsing and serialization (Turtle, N-Triples, N-Quads, TriG). Use as the primary RDF store and parser.
- **jsonld** (`jsonld`) — JSON-LD processing: compact, expand, frame, toRDF, fromRDF. Essential for Step 2 (JSON → RDF) and Step 5 (RDF → JSON).
- **Comunica** (`@comunica/query-sparql`) — browser-based SPARQL query engine. Executes CONSTRUCT queries against in-memory RDF graphs. This is the transformation engine.
- **rdf-validate-shacl** — SHACL validation in JS. Runs SHACL shapes against an RDF graph and returns a validation report.

### Code Editors

- **CodeMirror 6** (`@codemirror/view`, etc.) — for the Turtle/RDF code editor panel. Use a custom Turtle grammar or the generic syntax highlighting mode.
- **YASGUI** (`@triply/yasgui`) — for the SPARQL query editor. Provides syntax highlighting, autocompletion, and prefix management out of the box.

### Persistence (see section below)

- **idb-keyval** — minimal IndexedDB wrapper for browser persistence.
- Export/import as a single `.onto-mapper.json` project file.

### Onboarding

- **react-joyride** — interactive step-by-step tooltip tour. Mature, customizable, supports shadcn-compatible styling via custom tooltip components.

---

## Persistence & Portability

### In-Browser Persistence

Use **IndexedDB** (via `idb-keyval`) to persist all project state automatically. IndexedDB is chosen over localStorage because it handles large data (RDF graphs can be sizeable), is async (won't block the UI), and supports structured data.

**Stored data:**

| Key                            | Content                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `project:meta`                 | Project name, description, creation date, last modified                                                                               |
| `project:master-ontology`      | Turtle serialization of the master ontology                                                                                           |
| `project:sources`              | Array of source metadata: `[{ id, name, order }]`                                                                                     |
| `project:source:<id>:json`     | The raw JSON pasted by the user for this source                                                                                       |
| `project:source:<id>:schema`   | Turtle serialization of the auto-generated source schema                                                                              |
| `project:source:<id>:mappings` | Array of mapping definitions for this source (each with SPARQL CONSTRUCT query + visual edge metadata + groupId for complex mappings) |
| `project:source:<id>:layout`   | React Flow node positions for this source's schema nodes                                                                              |
| `project:shacl-shapes`         | Generated SHACL shapes (Turtle)                                                                                                       |
| `project:master-layout`        | React Flow node positions for the master ontology + viewport                                                                          |
| `project:active-source`        | ID of the currently selected source                                                                                                   |

**Auto-save:** Debounced save on every state change (500ms debounce). A small status indicator shows "Saved" / "Saving..." in the UI.

### Download / Upload (Project Portability)

**Export format:** A single JSON file with `.onto-mapper.json` extension:

```json
{
  "version": "1.0",
  "exportedAt": "2026-03-24T12:00:00Z",
  "project": {
    "name": "NATO Air Defense Integration",
    "description": "Fuses radar track data from Norwegian and German systems"
  },
  "masterOntology": "<turtle string>",
  "sources": [
    {
      "id": "src-1",
      "name": "Norwegian Radar",
      "sourceJson": { "radarTracks": [ ... ] },
      "sourceSchema": "<turtle string>",
      "mappings": [
        {
          "id": "map-1",
          "type": "simple",
          "groupId": null,
          "sourceNode": "nor:trkNo",
          "targetNode": "master:trackId",
          "sparqlConstruct": "CONSTRUCT { ?s master:trackId ?v } WHERE { ?s nor:trkNo ?v }",
          "edges": [{ "sourceHandle": "...", "targetHandle": "..." }]
        },
        {
          "id": "map-2",
          "type": "complex",
          "groupId": "group-1",
          "sparqlConstruct": "CONSTRUCT { ?s master:altitude_meters ?alt } WHERE { ?s nor:alt_ft ?ft . BIND(?ft * 0.3048 AS ?alt) }",
          "edges": [
            { "sourceHandle": "nor:alt_ft", "targetHandle": "master:altitude_meters" }
          ]
        }
      ],
      "layout": {
        "nodes": [ { "id": "...", "position": { "x": 0, "y": 0 } } ]
      }
    },
    {
      "id": "src-2",
      "name": "German Radar",
      "sourceJson": { "erkannte_ziele": [ ... ] },
      "sourceSchema": "<turtle string>",
      "mappings": [ ... ],
      "layout": { "nodes": [ ... ] }
    }
  ],
  "shaclShapes": "<turtle string>",
  "masterLayout": {
    "nodes": [ { "id": "...", "position": { "x": 0, "y": 0 } } ],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "activeSourceId": "src-1"
}
```

**Export:** serialize current state → create Blob → trigger browser download.

**Import:** file picker accepts `.onto-mapper.json` → parse → validate schema version → hydrate all state → update IndexedDB.

This gives full portability across browsers and machines without any backend.

### Multi-Project Support (optional enhancement)

IndexedDB keys can be namespaced by project ID (`project:<id>:master-ontology`) to support multiple saved projects. A project picker screen would list saved projects and allow creating/deleting/switching.

---

## UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header: [Logo + App Name]  [About]  [Help Tour]                │
├──────────────────────────────────────────────────────────────────┤
│  Toolbar: [New] [Import Project] [Export Project] [Add Source]   │
│           [Validate All] [Transform & Fuse]                      │
├────────────────────────────────┬─────────────────────────────────┤
│  Source Selector:              │                                 │
│  [▼ Norwegian Radar ✓] [+]    │   Right Panel (tabbed):         │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │   ┌───┬──────┬───┬───┐         │
│                                │   │SRC│MASTER│MAP│OUT│         │
│   React Flow Canvas            │   ├───┴──────┴───┴───┤         │
│                                │   │                    │        │
│   ┌─────────┐    ┌─────────┐  │   │  Code Editor       │        │
│   │ Active   │    │ Master  │  │   │  (CodeMirror       │        │
│   │ Source   │<-->│ Ontology│  │   │   or YASGUI)       │        │
│   │ (amber)  │    │ (blue)  │  │   │                    │        │
│   └─────────┘    └─────────┘  │   │                    │        │
│                                │   │                    │        │
│   Mapping edges (dashed green) │   │                    │        │
│   for active source only       │   └────────────────────┘        │
├────────────────────────────────┴─────────────────────────────────┤
│  Status Bar: [Auto-saved ✓] [Sources: 2/2 mapped] [Triples: 284]        │
└──────────────────────────────────────────────────────────────────┘
```

**Header:**

- App name/logo on the left.
- "About" link (opens About page/dialog explaining ontology mapping and the tool's purpose).
- "Help Tour" button (re-launches the interactive walkthrough).

**Source Selector (above the canvas):**

- A dropdown or horizontal pill/tab bar listing all sources by name.
- Each source shows a status indicator: ✓ (mapped & valid), ⚠ (has mappings but validation errors), ○ (no mappings yet).
- The active source is highlighted. Switching sources updates both the canvas (left side) and the SRC/MAP tabs in the right panel.
- A "+" button to add a new source. Right-click or kebab menu on each source for rename/delete.
- Source names are editable inline (double-click to rename).

**Right panel tabs (left to right):**

- **SRC** — Source JSON input panel **for the active source**. Shows the source name at the top (editable). Paste JSON here; also shows the auto-generated source RDFS schema as read-only Turtle below the JSON.
- **MASTER** — Turtle editor for master ontology (bidirectional sync with canvas). Below the editable Turtle editor, a read-only collapsible section shows the ontology serialized as JSON-LD and RDF/XML (toggle between formats via a dropdown). This tab is independent of which source is active — the master ontology is shared.
- **MAP** — SPARQL CONSTRUCT editor (YASGUI) **scoped to the active source**. Lists all mappings for this source (simple + complex) with their SPARQL. Clicking a mapping highlights its edges on the canvas. A summary header shows "Mappings for: Norwegian Radar" to make the scoping clear.
- **OUT** — **Fused** transformed JSON output from **all sources** + download button. Shows a summary of which sources contributed data (e.g., "Fused from: Norwegian Radar (12 tracks), German Radar (8 tracks)").

**Canvas layout:**

- Active source's schema nodes on the **left** (amber/orange color scheme). Only the currently selected source's nodes are visible.
- Master ontology nodes on the **right** (blue/indigo color scheme). Always visible regardless of which source is selected.
- Mapping edges rendered as dashed green lines between the active source and the master ontology. Simple mappings use single dashed lines; complex mapping groups use double-dashed lines with a "SPARQL" badge. Only the active source's mappings are shown.
- Minimap in the bottom-right corner.
- A collapsible **node palette** on the right edge for dragging new class/property nodes onto the master ontology.

---

## React Flow Node & Edge Types

### Custom Nodes

**ClassNode:**

- Header with class name (editable).
- URI shown in smaller text below.
- Expandable body listing datatype properties (name, XSD type, cardinality).
- Color-coded border: blue for master ontology, amber for source schema.
- Source and target handles on all four sides for flexible edge routing.
- "Add property" button (master ontology only).

**LiteralNode (optional):**

- Small node representing a standalone datatype property not yet attached to a class.
- Used during ontology construction before the user assigns it.

### Custom Edges

**SubclassEdge:** solid line with hollow triangle arrowhead (UML-style inheritance).
**ObjectPropertyEdge:** solid line with filled arrowhead, labeled with property name.
**MappingEdge:** dashed line, green, labeled with mapping type ("1:1", "SPARQL", etc.). Clicking opens the mapping detail in the right panel.
**MappingGroupEdge:** double-dashed line, green, with a "SPARQL" badge. Belongs to a mapping group (shared `groupId`). Clicking any edge in the group selects all edges in the group and opens the SPARQL CONSTRUCT editor for that mapping. Multiple edges in a group are rendered with a subtle shared background highlight when selected.

---

## JSON → RDFS Conversion (Detail)

Given this example radar track output from Nation Alpha's system:

```json
{
  "radarTracks": [
    {
      "trkNo": "A-0042",
      "lat": 59.9139,
      "lon": 10.7522,
      "alt_ft": 32000,
      "spd_kts": 450,
      "hdg": 270,
      "iff": "FRI",
      "iff_conf": 0.95,
      "sensor": "NORSE-3D",
      "country": "NOR",
      "time": "2026-03-24T14:23:00Z"
    }
  ]
}
```

The converter generates:

```turtle
@prefix source: <http://example.org/source#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

source:Root a rdfs:Class .

source:RadarTrack a rdfs:Class .
source:radarTracks a owl:ObjectProperty ;
    rdfs:domain source:Root ;
    rdfs:range source:RadarTrack .

source:trkNo a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:string .

source:lat a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:decimal .

source:lon a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:decimal .

source:alt_ft a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:integer .

source:spd_kts a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:integer .

source:hdg a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:integer .

source:iff a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:string .

source:iff_conf a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:decimal .

source:sensor a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:string .

source:country a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:string .

source:time a owl:DatatypeProperty ;
    rdfs:domain source:RadarTrack ;
    rdfs:range xsd:dateTime .
```

And corresponding SHACL shapes for validation:

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .

source:RadarTrackShape a sh:NodeShape ;
    sh:targetClass source:RadarTrack ;
    sh:property [
        sh:path source:trkNo ;
        sh:datatype xsd:string ;
        sh:minCount 1 ; sh:maxCount 1
    ] ;
    sh:property [
        sh:path source:lat ;
        sh:datatype xsd:decimal ;
        sh:minCount 1 ; sh:maxCount 1
    ] ;
    sh:property [
        sh:path source:lon ;
        sh:datatype xsd:decimal ;
        sh:minCount 1 ; sh:maxCount 1
    ] .
```

---

## SHACL Shape Auto-Generation Rules

When generating SHACL shapes from the master ontology for validation:

1. Each `rdfs:Class` → `sh:NodeShape` with `sh:targetClass`.
2. Each `owl:DatatypeProperty` with `rdfs:domain` → `sh:property` on that class's shape.
3. `rdfs:range` of `xsd:*` → `sh:datatype`.
4. `owl:minCardinality` → `sh:minCount`. `owl:maxCardinality` → `sh:maxCount`.
5. If no cardinality is specified, default to `sh:minCount 0` (optional).
6. `owl:ObjectProperty` with `rdfs:range` of a class → `sh:property` with `sh:class`.
7. `rdfs:subClassOf` → the subclass shape inherits all constraints from the parent shape (via `sh:node` or by duplicating property shapes).

---

## Key Implementation Notes

### Bidirectional Sync (Canvas ↔ Code Editor)

This is one of the trickier parts of the project.

- **Canvas → Code:** On any React Flow state change (node add/remove/edit, edge add/remove), serialize the current graph to Turtle using N3.js Writer, and update the code editor content.
- **Code → Canvas:** On code editor change (debounced), parse the Turtle with N3.js Parser, diff the resulting triples against the current state, and update React Flow nodes/edges accordingly.
- Use a flag to prevent circular updates (e.g., `isUpdatingFromCode` / `isUpdatingFromCanvas`).
- The code editor should show parse errors inline without crashing the canvas state.

### Comunica Query Execution

Comunica can query against in-memory N3.js stores:

```typescript
import { QueryEngine } from '@comunica/query-sparql';

const engine = new QueryEngine();
const result = await engine.queryQuads(sparqlConstructQuery, {
  sources: [n3Store], // N3.Store instance
});
const quads = await result.toArray();
```

This runs entirely in the browser. For large datasets, queries may take noticeable time — show a progress indicator.

### JSON-LD Framing for Output

To convert the transformed RDF back to clean JSON:

```typescript
import * as jsonld from 'jsonld';

const frame = {
  '@context': {
    name: 'http://example.org/master#name',
    email: 'http://example.org/master#email',
    // ... derived from master ontology
  },
  '@type': 'http://example.org/master#Person',
};

const output = await jsonld.frame(rdfAsJsonLd, frame);
```

The frame is auto-generated from the master ontology's class/property structure.

---

## Onboarding & User Education

The tool targets users who want to learn Semantic Web concepts in the context of defense interoperability, so onboarding serves a dual purpose: teaching the tool AND teaching the underlying technologies through a realistic NATO air defense scenario.

### Interactive Walkthrough Tour (react-joyride)

On first visit (tracked via IndexedDB flag), launch a sequential tooltip tour that walks through the full workflow:

1. **Welcome** — "This tool helps you solve a core NATO interoperability challenge: integrating data from different nations' air defense systems into a common schema. Let's take a quick tour."
2. **Canvas** — "This is where you visually build and connect ontologies. Your common NATO schema is always on the right. The left side shows whichever source system you're currently mapping."
3. **Source Selector** — "Add multiple sources here — one for each nation's system. Switch between them to map each one independently. The tool fuses all sources together at the end."
4. **Node Palette** — "Drag class and property nodes from here to build your master ontology — the shared data model all systems will map to."
5. **Right Panel Tabs** — "Switch between views: paste source JSON, edit your master ontology, write SPARQL mappings, and see the fused output."
6. **SRC Tab** — "Paste JSON from the active source here. The tool will auto-generate an RDF schema from its structure — even if the field names and nesting are completely different from your master schema."
7. **MASTER Tab** — "This shows your master ontology as Turtle — the standard Semantic Web serialization format. Changes here sync with the canvas. You can also view it as JSON-LD or RDF/XML below."
8. **MAP Tab** — "For complex mappings, write SPARQL CONSTRUCT queries here. For example: converting a Norwegian radar's altitude from feet to meters. This tab is scoped to whichever source is active."
9. **Validate Button** — "Run SHACL validation across all sources at once — catching missing fields, wrong types, or structural mismatches before they reach the operational picture."
10. **Transform Button** — "Execute all mappings from all sources, fuse the results into a single unified dataset, and export the combined operational picture."

The tour is re-launchable from a "Help Tour" button in the header. Use `react-joyride` (mature, shadcn-compatible, supports custom styling).

### Sample Project: NATO Air Defense Radar Integration

Bundle a pre-built sample project that demonstrates the full workflow using a realistic (but unclassified, fictional) air defense scenario.

**Scenario:** Two allied nations contribute radar track data to a combined air defense operation. Each nation's system uses a different JSON schema to describe the same reality: detected air tracks.

**Master Ontology (NATO Common Schema):**

A simplified shared ontology based loosely on concepts from NATO standards (STANAG-like, but fictional to avoid classification concerns):

```
Classes:
  - AirTrack          (a detected object in the airspace)
  - Position          (geographic coordinates at a point in time)
  - TrackIdentity     (friend/foe classification)
  - RadarSystem       (the sensor that produced the track)

Properties of AirTrack:
  - trackId           (xsd:string)
  - currentPosition   (→ Position)
  - identity          (→ TrackIdentity)
  - detectedBy        (→ RadarSystem)
  - altitude_meters   (xsd:decimal)
  - speed_knots       (xsd:decimal)
  - heading_degrees   (xsd:decimal)
  - timestamp         (xsd:dateTime)

Properties of Position:
  - latitude_dd       (xsd:decimal, decimal degrees)
  - longitude_dd      (xsd:decimal, decimal degrees)

Properties of TrackIdentity:
  - classification     (xsd:string — "FRIEND", "HOSTILE", "NEUTRAL", "UNKNOWN")
  - confidence_percent (xsd:decimal)

Properties of RadarSystem:
  - systemName         (xsd:string)
  - nation             (xsd:string, ISO 3166-1 alpha-3)
```

**Source JSON A — "Nation Alpha" radar system (e.g., Scandinavian-style):**

```json
{
  "radarTracks": [
    {
      "trkNo": "A-0042",
      "lat": 59.9139,
      "lon": 10.7522,
      "alt_ft": 32000,
      "spd_kts": 450,
      "hdg": 270,
      "iff": "FRI",
      "iff_conf": 0.95,
      "sensor": "NORSE-3D",
      "country": "NOR",
      "time": "2026-03-24T14:23:00Z"
    }
  ]
}
```

**Source JSON B — "Nation Bravo" radar system (e.g., Central European-style):**

```json
{
  "erkannte_ziele": [
    {
      "ziel_id": "B-1187",
      "position": {
        "breite": 52.52,
        "laenge": 13.405,
        "hoehe_m": 9753
      },
      "geschwindigkeit_kmh": 833,
      "kurs_grad": 90,
      "identifikation": {
        "typ": "FEINDLICH",
        "sicherheit": 0.88
      },
      "radar": "ADLER-2000",
      "land": "DEU",
      "zeitstempel": "2026-03-24T14:23:05Z"
    }
  ]
}
```

**Included mappings for Source A → Master:**

- Simple 1:1: `trkNo` → `trackId`, `lat` → `latitude_dd`, `lon` → `longitude_dd`, `spd_kts` → `speed_knots`, `hdg` → `heading_degrees`, `sensor` → `systemName`, `country` → `nation`, `time` → `timestamp`.
- Complex SPARQL: `alt_ft` → `altitude_meters` (unit conversion: `BIND(?alt_ft * 0.3048 AS ?altitude_meters)`).
- Complex SPARQL: `iff` → `classification` (code translation: `BIND(IF(?iff = "FRI", "FRIEND", IF(?iff = "HOS", "HOSTILE", IF(?iff = "NEU", "NEUTRAL", "UNKNOWN"))) AS ?classification)`).
- Simple 1:1: `iff_conf` → `confidence_percent`.

**Included mappings for Source B → Master:**

- Simple 1:1: `ziel_id` → `trackId`, `breite` → `latitude_dd`, `laenge` → `longitude_dd`, `hoehe_m` → `altitude_meters`, `kurs_grad` → `heading_degrees`, `radar` → `systemName`, `land` → `nation`, `zeitstempel` → `timestamp`, `sicherheit` → `confidence_percent`.
- Complex SPARQL: `geschwindigkeit_kmh` → `speed_knots` (unit conversion: `BIND(?geschwindigkeit_kmh * 0.539957 AS ?speed_knots)`).
- Complex SPARQL: `typ` → `classification` (translation: `BIND(IF(?typ = "FEINDLICH", "HOSTILE", IF(?typ = "FREUNDLICH", "FRIEND", IF(?typ = "NEUTRAL", "NEUTRAL", "UNKNOWN"))) AS ?classification)`).
- Structural: flatten `position.breite`/`position.laenge`/`position.hoehe_m` into `Position` class and `altitude_meters` property.
- Structural: flatten `identifikation.typ`/`identifikation.sicherheit` into `TrackIdentity` class.

The sample project includes comments in the Turtle and SPARQL explaining what each mapping does and why — e.g., "Converting feet to meters because Nation Alpha's radar reports altitude in feet while the NATO common schema uses meters."

User can load the sample from a "Load Sample Project" button on the empty state screen or from the toolbar. The sample project loads with **both sources pre-configured** — the user can switch between "Norwegian Radar" and "German Radar" using the source selector to see how each maps differently to the same master ontology. This immediately demonstrates the multi-source fusion workflow.

### Contextual Tooltips (info icons)

Place small info icons (shadcn `TooltipProvider` + `Tooltip`) next to key UI elements. Each tooltip explains the Semantic Web concept with defense-relevant examples and optionally links to the relevant W3C spec:

- Next to "Class" in node palette → "An OWL/RDFS Class represents a category of things — like 'AirTrack', 'RadarSystem', or 'Position'. In NATO terms, these are the entity types in your shared data model."
- Next to "ObjectProperty" edge labels → "An Object Property links two classes together (e.g., AirTrack → detectedBy → RadarSystem). It represents a relationship between entities."
- Next to "DatatypeProperty" in class nodes → "A Datatype Property holds a literal value like a string or number (e.g., altitude_meters: xsd:decimal). These are the actual data fields."
- Next to SHACL validation results → "SHACL (Shapes Constraint Language) defines structural rules your data must follow. For example: every AirTrack must have a trackId and a currentPosition. This catches data quality issues before they reach the operational picture."
- Next to SPARQL CONSTRUCT editor → "SPARQL CONSTRUCT creates new RDF triples from existing data. Use it for mappings that aren't simple renaming — like converting units (feet → meters) or translating classification codes (FRI → FRIEND)."
- Next to the master ontology area → "The master ontology is the shared data model all nations agree on. Think of it as the NATO STANAG for your data: a common language that every system's data gets translated into."
- Next to the source schema area → "The source schema represents a specific nation's system. Each nation may use different field names, units, languages, and data structures to describe the same operational reality."

### About Page / Dialog

Accessible from the header "About" link. Opens a shadcn `Dialog` or `Sheet` with:

1. **The Problem** — "In coalition operations, allied nations contribute sensor data from different systems — radars, identification systems, command platforms — each with its own data format. A Norwegian radar might report altitude in feet with English field names, while a German system uses meters with German field names. Before this data can form a shared operational picture, it must be translated into a common format. This is the interoperability problem."

2. **The Semantic Web Approach** — "Semantic Web technologies (OWL, RDF, SPARQL) were designed to solve exactly this kind of problem: making data from different sources understandable to each other. Instead of writing brittle one-off format converters, you define ontologies (formal data models) and declarative mappings between them. If a new nation joins the coalition with a new system, you only need to create one new mapping — from their schema to the shared ontology."

3. **The Workflow** — Visual diagram (simple SVG) showing:

   ```
   Nation A's JSON  ──→  RDF Schema A  ──→  Mapping A  ──┐
                                                          │
   Nation B's JSON  ──→  RDF Schema B  ──→  Mapping B  ──┼──→  Fuse  ──→  SHACL Validate  ──→  Unified JSON
                                                          │
   Nation C's JSON  ──→  RDF Schema C  ──→  Mapping C  ──┘
                                                          ↑
   Master Ontology  ←──────── (shared model) ─────────────┘
   ```

   With a note: "Each nation's data is independently mapped to the shared ontology, then fused into a single operational picture. This tool lets you perform each step visually, or by directly editing the underlying Semantic Web representations."

4. **Key Concepts** — Brief glossary with defense-relevant framing:
   - **Ontology** — A formal description of a domain's concepts and relationships. The NATO common schema is an ontology.
   - **OWL** — Web Ontology Language. The W3C standard for defining ontologies with rich semantics (classes, properties, constraints).
   - **RDF** — Resource Description Framework. The data model underlying the Semantic Web: everything is a triple (subject → predicate → object).
   - **RDFS** — RDF Schema. Adds basic vocabulary to RDF: classes, subclasses, properties, domains, ranges.
   - **Turtle** — A human-readable syntax for writing RDF. Like JSON for the Semantic Web.
   - **SPARQL** — The query language for RDF data. SPARQL CONSTRUCT is used to transform data from one schema to another.
   - **SHACL** — Shapes Constraint Language. Defines validation rules (required fields, types, cardinality) for RDF data.
   - **Triple** — The atomic unit of RDF: "AirTrack-42 hasAltitude 9753". All data is stored as triples.
   - **Mapping** — A declarative description of how data in one schema corresponds to data in another.

5. **Relevance to NATO Interoperability** — "NATO has long worked on data interoperability through standards like STANAGs, MIP (Multilateral Interoperability Programme), and the NATO C3 Taxonomy. Semantic Web technologies offer a formal, machine-processable approach to the same goal. This tool demonstrates the core pattern: define a common ontology, map heterogeneous sources to it, validate, and transform."

6. **Learn More** — Links to W3C specs (OWL, RDF, SPARQL, SHACL), Semantic Web primers, and publicly available NATO interoperability references.

### Empty States

When the canvas or panels are empty, show helpful placeholder content with defense context:

- **Empty canvas:** "Start by adding classes to your master ontology (e.g., AirTrack, RadarSystem) using the node palette on the right. Or load the sample project to see a NATO air defense radar integration example with multiple sources."
- **Empty SRC tab:** "Paste JSON from a national system here to auto-generate a source schema. For example, a radar's track output in its native format. The schema will appear as nodes on the left side of the canvas. Use the source selector above the canvas to add more sources."
- **Empty MAP tab:** "No mappings yet for this source. Draw edges between source and master nodes on the canvas to create simple mappings, or write a SPARQL CONSTRUCT query here for complex transformations like unit conversions."
- **Empty OUT tab:** "Run Transform & Fuse to see your unified output here. All sources will be mapped and merged into a single dataset conforming to your master schema — the combined operational picture."

---

## Development Phases

### Phase 1: Foundation

- Set up Vite + React + TypeScript project.
- Install and configure shadcn/ui with Tailwind CSS.
- Install and configure React Flow with custom ClassNode and edge types.
- Implement the basic canvas with ability to add/remove/edit class nodes and connect them with property edges.
- Build the header with app name, About dialog, and Help Tour button.
- Set up Zustand store for application state, including multi-source data model (sources array, active source ID).
- Build the source selector UI (dropdown/pills above canvas with add/rename/delete).
- Implement IndexedDB persistence with auto-save (per-source keys).

### Phase 2: RDF Backbone

- Integrate N3.js for RDF parsing/serialization.
- Build the Turtle code editor panel with CodeMirror.
- Implement bidirectional sync between canvas and code editor.
- Implement export/import of `.onto-mapper.json` project files.

### Phase 3: JSON Import (Multi-Source)

- Build the SRC tab with a CodeMirror JSON editor scoped to the active source.
- Implement JSON → RDFS schema converter (with per-source URI prefixes).
- Display the active source's generated schema on the left side of the canvas; swap when source selector changes.
- Show the auto-generated source RDFS (read-only Turtle) below the JSON editor in the SRC tab.
- Store the raw JSON per-source for later transformation.
- Ensure switching sources preserves each source's node positions independently.

### Phase 4: Mapping (Per-Source)

- Implement simple mapping edge creation (drag from active source node to master ontology node).
- Auto-generate SPARQL CONSTRUCT queries for simple mappings, scoped to the active source.
- Integrate YASGUI for the SPARQL CONSTRUCT editor, scoped to the active source's mappings.
- Implement complex mapping groups: parse CONSTRUCT queries to extract referenced properties and auto-generate grouped visual edges on the canvas.
- Build the mapping management panel (list, edit, delete mappings for active source; click to highlight on canvas).
- Ensure mapping edges are stored per-source and only rendered for the active source.

### Phase 5: Validation (All Sources)

- Implement SHACL shape auto-generation from master ontology.
- Integrate rdf-validate-shacl.
- Run validation across all sources: execute each source's mappings, merge candidate triples, validate against SHACL shapes.
- Build validation results UI with per-source error grouping and status indicators on the source selector.
- Clicking a validation error switches to the relevant source and highlights the offending nodes/edges.

### Phase 6: Transform & Fuse

- Wire up Comunica to execute each source's CONSTRUCT queries against its own RDF data.
- Merge all resulting triples from all sources into a single unified RDF graph (data fusion).
- Add source provenance annotations to output triples.
- Implement JSON-LD framing for output serialization.
- Build the output viewer showing fused JSON with a summary of contributing sources and entity counts per source.
- Implement download functionality.

### Phase 7: Onboarding & Polish

- Build the interactive walkthrough tour with react-joyride.
- Create the sample project bundle.
- Add contextual info tooltips to all key UI elements.
- Build the About dialog with concept glossary and workflow diagram.
- Add empty state messages to all panels.
- Responsive layout and keyboard shortcuts.
- Undo/redo support.
- SPARQL template library for common mapping patterns.
- Multi-project support.
- Comprehensive error handling and loading states.

---

---

# Appendix: Future Reasoning Extension (NOT IN SCOPE FOR MVP)

> **This section is reference material for a potential future enhancement. It is NOT part of the MVP and should NOT be implemented during the initial build.** The MVP uses SHACL validation exclusively for consistency checking (Step 4). This appendix documents how OWL-DL reasoning could be added later if desired.

## Why You Might Want It Later

SHACL validation catches structural issues (missing properties, wrong datatypes, cardinality violations). OWL-DL reasoning goes further:

- **Class satisfiability:** detect if a class definition is logically impossible (e.g., `owl:disjointWith` conflict).
- **Subsumption inference:** automatically determine that class A is a subclass of class B based on property restrictions, even if not explicitly stated.
- **Instance classification:** given an individual's properties, infer which classes it belongs to.
- **Consistency checking:** verify the entire ontology + data is free of logical contradictions.

For the MVP's use case (mapping JSON to a user-defined ontology), SHACL is sufficient. OWL reasoning becomes valuable when working with large, complex ontologies with deep class hierarchies and logical axioms.

## Architecture

This would require adding a backend, since no mature OWL-DL reasoner runs in the browser. The frontend remains unchanged except for a new "Reason" button.

```
┌─────────────┐     HTTP/SPARQL      ┌─────────────────────┐
│  Browser UI  │ ──────────────────> │  Backend             │
│              │                      │                     │
│  Serialize   │  POST /reason        │  Oxigraph           │
│  ontology +  │  Body: Turtle data   │  or Jena Fuseki     │
│  data as     │                      │                     │
│  Turtle      │ <────────────────── │  Returns:            │
│              │  Reasoning results   │  - Inferred triples  │
│  Display     │  (JSON-LD or Turtle) │  - Inconsistencies   │
│  results     │                      │  - Classification    │
└─────────────┘                      └─────────────────────┘
```

## Option A: Oxigraph (recommended for simplicity)

Oxigraph is a lightweight RDF triplestore written in Rust. It supports SPARQL 1.1 and basic RDFS/OWL reasoning.

```bash
# Run with Docker
docker run -p 7878:7878 ghcr.io/oxigraph/oxigraph

# Load data via SPARQL endpoint
curl -X POST http://localhost:7878/store \
  -H "Content-Type: text/turtle" \
  --data-binary @ontology.ttl

# Query with reasoning
curl -X POST http://localhost:7878/query \
  -H "Content-Type: application/sparql-query" \
  --data "SELECT ?class WHERE { ?s a ?class }"
```

**Limitation:** Oxigraph's reasoning is RDFS-level (subclass/subproperty inference). It does NOT do full OWL-DL reasoning (disjointness, cardinality, unions).

## Option B: Apache Jena Fuseki (full OWL reasoning)

Jena is the gold standard for Java-based Semantic Web tooling. Fuseki is its SPARQL server.

```bash
# Run with Docker
docker run -p 3030:3030 stain/jena-fuseki \
  --mem --reasoner=OWL /dataset

# Load and query via the same SPARQL endpoint
```

Jena supports configurable reasoning levels:

- `RDFS` — subclass, subproperty, domain, range inference.
- `OWL_MINI` — adds transitivity, symmetry, inverse properties.
- `OWL` — full OWL-DL reasoning (slow for large ontologies).

## Frontend Integration

Add a "Reason" button to the toolbar that:

1. Serializes the master ontology + source schema + mapped data as Turtle.
2. POSTs to the backend's SPARQL endpoint (or a custom `/reason` endpoint).
3. The backend loads the data into a reasoner-backed graph, runs inference, and returns:
   - **Inferred triples** — new facts derived by reasoning. Display these as a separate layer in React Flow (e.g., purple dashed edges for inferred relationships).
   - **Inconsistencies** — contradictions found. Display as error annotations on the relevant nodes.
4. The user can accept/reject inferred triples and fix inconsistencies before proceeding to transformation.

## Hybrid Approach

Keep SHACL validation client-side (fast, structural checks) and only send data to the backend for OWL reasoning (slow, logical checks). This gives the best UX: instant feedback for common errors, with deep reasoning available on demand.
