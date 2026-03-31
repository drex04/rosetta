# Plan Review — 06-03 RML/YARRRML Export
Date: 2026-03-30 | Mode: HOLD SCOPE

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | 06-01/02/03 unexecuted; Mapping type still  |
|                      | 'direct'|'sparql' only; plan deps correct    |
| Step 0               | Scope accepted; expansion note saved        |
| Section 1  (Arch)    | 0 structural issues; clean pure-fn design   |
| Section 2  (Errors)  | 3 CRITICAL GAPS fixed in plan               |
| Section 3  (Security)| 0 issues — client-side only, no new surface |
| Section 4  (Data/UX) | 5 edge cases mapped, 3 fixed in plan        |
| Section 5  (Tests)   | Diagram produced; 7 gaps fixed              |
| Section 6  (Future)  | Reversibility: 5/5, 1 debt item noted       |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 0 issues                                    |
| Section 8  (Code Ql) | 1 fragile import note hardened              |
| Section 9  (Eng Test)| Test diagram produced; 7 gaps addressed     |
| Section 10 (Perf)    | 0 issues — O(n×m) trivial at this scale     |
+--------------------------------------------------------------------+
| PLAN.md updated      | 2 truths added, 0 artifacts added           |
| CONTEXT.md updated   | 4 decisions locked, 2 items deferred        |
| Error/rescue registry| 3 methods, 3 CRITICAL GAPS → fixed in PLAN  |
| Failure modes        | 3 total, all CRITICAL, all fixed            |
| Delight opportunities| 1 saved to deferred (HOLD mode)             |
| Diagrams produced    | architecture, data flow, test coverage      |
| Unresolved decisions | 0                                           |
+====================================================================+
```

## Critical Gaps Fixed

### GAP 1: inferIterator — null/number JSON parse result → TypeError
`JSON.parse('null')` returns `null`; plan then called `Object.entries(null)` → crash.
**Fix:** Added guard — if `parsed === null` or `typeof parsed !== 'object'`, return `'$'`.
Tests added: `inferIterator('null')` → `'$'`, `inferIterator('42')` → `'$'`.

### GAP 2: deriveSubjectTemplate — blank node template invalid in rr:template
Plan spec said: `'_:r{trackId}'` as no-properties fallback.
`rr:template` only generates IRIs; blank node syntax is invalid here.
**Fix:** Sole fallback is `'http://example.org/{classLocalName}/{index}'`.
Test added: verifies subject template never starts with `_:`.

### GAP 3: YARRRML constant kind po entry — leading space bug
Spec had `[" <${targetPropUri}>", ...]` — extra leading space produces malformed YARRRML.
**Fix:** Corrected to `["<${targetPropUri}>", ...]`.
Test added: regression check that constant po entry has no leading space.

## Architecture Diagram

```
OutputPanel.tsx
     │
     ├── OntologyTab  ──▶  useOntologyStore          [existing]
     ├── FusedTab     ──▶  useFusionStore             [06-02]
     └── ExportTab
              ├──▶ generateRml(sources, mappings)     [rml.ts — new]
              │         └── inferIterator(json)       [exported helper]
              │         └── deriveSubjectTemplate()   [internal]
              └──▶ generateYarrrml(sources, mappings) [yarrrml.ts — new]
                        └── inferIterator             [imported from rml.ts]
                        └── localName                 [from lib/rdf.ts]
```

## inferIterator Data Flow

```
jsonString
     │
     ▼
JSON.parse()
     │
     ├── SyntaxError ──────────────────────────────▶ return '$[*]' ✓
     │
     ▼
parsed result
     │
     ├── Array.isArray() = true ───────────────────▶ return '$[*]' ✓
     │
     ├── null or typeof !== 'object' [NEW GUARD] ──▶ return '$'    ✓
     │
     ▼
plain object — scan keys
     │
     ├── first key with array value found ─────────▶ return '$.key[*]' ✓
     │
     └── no array values ──────────────────────────▶ return '$'    ✓
```

## Test Coverage Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     TEST COVERAGE — 06-03 (post-review)                 │
├────────────────────────────────────┬─────────────┬──────────────────────┤
│ CODEPATH                           │ TEST TYPE   │ STATUS               │
├────────────────────────────────────┼─────────────┼──────────────────────┤
│ inferIterator — array root         │ Unit        │ ✓ test 1             │
│ inferIterator — flat object        │ Unit        │ ✓ test 2             │
│ inferIterator — nested array key   │ Unit        │ ✓ test 3             │
│ inferIterator — invalid JSON       │ Unit        │ ✓ test 4             │
│ inferIterator — null parse result  │ Unit        │ ✓ test 5 [new]       │
│ inferIterator — number parse result│ Unit        │ ✓ test 6 [new]       │
│ generateRml — direct mapping       │ Unit        │ ✓ test 7             │
│ generateRml — sparql kind annotated│ Unit        │ ✓ test 8             │
│ generateRml — constant kind        │ Unit        │ ✓ test 9             │
│ generateRml — language kind        │ Unit        │ ✓ test 10 [new]      │
│ generateRml — typecast kind        │ Unit        │ ✓ test 11 [new]      │
│ generateRml — empty source skipped │ Unit        │ ✓ test 12            │
│ deriveSubjectTemplate — no props   │ Unit        │ ✓ test 13 [new]      │
│ generateYarrrml — direct mapping   │ Unit        │ ✓ test 1             │
│ generateYarrrml — sparql annotated │ Unit        │ ✓ test 2             │
│ generateYarrrml — language kind    │ Unit        │ ✓ test 3             │
│ generateYarrrml — empty sources    │ Unit        │ ✓ test 4             │
│ generateYarrrml — typecast kind    │ Unit        │ ✓ test 5 [new]       │
│ generateYarrrml — constant no space│ Unit        │ ✓ test 6 [new]       │
│ generateYarrrml — no js-yaml import│ Static      │ ✓ test 7             │
└────────────────────────────────────┴─────────────┴──────────────────────┘
```

## What Already Exists
- `downloadBlob` helper in OutputPanel.tsx — reused, not duplicated
- `localName` in src/lib/rdf.ts — imported by both rml.ts and yarrrml.ts
- `mappings: Record<string, Mapping[]>` in mappingStore — matches function signatures exactly

## Dream State Delta
```
CURRENT STATE          THIS PLAN               12-MONTH IDEAL
No export files  ──▶  RML + YARRRML          + Multi-level JSONPath inference
                       download from UI         + Live RML preview per record
                       SPARQL annotated         + Round-trip RML import
                       Pure fn library          + SPARQL template library (REQ-58)
```
