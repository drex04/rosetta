---
phase: 08-source-ontology-editing
plan: 01
subsystem: sources
tags: [xml, file-upload, format-detection, rdf]
requires: []
provides:
  - "XML source ingestion via xmlToSchema (DOM walker → RDFS schema)"
  - "File upload button in SourcePanel with format auto-detection"
  - "Source.rawData + Source.dataFormat fields with IDB migration from old json field"
  - "detectFormat utility (content + file-based)"
  - "clearMappingsForSource on format change"
affects: [08-02, 08-03, 08-04]
tech-stack:
  added: ["@codemirror/lang-xml"]
  patterns: ["DOMParser DOM walker", "format-keyed CodeMirror remount", "IDB migration guard"]
key-files:
  created:
    - src/lib/xmlToSchema.ts
    - src/lib/detectFormat.ts
    - src/__tests__/xmlToSchema.test.ts
    - src/__tests__/detectFormat.test.ts
    - src/__tests__/sourceMigration.test.ts
  modified:
    - src/types/index.ts (via sourcesStore.ts)
    - src/store/sourcesStore.ts
    - src/store/mappingStore.ts
    - src/hooks/useAutoSave.ts
    - src/components/panels/SourcePanel.tsx
    - src/components/layout/Header.tsx
    - src/components/layout/SourceSelector.tsx
    - src/lib/fusion.ts
    - src/lib/rml.ts
    - src/lib/shacl/index.ts
    - src/lib/yarrrml.ts
key-decisions:
  - "Using React key={dataFormat} on CodeMirror editor to remount with correct language extension on format switch — avoids manual extension swap"
  - "clearMappingsForSource added to mappingStore (was missing from interface) — required for format-change safety"
  - "File upload >1MB rejected with inline banner (no toast library) — matches existing invalid-json banner pattern"
requirements-completed:
  - REQ-58
  - REQ-59
  - REQ-60
  - REQ-61
test_metrics:
  tests_passed: 193
  tests_failed: 0
  tests_total: 193
  coverage_line: null
  coverage_branch: null
  test_files_created:
    - src/__tests__/xmlToSchema.test.ts
    - src/__tests__/detectFormat.test.ts
    - src/__tests__/sourceMigration.test.ts
  spec_tests_count: 0
duration: ~15min
completed: "2026-03-31T19:30:00.000Z"
---

## Performance Metrics

- Build: zero TS errors, pre-existing chunk size warning only
- Tests: 193/193 unit tests passing; 15 e2e files skipped (require dev server — expected per CLAUDE.md)

## What Was Done

- **Source interface**: Renamed `Source.json` → `Source.rawData: string`, added `Source.dataFormat: 'json' | 'xml'`. Updated all 9+ callsites across store, lib, and components.
- **IDB migration**: `migrateSource()` in sourcesStore upgrades old `json`-field IDB records to `rawData`/`dataFormat: 'json'` on hydration.
- **xmlToSchema**: DOM walker using `DOMParser` — elements with children → `rdfs:Class`, leaf elements → `DatatypeProperty`, attributes → `@attr` DatatypeProperty, nesting → ObjectProperty edge. maxDepth=10 guard. N3.Writer Turtle output. Same `SchemaResult` shape as jsonToSchema.
- **detectFormat**: `detectFormatFromContent` (first-char heuristic) + `detectFormatFromFile` (MIME → extension → unknown).
- **SourcePanel**: File upload button (UploadSimpleIcon), hidden input with `.json,.xml` accept, 1MB guard, FileReader error handling. Auto-detection on paste, `key={dataFormat}` remount of CodeMirror. Format badge (amber=JSON, blue=XML). Schema dispatch routes to xmlToSchema or jsonToSchema based on dataFormat.
- **mappingStore**: Added `clearMappingsForSource(sourceId)` — removes mappings and resets selectedMappingId.

## Decisions Made

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| `key={dataFormat}` remount for CodeMirror language switch | Simplest correct approach; avoids imperative extension manipulation | `EditorState.reconfigure()` — more complex |
| Inline banner for error/warning messages | No toast library in project; matches existing invalid-json pattern | Add sonner — unnecessary dependency |
| maxDepth=10 guard in DOM walker | Prevents stack overflow on pathological XML | No guard — risk of browser crash |

## Deviations from Plan

- [Rule 1 - Bug] `clearMappingsForSource` referenced in plan but missing from mappingStore — added interface + implementation before use in SourcePanel.
- [Rule 3 - Blocking] `UploadSimple` icon deprecated in Phosphor v2 — replaced with `UploadSimpleIcon` (Icon-suffix pattern used throughout codebase).

## Issues Encountered

None blocking. Minor: concurrent Task 1 and Task 2 execution caused transient TS errors (Task 1 renaming Source.json while Task 2 ran); resolved automatically when both completed.

## Next Phase Readiness

- **08-02** (ontology editor): Source.rawData/dataFormat in place. SourcePanel structure updated.
- **08-03** (bidirectional sync): xmlToSchema produces SchemaResult identical to jsonToSchema — sync logic unchanged.
- **08-04** (join nodes): mappingStore.clearMappingsForSource available.

## Test Results

- **Tests:** 193/193 passing
- **Coverage:** not configured
- **Test files created:** xmlToSchema.test.ts (22 tests), detectFormat.test.ts (16 tests), sourceMigration.test.ts (migration guard)
- **Spec-generated tests:** no
