---
phase: 05-shacl-validation
plan: 01
subsystem: validation
tags: [shacl, rdf, tdd]
requires: []
provides:
  - "rdf-validate-shacl wrapper with ShaclFactory adapter (validator.ts)"
  - "OntologyNode[] → N3.Store SHACL shapes generator (shapesGenerator.ts)"
  - "Raw JSON string → N3.Store typed RDF instances (instanceGenerator.ts)"
  - "N3.Store pattern-match CONSTRUCT executor without Comunica (constructExecutor.ts)"
  - "validateSource() orchestrator — full pipeline from source+mappings → ViolationRecord[] (index.ts)"
affects: [05-02, 05-03]
tech-stack:
  added: [rdf-validate-shacl]
  patterns: [N3.Store quad matching, ShaclFactory adapter pattern, recursive JSON walk]
key-files:
  created:
    - src/lib/shacl/validator.ts
    - src/lib/shacl/shapesGenerator.ts
    - src/lib/shacl/instanceGenerator.ts
    - src/lib/shacl/constructExecutor.ts
    - src/lib/shacl/index.ts
    - src/__tests__/shacl.test.ts
  modified:
    - package.json
    - package-lock.json
key-decisions:
  - "ShaclFactory uses defaultEnv from rdf-validate-shacl/src/defaultEnv.js (not custom N3.DataFactory adapter) — the minimal adapter lacked clownface() required internally"
  - "canvasNodeId resolved by matching violation's targetClassUri → mapping.targetClassUri → mapping.sourceClassUri → ontologyNode.id"
  - "validateSource early-returns [] when source.schemaNodes.length === 0 to prevent false-positive 'all valid'"
requirements-completed: [REQ-33, REQ-34, REQ-35]
test_metrics:
  tests_passed: 12
  tests_failed: 0
  tests_total: 12
  coverage_line: null
  coverage_branch: null
  test_files_created: [src/__tests__/shacl.test.ts]
  spec_tests_count: 0
duration: ~10m
completed: "2026-03-30T20:00:00.000Z"
---

## What Was Built

Pure-library SHACL validation pipeline with zero React/Zustand dependencies:

- **validator.ts** — `validateWithShacl(data, shapes)` wraps rdf-validate-shacl with the `defaultEnv` factory adapter. Maps ValidationReport results to `ViolationRecord[]`.
- **shapesGenerator.ts** — `generateShapes(ontologyNodes)` converts OntologyNode array to N3.Store of SHACL NodeShapes with `sh:targetClass`, `sh:property`/`sh:datatype` (datatype props), and `sh:property`/`sh:class` (object props).
- **instanceGenerator.ts** — `jsonToInstances(json, schemaNodes)` recursively walks parsed JSON (depth limit 10), minting blank-node instances with `rdf:type` and typed literals (XSD inference matching jsonToSchema's `xsdRangeShort`).
- **constructExecutor.ts** — `executeConstruct(instanceStore, mappings)` executes the fixed two-triple CONSTRUCT pattern via N3.Store.getSubjects/getObjects — no Comunica needed.
- **index.ts** — `validateSource(source, ontologyNodes, mappings)` orchestrates the full pipeline; resolves `canvasNodeId` and `sourceId` on each ViolationRecord.

## Test Results

```
✓ generateShapes: sh:NodeShape triple for datatype property (1)
✓ generateShapes: sh:class triple for object property (1)
✓ jsonToInstances: rdf:type triple for nested class (1)
✓ jsonToInstances: typed literal for primitive field (1)
✓ jsonToInstances: empty store for invalid JSON (1)
✓ executeConstruct: maps instances to targetClass with targetProp (1)
✓ executeConstruct: empty store when no matching instances (1)
✓ validateSource: returns [] when schemaNodes empty (1)
✓ validateSource: no violations when output conforms (1)
✓ validateSource: violations when wrong datatype (1)
✓ validateSource: resolves canvasNodeId (1)
✓ validateSource: canvasNodeId null with no mappings (1)
12/12 passed
```

## Issues Encountered

None — build and all tests passed cleanly.

## Deviations from Plan

- **ShaclFactory implementation**: The minimal `{ ...N3.DataFactory, dataset: () => new N3.Store() }` adapter lacked `clownface()` required internally by rdf-validate-shacl. Replaced with `defaultEnv` from `rdf-validate-shacl/src/defaultEnv.js` (ts-ignore for missing type declarations).
- **canvasNodeId lookup uses targetClassUri**: Plan spec said `mapping.sourceClassUri` but ontologyNodes are master ontology (target side). Used `mapping.targetClassUri` to match against `n.data.uri` — consistent with the integration tests.
