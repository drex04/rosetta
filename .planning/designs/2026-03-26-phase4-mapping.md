# Phase 4: Mapping (Per-Source) — Design

**Date:** 2026-03-26
**Phase:** 04-mapping
**Status:** Approved

---

## User Experience

1. User drags from a **SourceNode property handle** → **ClassNode property handle** on the canvas — a dashed-green **mapping edge** appears.
2. **MAP tab** shows a list of all mappings for the active source (source prop → target prop labels).
3. Each mapping has a **Direct** (1:1) or **SPARQL CONSTRUCT** mode with an auto-generated, editable SPARQL query in CodeMirror.
4. Multiple edges to the same class pair are visually **grouped** — a bundled edge with a count badge.

---

## Data Model

```typescript
interface Mapping {
  id: string
  sourceId: string
  sourceClassUri: string
  sourcePropUri: string
  targetClassUri: string
  targetPropUri: string
  kind: 'direct' | 'sparql'
  sparqlConstruct: string   // auto-generated, user-editable
}
```

---

## mappingStore

```typescript
{
  mappings: Record<string, Mapping[]>  // keyed by sourceId
  selectedMappingId: string | null
  addMapping(m: Omit<Mapping, 'id'>): void
  removeMapping(id: string): void
  updateMapping(id: string, patch: Partial<Mapping>): void
  getMappingsForSource(sourceId: string): Mapping[]
}
```

---

## Canvas Integration

- `useCanvasData()` extended: materializes mapping edges for active source as `mappingEdge` React Flow edges
- `onConnect` handler: validates source↔master connection, creates Mapping + auto-generates CONSTRUCT
- SourceNode right-side handles + ClassNode left-side handles become connectable for mapping

---

## SPARQL CONSTRUCT Auto-Generation

```sparql
PREFIX src: <http://example.org/src_nation1_/>
PREFIX nato: <http://nato.int/ontology/>

CONSTRUCT {
  ?target a nato:AirTrack .
  ?target nato:azimuthDeg ?val .
}
WHERE {
  ?src a src:RadarTrack .
  ?src src:azimuth ?val .
}
```

---

## Plan Breakdown

| Plan | Focus | Key Deliverables |
|------|-------|-----------------|
| 04-01 | Foundation | `Mapping` types, `mappingStore`, `mappingEdge` component (dashed green), handle connectivity |
| 04-02 | Interaction | `onConnect` wiring, SPARQL generator (`src/lib/sparql.ts`), `MappingPanel`, MAP tab wired |
| 04-03 | Persistence | IDB save/load, `ProjectFile` mapping type, edge grouping visual |
