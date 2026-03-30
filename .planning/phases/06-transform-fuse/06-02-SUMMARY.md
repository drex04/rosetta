---
phase: 06-transform-fuse
plan: 02
status: complete
commit: db45efb
test_metrics:
  unit_pass: 149
  unit_fail: 0
  build: pass
---

# Plan 06-02 Summary: Mapping Kinds, Kind Picker, OutputPanel Sub-tabs

## What Was Built

- **`src/lib/sparql.ts`**: `generateConstruct` now dispatches on all 7 mapping kinds — `direct` (unchanged), `template` (BIND STR + comment), `constant` (BIND literal with datatype), `typecast` (STRDT), `language` (STRLANG), `join` (FILTER(false) stub), `sparql` (pass-through). Signature updated to `Omit<Mapping, 'id' | 'sparqlConstruct'>`.
- **`src/components/panels/MappingPanel.tsx`**: Kind picker `<select>` with `data-testid="kind-picker"` added below SPARQL editor header. Kind-specific inline fields render for `template`, `constant`, `typecast`, `language`, `join`. Kind change auto-regenerates SPARQL via `handleRegenerate(newKind)` override pattern.
- **`src/components/panels/OutputPanel.tsx`**: Three sub-tabs — **Ontology** (existing Turtle/JSON-LD preserved), **Fused** (Transform & Fuse button, loading spinner, stale badge, error, source summary, JSON/JSON-LD download, pre viewer), **Export** (placeholder for 06-03). Fused tab wired to `useFusionStore`. Stale detection subscribes to mappingStore + sourcesStore changes.
- **`src/__tests__/sparql.test.ts`**: 6 new test cases covering all new kinds — join (FILTER(false)), constant (BIND), typecast (STRDT), language (STRLANG), template (BIND+comment), direct regression.

## Must-Haves Coverage

- ✅ Mapping.kind 7-item union + kind-specific optional fields
- ✅ generateConstruct handles join with FILTER(false) + # JOIN placeholder
- ✅ generateConstruct handles constant (BIND), typecast (STRDT), language (STRLANG), template (REPLACE hint)
- ✅ MappingPanel shows kind select; non-direct/sparql kinds render inline fields
- ✅ OUT tab three sub-tabs: Ontology (format toggle preserved), Fused (Transform + results), Export (placeholder)
- ✅ Transform button calls runFusion(); loading spinner during execution; source summary + downloads on success
- ✅ Stale detection useEffect subscribes to mappingStore + sourcesStore

## Files Changed

- `src/lib/sparql.ts`
- `src/components/panels/MappingPanel.tsx`
- `src/components/panels/OutputPanel.tsx`
- `src/__tests__/sparql.test.ts`
- `src/components/layout/Header.tsx` (kind: 'direct' added to generateConstruct call)
- `src/components/canvas/OntologyCanvas.tsx` (kind: 'direct' added to generateConstruct call)

## Issues Encountered

None. Build and tests passed cleanly on first attempt.
