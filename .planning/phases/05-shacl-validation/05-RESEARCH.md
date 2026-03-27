# Phase 05: SHACL Validation - Research

**Researched:** 2026-03-27
**Domain:** SHACL validation, OWL/RDFS-to-shapes generation, React Flow highlighting, Comunica CONSTRUCT queries
**Confidence:** MEDIUM-HIGH (library API verified via source inspection; browser integration patterns verified via official docs and issue tracker)

---

## Summary

Phase 05 introduces SHACL-based validation of source mappings against the master ontology. The core loop is: (1) auto-generate SHACL NodeShapes from the OWL/RDFS canvas data, (2) execute existing SPARQL CONSTRUCT queries (one per source mapping) to produce candidate triples, (3) validate those triples against the shapes using `rdf-validate-shacl`, and (4) surface per-source pass/fail status and clickable violations in the UI.

The critical finding is that `rdf-validate-shacl@0.6.5` expects an RDF/JS `DatasetCoreFactory` (with a `.dataset()` method), which N3's `DataFactory` does not satisfy. The required workaround is a 4-line adapter that extends `DataFactory` with a `dataset(quads) → N3.Store` method. No Node.js polyfills are required beyond what the project already has (`vite-plugin-node-polyfills`). However, `@comunica/query-sparql` (needed to execute SPARQL CONSTRUCT queries) requires a `define: { "process.env": JSON.stringify({}) }` entry in `vite.config.ts`.

Phase 5 should defer Comunica installation to avoid scope creep: the existing CONSTRUCT query strings can be interpreted directly using N3.Store pattern-matching (manually executing the two-triple pattern the `generateConstruct` template always produces). This keeps the bundle delta minimal for this phase. Comunica arrives in Phase 6 (REQ-39).

**Primary recommendation:** Implement SHACL validation using `rdf-validate-shacl@0.6.5` with a minimal N3 factory adapter, execute CONSTRUCT patterns directly via N3.Store matching (no Comunica in this phase), store results in a dedicated `useValidationStore`, derive per-source status as computed selectors, and highlight canvas nodes via `updateNode` from `useReactFlow`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-33 | Auto-generate SHACL shapes from master ontology (class→NodeShape, property→sh:property, cardinality, datatype, ranges) | SHACL generation algorithm: each OWL class → sh:NodeShape + sh:targetClass; each DatatypeProperty on that class → sh:property with sh:path + sh:datatype; each ObjectProperty → sh:property with sh:path + sh:class; no cardinality present in current ontology model so omit minCount/maxCount unless OWL restrictions are present |
| REQ-34 | Integrate rdf-validate-shacl | Factory adapter pattern needed (ExtendedDataFactory); @zazuko/env/web.js provides the factory; see Code Examples section |
| REQ-35 | Validate pipeline: for each source, run CONSTRUCT queries → merge candidate triples → validate against SHACL shapes | N3.Store-based CONSTRUCT execution (no Comunica yet); one store per source; validate with shared shapes store |
| REQ-36 | Validation results UI: pass/fail, violations grouped by source, human-readable messages | ValidationResult has .message, .path, .focusNode, .severity, .sourceShape, .value; violations panel component |
| REQ-37 | Per-source status indicators on source selector (✓ mapped+valid, ⚠ errors, ○ unmapped) | Derived selector over validationStore + mappingStore; no pre-computation needed |
| REQ-38 | Clicking a violation: switch to relevant source, highlight offending nodes/edges on canvas | setActiveSourceId + updateNode({ data: { highlighted: true } }) + fitView({ nodes: [id] }) |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rdf-validate-shacl | 0.6.5 | W3C SHACL validation in-browser | Only mature pure-JS SHACL implementation; runs client-side |
| @zazuko/env | 3.0.1 | RDF/JS environment factory required by rdf-validate-shacl | Provides the DatasetCoreFactory the validator requires; web.js export avoids Node deps |
| n3 | 2.0.3 (already installed) | RDF store, parsing, serializing | Already in project; shapes stored as N3.Store |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @comunica/query-sparql | 4.x | Execute SPARQL CONSTRUCT queries | Defer to Phase 6 (REQ-39); Phase 5 uses N3.Store direct matching |
| zustand | 5.0.12 (already installed) | Validation results store | New `useValidationStore` slice |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rdf-validate-shacl | rdf-ext/shacl-engine | shacl-engine is faster but less mature, fewer community examples |
| @zazuko/env/web.js | Hand-rolled N3 factory adapter | Adapter is 4 lines and avoids a dependency; but @zazuko/env is the officially supported path |
| N3.Store direct matching (Phase 5) | Comunica | Comunica is correct long-term but adds 500KB+ to bundle; Phase 5 queries always have predictable structure |

**Installation (Phase 5):**
```bash
npm install rdf-validate-shacl @zazuko/env
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
  lib/
    shacl/
      shaclFactory.ts      # ExtendedDataFactory adapter (N3 + dataset method)
      shapesGenerator.ts   # OWL nodes/edges → SHACL NodeShapes (N3.Store)
      constructExecutor.ts # Execute mapping CONSTRUCT patterns against N3.Store
      validator.ts         # Run rdf-validate-shacl, return typed results
  store/
    validationStore.ts     # Zustand store for ValidationState
  components/
    panels/
      ValidationPanel.tsx  # Violations list, grouped by source
    ui/
      SourceStatusBadge.tsx # ✓/⚠/○ indicator used in source selector
```

### Pattern 1: N3 Factory Adapter

N3's `DataFactory` is missing the `.dataset()` method required by `rdf-validate-shacl`. Extend it with a minimal adapter.

**What:** Wrap N3.DataFactory + N3.Store to satisfy the `DatasetCoreFactory` interface.
**When to use:** Whenever constructing a `SHACLValidator`.

```typescript
// src/lib/shacl/shaclFactory.ts
import * as N3 from 'n3'
import type { Quad } from '@rdfjs/types'

export const ShaclFactory = {
  ...N3.DataFactory,
  dataset(quads?: Quad[]): N3.Store {
    return new N3.Store(quads)
  },
}
```

Source: GitHub issue #143 (zazuko/rdf-validate-shacl) — maintainer-acknowledged workaround.
Confidence: HIGH (verified against source code of ValidationReport constructor and issue discussion).

### Pattern 2: SHACL Shapes Generation from OWL Nodes/Edges

**What:** Convert the in-memory ontology graph (React Flow nodes + edges) into a SHACL shapes N3.Store.
**When to use:** Once on mount and whenever the ontology canvas changes (debounced).

Algorithm (per REQ-33):

1. For each `OntologyNode` (ClassData): emit `sh:NodeShape` + `sh:targetClass`
2. For each `PropertyData` on that node:
   - If `kind === 'datatype'`: emit `sh:property [ sh:path <propUri>; sh:datatype <range> ]`
   - If `kind === 'object'`: emit `sh:property [ sh:path <propUri>; sh:class <range> ]`
3. For `subclassEdge`: do NOT add cardinality — OWL subClassOf is not a validation constraint
4. For `objectPropertyEdge`: already covered via ClassData.properties with `kind: 'object'`

```typescript
// src/lib/shacl/shapesGenerator.ts
// Source: W3C SHACL spec §2.1, bobdc.com/blog/rdfs2shacl verified pattern
import * as N3 from 'n3'
import type { OntologyNode } from '@/types/index'

const SH = 'http://www.w3.org/ns/shacl#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const XSD = 'http://www.w3.org/2001/XMLSchema#'

export function generateShaclShapes(nodes: OntologyNode[]): N3.Store {
  const store = new N3.Store()
  const df = N3.DataFactory
  const nn = (u: string) => df.namedNode(u)
  const bl = () => df.blankNode()

  for (const node of nodes) {
    const classUri = node.data.uri
    const shapeNode = nn(`${classUri}Shape`)

    store.addQuad(shapeNode, nn(`${RDF}type`),         nn(`${SH}NodeShape`))
    store.addQuad(shapeNode, nn(`${SH}targetClass`),   nn(classUri))

    for (const prop of node.data.properties) {
      const propShape = bl()
      store.addQuad(shapeNode, nn(`${SH}property`), propShape)
      store.addQuad(propShape, nn(`${SH}path`),     nn(prop.uri))

      if (prop.kind === 'datatype') {
        // Resolve shorthand xsd: ranges to full URIs
        const rangeUri = prop.range.startsWith('xsd:')
          ? `${XSD}${prop.range.slice(4)}`
          : prop.range
        store.addQuad(propShape, nn(`${SH}datatype`), nn(rangeUri))
      } else {
        store.addQuad(propShape, nn(`${SH}class`), nn(prop.range))
      }
    }
  }
  return store
}
```

Confidence: HIGH — algorithm matches W3C SHACL spec and verified against SPARQL-based rdfs2shacl patterns.

### Pattern 3: CONSTRUCT Execution Without Comunica

**What:** Interpret the fixed-shape CONSTRUCT pattern directly using N3.Store matching.
**When to use:** Phase 5 only; Phase 6 replaces this with Comunica for arbitrary SPARQL.

The `generateConstruct` function in `src/lib/sparql.ts` always produces the same two-pattern shape:
```sparql
CONSTRUCT { ?target a tgt:Class . ?target tgt:prop ?val . }
WHERE     { ?source a src:Class . ?source src:prop ?val . }
```

This can be executed via N3.Store lookups without a full SPARQL engine:

```typescript
// src/lib/shacl/constructExecutor.ts
import * as N3 from 'n3'
import type { Mapping } from '@/types/index'

export function executeConstruct(
  sourceStore: N3.Store,   // source data quads
  mapping: Mapping,
): N3.Store {
  const result = new N3.Store()
  const df = N3.DataFactory
  const nn = (u: string) => df.namedNode(u)

  // Find all ?source instances of sourceClassUri
  for (const q of sourceStore.match(null, nn('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), nn(mapping.sourceClassUri), null)) {
    const sourceNode = q.subject
    // Find ?val for sourcePropUri
    for (const pq of sourceStore.match(sourceNode, nn(mapping.sourcePropUri), null, null)) {
      const val = pq.object
      // Mint a target URI: reuse subject IRI or blank node
      const targetNode = df.blankNode()
      result.addQuad(targetNode, nn('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), nn(mapping.targetClassUri), df.defaultGraph())
      result.addQuad(targetNode, nn(mapping.targetPropUri), val, df.defaultGraph())
    }
  }
  return result
}
```

Note: For Phase 6, this function is replaced wholesale by Comunica. The interface remains the same: `(sourceStore, mapping) → N3.Store`.
Confidence: HIGH — N3.Store.match is documented and stable.

### Pattern 4: Running the Validator

```typescript
// src/lib/shacl/validator.ts
import SHACLValidator from 'rdf-validate-shacl'
import { ShaclFactory } from './shaclFactory'
import type { N3 } from 'n3'

export async function validateData(
  shapesStore: N3.Store,
  dataStore: N3.Store,
): Promise<ValidationReport> {
  const validator = new SHACLValidator(shapesStore, { factory: ShaclFactory })
  return validator.validate(dataStore)
}
```

Source: rdf-validate-shacl README (official).
Confidence: HIGH.

### Pattern 5: ValidationStore Structure

```typescript
// src/store/validationStore.ts
import { create } from 'zustand'

export type ViolationRecord = {
  id: string                    // crypto.randomUUID()
  sourceId: string              // links to sourcesStore
  mappingId: string             // links to mappingStore (may be '' for source-level)
  focusNodeUri: string | null   // from result.focusNode?.value
  pathUri: string | null        // from result.path?.value
  message: string               // from result.message[0]?.value ?? 'Validation error'
  severity: 'Violation' | 'Warning' | 'Info'
  sourceShapeUri: string | null // from result.sourceShape?.value
  // Resolved canvas IDs for highlighting (REQ-38)
  canvasNodeId: string | null   // e.g. 'node_AirTrack' — derived at storage time
  canvasEdgeId: string | null   // e.g. 'e_node_AirTrack_objectPropertyEdge_node_Track'
}

export type SourceValidationStatus = 'valid' | 'violation' | 'unmapped' | 'pending'

interface ValidationState {
  violations: ViolationRecord[]
  isRunning: boolean
  lastRunAt: number | null
  setRunning: (v: boolean) => void
  setViolations: (sourceId: string, violations: ViolationRecord[]) => void
  clearSource: (sourceId: string) => void
  reset: () => void
}
```

Derived selector for per-source status (not pre-computed, reactive):

```typescript
// Used in SourcePanel / SourceStatusBadge
export function useSourceStatus(sourceId: string): SourceValidationStatus {
  const violations = useValidationStore(s => s.violations)
  const mappings = useMappingStore(s => s.getMappingsForSource(sourceId))

  if (mappings.length === 0) return 'unmapped'
  const sourceViolations = violations.filter(v => v.sourceId === sourceId)
  return sourceViolations.length > 0 ? 'violation' : 'valid'
}
```

Confidence: HIGH — Zustand selector pattern matches existing store patterns in the codebase.

### Pattern 6: Canvas Node Highlighting (REQ-38)

React Flow's `updateNode` (from `useReactFlow`) is the correct API. Set a custom `highlighted` flag on node data, then read it in the custom node renderer to apply a ring or border style.

```typescript
// In ValidationPanel — clicking a violation
import { useReactFlow } from '@xyflow/react'

const { updateNode, fitView, setCenter } = useReactFlow()

function handleViolationClick(v: ViolationRecord) {
  // 1. Switch to source
  setActiveSourceId(v.sourceId)

  // 2. Clear any existing highlights
  setNodes(nodes => nodes.map(n => ({
    ...n,
    data: { ...n.data, highlighted: false },
  })))

  // 3. Highlight offending node
  if (v.canvasNodeId) {
    updateNode(v.canvasNodeId, node => ({
      data: { ...node.data, highlighted: true },
    }))

    // 4. Scroll to it
    fitView({ nodes: [{ id: v.canvasNodeId }], duration: 400, padding: 0.3 })
  }
}
```

In the custom node component, read `data.highlighted` and apply a ring:

```tsx
// In ClassNode.tsx / SourceNode.tsx
const ringClass = data.highlighted ? 'ring-2 ring-destructive ring-offset-1' : ''
```

Confidence: HIGH — `updateNode` and `fitView` are documented in `ReactFlowInstance` API reference (reactflow.dev).

### Anti-Patterns to Avoid

- **Using N3.DataFactory directly as factory:** TypeScript error — missing `dataset()` method. Use `ShaclFactory` adapter.
- **Storing ValidationReport objects in Zustand:** They contain non-serializable RDF terms. Extract plain-object `ViolationRecord` at call site before storing.
- **Running validation synchronously on every store change:** Validation is O(n × m) — run it in a debounced effect or explicitly via a "Run Validation" button.
- **Blocking the main thread:** For large ontologies, validation can take >100ms. Use `setTimeout(..., 0)` yield or a Web Worker (Phase 5: setTimeout yield is sufficient; Worker is future work).
- **Re-generating shapes on every render:** Memoize `generateShaclShapes` on `ontologyStore.nodes` reference.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHACL constraint evaluation | Custom constraint checker | rdf-validate-shacl | sh:minCount, sh:maxCount, sh:datatype, sh:class, sh:closed all have edge cases |
| RDF dataset operations | Custom quad store | N3.Store | Already in project; correct triple pattern index |
| SPARQL CONSTRUCT (Phase 6) | Manual pattern matching | @comunica/query-sparql | Handles FILTER, OPTIONAL, UNION, BIND — manual matching breaks immediately |

**Key insight:** Even the "simple" two-triple CONSTRUCT pattern has edge cases (blank nodes, multiple instances, literal datatypes). N3.Store.match is robust; don't re-implement pattern matching beyond what the executor provides.

---

## Common Pitfalls

### Pitfall 1: N3.DataFactory Does Not Satisfy DatasetCoreFactory
**What goes wrong:** `new SHACLValidator(shapes, { factory: N3.DataFactory })` throws a runtime error (or TypeScript type error) about missing `dataset` method.
**Why it happens:** rdf-validate-shacl internally calls `factory.dataset()` to create internal datasets. N3's DataFactory does not have this method — it's on N3.Store.
**How to avoid:** Always use the `ShaclFactory` adapter from `src/lib/shacl/shaclFactory.ts`.
**Warning signs:** TypeScript error "Property 'dataset' is missing in type 'typeof DataFactory'".

### Pitfall 2: ValidationReport Contains Live RDF Terms — Not Plain Objects
**What goes wrong:** Storing `report.results` directly in Zustand causes React re-render issues and serialization failures in devtools.
**Why it happens:** `ValidationResult` fields (`focusNode`, `path`, `sourceShape`, etc.) are RDF Term objects with prototype chains, not plain strings.
**How to avoid:** Always extract `.value` strings at the call site before building `ViolationRecord`.
**Warning signs:** Zustand devtools shows `[object Object]` in violation entries.

### Pitfall 3: Comunica process.env in Vite (Phase 6 warning, not Phase 5)
**What goes wrong:** Build succeeds but runtime throws "process is not defined" in browser.
**Why it happens:** Comunica internals reference `process.env.NODE_ENV` which Vite does not polyfill.
**How to avoid:** Add to `vite.config.ts`:
```typescript
define: {
  "process.env": JSON.stringify({}),
}
```
Source: comunica/comunica GitHub issue #1523.
**Warning signs:** Runtime error about `process` being undefined, only in production build or CDN delivery.

### Pitfall 4: SHACL Open-World Assumption vs. Closed-World Validation
**What goes wrong:** `sh:minCount 1` will fail for any source instance that has no mapping to a required property. This is correct behavior but looks like false positives to users.
**Why it happens:** The auto-generated shapes from OWL do not know which properties are "required" unless you encode that in OWL restrictions.
**How to avoid:** For Phase 5, do NOT add `sh:minCount` / `sh:maxCount` unless the OWL model explicitly includes `owl:Restriction` cardinality axioms. The current `SEED_TURTLE` has none, so shapes should be permissive (no cardinality constraints). Only validate that values, when present, have the correct datatype/class.
**Warning signs:** Every source failing validation even with correct mappings.

### Pitfall 5: Blank Nodes in CONSTRUCT Output Cannot Be Referenced
**What goes wrong:** The `executeConstruct` pattern mints a new blank node for each `?target`. SHACL validates the blank node correctly, but `focusNode.value` in the violation will be a blank node identifier (e.g. `_:b0`), which cannot be traced back to a source node ID.
**Why it happens:** CONSTRUCT creates new instances; blank nodes have no stable identity across store serializations.
**How to avoid:** When building `ViolationRecord`, trace the violation back through the mapping (which class it targeted, which source the mapping belongs to) rather than trying to dereference the blank node.
**Warning signs:** `canvasNodeId` always null; violation clicks do nothing.

### Pitfall 6: Multiple Sources Share Target Class URIs
**What goes wrong:** Shapes are generated from the master ontology and target `nato:AirTrack` etc. All sources mapping to the same target class will have their candidate triples validated against the same shape. Violations look ambiguous.
**Why it happens:** SHACL validation is global over the data store. Per-source stores solve this — validate each source's result store independently.
**How to avoid:** Never merge all sources into one data store before validation. Run validation once per source store.

### Pitfall 7: Property `range` is Stored as Shorthand in ClassData
**What goes wrong:** `prop.range` in `PropertyData` is stored as e.g. `"xsd:float"` (shorthand), not as a full URI. SHACL requires the full URI in `sh:datatype`.
**Why it happens:** `rdf.ts` line 157 uses `'xsd:string'` as a default string literal.
**How to avoid:** In `shapesGenerator.ts`, expand known namespace prefixes before writing the triple:
```typescript
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#'
const rangeUri = prop.range.startsWith('xsd:')
  ? `${XSD_NS}${prop.range.slice(4)}`
  : prop.range
```

---

## Code Examples

Verified patterns from official sources:

### Full Validation Call (verified against rdf-validate-shacl README + issue #143)

```typescript
import SHACLValidator from 'rdf-validate-shacl'
import * as N3 from 'n3'
import { ShaclFactory } from '@/lib/shacl/shaclFactory'

// shapes: N3.Store with SHACL NodeShapes
// data:   N3.Store with candidate triples
async function runValidation(shapes: N3.Store, data: N3.Store) {
  const validator = new SHACLValidator(shapes, { factory: ShaclFactory })
  const report = await validator.validate(data)

  if (report.conforms) return []

  return report.results.map(result => ({
    focusNodeUri:   result.focusNode?.value ?? null,
    pathUri:        result.path?.value ?? null,
    message:        result.message[0]?.value ?? 'Validation error',
    severity:       result.severity?.value?.split('#').pop() ?? 'Violation',
    sourceShapeUri: result.sourceShape?.value ?? null,
    value:          result.value?.value ?? null,
  }))
}
```

### Per-Source Validation Pipeline

```typescript
// Pseudocode for the validation orchestrator
async function validateAllSources(
  ontologyNodes: OntologyNode[],
  sources: Source[],
  allMappings: Record<string, Mapping[]>,
): Promise<Record<string, ViolationRecord[]>> {
  const shapesStore = generateShaclShapes(ontologyNodes)
  const results: Record<string, ViolationRecord[]> = {}

  for (const source of sources) {
    const sourceMappings = allMappings[source.id] ?? []
    if (sourceMappings.length === 0) continue

    // Parse source schema into RDF store
    const sourceStore = await parseTurtleToStore(source)

    // Execute all CONSTRUCTs for this source, merge into one data store
    const dataStore = new N3.Store()
    for (const mapping of sourceMappings) {
      const quads = executeConstruct(sourceStore, mapping)
      for (const q of quads.match()) {
        dataStore.addQuad(q)
      }
    }

    // Validate
    const violations = await runValidation(shapesStore, dataStore)
    results[source.id] = violations.map(v => ({
      ...v,
      id: crypto.randomUUID(),
      sourceId: source.id,
      mappingId: sourceMappings[0]?.id ?? '',
      canvasNodeId: resolveCanvasNodeId(v.sourceShapeUri, ontologyNodes),
      canvasEdgeId: null,
    }))
  }

  return results
}
```

### Source Status Badge Component Sketch

```tsx
// src/components/ui/SourceStatusBadge.tsx
import { CheckCircleIcon, WarningCircleIcon, CircleIcon } from '@phosphor-icons/react'
import { useSourceStatus } from '@/store/validationStore'

export function SourceStatusBadge({ sourceId }: { sourceId: string }) {
  const status = useSourceStatus(sourceId)

  if (status === 'valid')     return <CheckCircleIcon  className="text-green-600 shrink-0" size={14} />
  if (status === 'violation') return <WarningCircleIcon className="text-destructive shrink-0" size={14} />
  return <CircleIcon className="text-muted-foreground shrink-0" size={14} />
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| shacl-js (abandoned) | rdf-validate-shacl | 2019 | rdf-validate-shacl is the maintained fork; do not use shacl-js |
| @zazuko/env-node (Node only) | @zazuko/env/web.js | 2023 | web.js entry avoids fs/stream deps; required for Vite browser builds |
| SHACLValidator({ factory: N3.DataFactory }) | ShaclFactory adapter | Ongoing | N3 DataFactory missing dataset(); workaround stable since issue #143 |
| Comunica for all SPARQL | N3.Store direct matching for simple CONSTRUCT | N/A for Phase 5 | Avoids 500KB+ bundle addition in this phase |

**Deprecated/outdated:**
- `shacl-js` (npm): abandoned, do not use; rdf-validate-shacl is the successor
- `@zazuko/env-node` for browser builds: do not use; use `@zazuko/env/web.js`

---

## Open Questions

1. **TypeScript types for rdf-validate-shacl**
   - What we know: The library is written in TypeScript (73.5% TS per GitHub). Package exports types.
   - What's unclear: Whether the exported `ValidationResult` type correctly types `message` as `Term[]` or `string[]`.
   - Recommendation: After install, check `node_modules/rdf-validate-shacl/src/validation-result.ts` directly. Expect `message` to be an array of RDF Terms; call `.value` on each.

2. **@zazuko/env web.js bundle impact**
   - What we know: It avoids Node fs/stream deps. Includes clownface and rdf-dataset-ext.
   - What's unclear: Exact bundle size delta.
   - Recommendation: Run `npm run build` after installation and compare gzip sizes. If >100KB, consider the minimal N3 adapter only (4-line ShaclFactory, no @zazuko/env).

3. **Source Turtle generation for validation data store**
   - What we know: SourcePanel already calls `jsonToSchema` which returns `.turtle`. N3.Parser can parse it.
   - What's unclear: Whether `jsonToSchema` output includes `rdf:type` triples needed for SHACL `sh:targetClass` matching.
   - Recommendation: Read `src/lib/jsonToSchema.ts` before implementing Phase 5. If the output lacks `rdf:type`, add it to the turtle template in `jsonToSchema` or coerce in the validation pipeline.

4. **Comunica Vite process.env (Phase 6 blocker)**
   - What we know: Fix is `define: { "process.env": JSON.stringify({}) }` in vite.config.ts.
   - What's unclear: Whether `vite-plugin-node-polyfills` already handles this.
   - Recommendation: Phase 6 should test this immediately after installing `@comunica/query-sparql`. The current `vite.config.ts` sets `globals: { process: false }` which explicitly disables process polyfill — may conflict.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | none — auto-detected via `vite.config.ts` |
| Quick run command | `npm run test -- --reporter=dot src/__tests__/shacl.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-33 | `generateShaclShapes(nodes)` produces correct NodeShape triples | unit | `npm run test -- src/__tests__/shacl.test.ts` | Wave 0 |
| REQ-34 | `ShaclFactory.dataset([...quads])` returns N3.Store; validator instantiates | unit | `npm run test -- src/__tests__/shacl.test.ts` | Wave 0 |
| REQ-35 | Full pipeline: construct → merge → validate; violations returned for bad data | unit | `npm run test -- src/__tests__/shacl.test.ts` | Wave 0 |
| REQ-36 | `ViolationRecord` fields all populated from report | unit | `npm run test -- src/__tests__/shacl.test.ts` | Wave 0 |
| REQ-37 | `useSourceStatus` returns 'unmapped' / 'valid' / 'violation' correctly | unit | `npm run test -- src/__tests__/validationStore.test.ts` | Wave 0 |
| REQ-38 | Violation click calls setActiveSourceId + updateNode | integration/manual | Playwright e2e (future) | manual |

### Sampling Rate
- **Per task commit:** `npm run test -- src/__tests__/shacl.test.ts src/__tests__/validationStore.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green + `npm run build` succeeds before `verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/shacl.test.ts` — covers REQ-33, REQ-34, REQ-35, REQ-36
- [ ] `src/__tests__/validationStore.test.ts` — covers REQ-37

---

## Sources

### Primary (HIGH confidence)
- GitHub issue zazuko/rdf-validate-shacl #143 — N3.DataFactory missing dataset(), workaround ExtendedDataFactory pattern
- rdf-validate-shacl README (packages/shacl) — constructor options, ValidationReport.conforms, results shape
- rdf-validate-shacl source (validation-report.ts) — ValidationResult getter list: message, path, focusNode, severity, sourceConstraintComponent, sourceShape, value, detail
- reactflow.dev/api-reference/types/react-flow-instance — updateNode, setNodes, fitView TypeScript signatures
- reactflow.dev/api-reference/types/node — selected, style, className, data properties
- W3C SHACL spec — sh:NodeShape, sh:targetClass, sh:property, sh:path, sh:datatype, sh:class semantics
- bobdc.com/blog/rdfs2shacl — SPARQL CONSTRUCT pattern for RDFS→SHACL conversion (verified against spec)

### Secondary (MEDIUM confidence)
- comunica/comunica GitHub issue #1523 — Vite process.env fix: `define: { "process.env": JSON.stringify({}) }`
- comunica.dev/docs/query/advanced/rdfjs_querying — N3 Store as Comunica source, queryQuads for CONSTRUCT
- spinrdf.org/shacl-and-owl — OWL cardinality to SHACL count mapping table

### Tertiary (LOW confidence)
- npm show @zazuko/env — version 3.0.1, dependencies list; web.js entry confirmed but bundle size unverified
- npm show rdf-validate-shacl — version 0.6.5; clownface 2.0.x, @rdfjs/dataset dependencies confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — library versions verified via npm registry; factory adapter pattern verified against source code and issue
- Architecture: HIGH — patterns follow existing codebase conventions (N3.Store, Zustand slices, React Flow node data)
- Pitfalls: HIGH — blank node pitfall and range shorthand pitfall verified against actual source code in rdf.ts and types/index.ts
- Comunica Phase 6 warning: MEDIUM — vite.config.ts polyfill exclusion may interact with process.env fix; needs empirical test

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (rdf-validate-shacl is stable; @zazuko/env 3.x is stable; React Flow 12.x is stable)
