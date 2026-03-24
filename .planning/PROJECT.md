# Ontology Mapper (Rosetta)

## Vision

A fully client-side web application for learning Semantic Web technologies in the context of defense systems interoperability. Users visually build OWL/RDF ontologies, import JSON schemas from heterogeneous systems, map between schemas using a node-based UI, validate with SHACL, and transform/fuse data — all in the browser. No backend required.

## Target Users

1. **Defense analyst (learner):** Learning Semantic Web tech hands-on through a realistic scenario
2. **Operational stakeholder (demo audience):** Non-technical; watching a demonstration to understand the value of ontology-based interoperability for NATO operations

## Problem Statement

In coalition operations, allied nations contribute sensor data from different systems — each with its own JSON schema, field names, units, and language. Before this data can form a shared operational picture, it must be translated into a common format. This tool demonstrates the Semantic Web approach: define a common ontology, map heterogeneous sources to it, validate, and transform.

## Scope

### In Scope (v1)
- Visual OWL/RDFS ontology editor (node-based canvas with React Flow)
- Bidirectional Turtle code editor ↔ canvas sync
- Multi-source JSON import with auto-generated RDFS schemas
- Visual mapping editor (1:1 drag-and-drop + SPARQL CONSTRUCT)
- SHACL validation across all sources
- Data fusion: merge all source transforms into a single unified RDF graph
- JSON-LD framing for structured output export
- IndexedDB auto-save + project file export/import
- Interactive onboarding tour (react-joyride)
- Sample project: NATO air defense radar integration (2 nations)
- Contextual tooltips teaching Semantic Web concepts

### Out of Scope (v1)
- OWL-DL reasoning (requires backend — documented as future extension)
- Backend / server-side processing
- Multi-user collaboration
- User authentication or accounts

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui (preset: `bcivVKZU`) + Phosphor Icons
- **State:** Zustand
- **Canvas:** React Flow (@xyflow/react v12)
- **RDF:** N3.js (parse/serialize), jsonld (JSON-LD), Comunica (SPARQL engine), rdf-validate-shacl
- **Editors:** CodeMirror 6 (Turtle/JSON), YASGUI (SPARQL)
- **Persistence:** idb-keyval (IndexedDB)
- **Onboarding:** react-joyride
- **Deployment:** Vercel (static site)

## Success Criteria

1. A user can paste JSON from two heterogeneous "nation" systems, map both to a shared OWL ontology visually, run SHACL validation, and export a fused unified JSON dataset
2. The sample NATO air defense project loads pre-built and demonstrates the full workflow end-to-end
3. A non-technical stakeholder watching a demo can follow the workflow without explanation
4. All processing runs in the browser — no network requests to a backend
