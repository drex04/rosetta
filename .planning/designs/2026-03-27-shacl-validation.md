# Design: SHACL Validation (Phase 5)
**Date:** 2026-03-27
**Status:** Approved

## Pipeline

```
source.json
    │
    ▼ jsonToInstances()         ← new in Phase 5
N3.Store [source instances]
    │
    ▼ executeConstruct()        ← mapping pattern matching
N3.Store [candidate target triples]
    │
    ▼ validateWithShacl()       ← rdf-validate-shacl
ViolationRecord[]
    │
    ▼ useValidationStore        ← new Zustand slice
ValidationPanel + SourceStatusBadge
```

## Key Decisions

- **jsonToInstances**: New function converting raw `source.json` into typed RDF instance triples (same URI prefix logic as jsonToSchema)
- **Library**: `rdf-validate-shacl@0.6.5` + 4-line ShaclFactory adapter (avoid @zazuko/env bundle)
- **SHACL shapes**: class→NodeShape, property→sh:property (sh:path + sh:datatype/sh:class). No cardinality — ontology has no OWL restrictions
- **Trigger**: Explicit "Validate" button (not automatic)
- **Results UI**: New "VAL" tab in right panel (alongside SRC, MAP)
- **Source status**: SourceStatusBadge (✓/⚠/○) on source selector pills, derived reactively
- **Violation click**: setActiveSourceId → updateNode(highlighted) → fitView

## Non-goals
- Cardinality constraints (no OWL restrictions in current ontology)
- Comunica for CONSTRUCT (deferred to Phase 6 per REQ-39)
- Automatic validation on mapping change
