# Plan Review — Phase 11: SHACL Authoring (2026-04-04)

**Mode:** HOLD SCOPE

---

## System Audit

- **Codebase:** FRESH (1 minor refactor commit since mapping)
- **No FLOWS.md/ERD.md** — advisory gap only
- **Key existing code:** `TurtleEditorPanel.tsx` (reused), `generateShapes()` (extended), `validationStore` (extended), `validateSource()` (4th param added)
- **Stash:** None. No in-flight branches.

---

## Decisions Made

| # | Issue | Decision |
|---|-------|----------|
| 1 | TurtleEditorPanel hardcodes "ontology.ttl" | Add `filename?` + `downloadLabel?` props; defaults unchanged |
| 2 | Whitespace-only shapes string bypasses empty check | Use `.trim()` check in `validateSource` and `resetShapesToAuto` |
| 3 | Sample project overwrites user-edited shapes | Always overwrite — consistent with full-reset contract |
| 4 | No E2E test | Add `e2e/shacl-authoring.spec.ts` (3 tests) |
| 5 | IDB via direct idb-keyval (separate key) | Follow useAutoSave pattern — snapshot/hydrate on single key |

---

## Error & Rescue Registry

| Method | Error | Rescued? | User sees |
|--------|-------|----------|-----------|
| generateShapesTurtle | N3.Writer cb error | Y (rej → caught in resetShapesToAuto try/catch) | Editor unchanged |
| validateSource | N3.Parser invalid Turtle | Y → fallback to generateShapes | Nothing (transparent) |
| validateSource | whitespace-only string | Y → .trim() check → fallback | Nothing (transparent) |
| runValidation | validateSource throws | Y → error string in store | Error banner in panel |
| useAutoSave hydrate | IDB missing validation key | Y → `?? {}` default | Fresh empty state |
| resetShapesToAuto | generateShapesTurtle throws | Y → try/catch, leave unchanged | Silent (editor unchanged) |

---

## Architecture Diagram

```
ValidationPanel.tsx
    │
    ├──▶ validationStore ──────────────────────▶ validateSource() (shacl/index.ts)
    │         │                                        │
    │         │                                  userShapesTurtle?.trim()
    │         │                                        │ yes: N3.Parser → shapesStore
    │         │                                        │   err → fallback to generateShapes
    │         │                                        │ no: generateShapes(ontologyNodes)
    │         │
    │         ├──▶ snapshot()/hydrate() ──▶ useAutoSave (rosetta-project IDB key)
    │         │
    │         └──▶ generateShapesTurtle() (shapesGenerator.ts)
    │                   └─ N3.Writer (async, callback, try/catch in resetShapesToAuto)
    │
    ├──▶ TurtleEditorPanel (reused, filename="shapes.ttl")
    │
    └──▶ Accordion (shadcn, type="multiple")

Header.tsx ──▶ sample-shapes.ttl (raw import) ──▶ setUserShapesTurtle() [always overwrites]
```

---

## Test Coverage Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                     TEST COVERAGE DIAGRAM                            │
├─────────────────────────────────┬────────────┬───────────────────────┤
│ CODEPATH                        │ TEST TYPE  │ STATUS                │
├─────────────────────────────────┼────────────┼───────────────────────┤
│ generateShapesTurtle empty      │ Unit       │ ✓ Planned (Task 1)    │
│ generateShapesTurtle single node│ Unit       │ ✓ Planned (Task 1)    │
│ generateShapesTurtle no-URI node│ Unit       │ ✓ Planned (Task 1)    │
│ validateSource user shapes valid│ Unit       │ ✓ Planned (Task 2)    │
│ validateSource invalid Turtle   │ Unit       │ ✓ Planned (Task 2)    │
│ validateSource empty string     │ Unit       │ ✓ Planned (Task 2)    │
│ validateSource whitespace only  │ Unit       │ ✓ Added (review)      │
│ resetShapesToAuto throws        │ Unit       │ ✓ Added (review/try-catch) │
│ IDB hydrate type guard          │ Unit       │ ✓ Planned (Task 3)    │
│ Accordion + editor seeded       │ Human      │ ✓ Task 4 checkpoint   │
│ E2E: editor seeded on open      │ E2E        │ ✓ Added (Task 6)      │
│ E2E: Reset repopulates          │ E2E        │ ✓ Added (Task 6)      │
│ E2E: sample project → shapes   │ E2E        │ ✓ Added (Task 6)      │
└─────────────────────────────────┴────────────┴───────────────────────┘
```

---

## Dream State Delta

```
CURRENT STATE              THIS PLAN                    12-MONTH IDEAL
Shapes are auto-gen'd  →   User edits shapes in     →   Live error markers,
only, no user control      CodeMirror editor;           per-shape toggles,
                           Reset seeds from onto;        import/export .ttl,
                           sample .ttl loads with        shapes version history
                           sample project
```
This plan reaches ~70% of the 12-month ideal. Remaining 30% is captured in CONTEXT.md Deferred Ideas.

---

## Files Added to files_modified by Review

- `src/components/panels/TurtleEditorPanel.tsx` — filename prop
- `src/hooks/useAutoSave.ts` — validation snapshot/hydrate wiring
- `e2e/shacl-authoring.spec.ts` — E2E tests (new file)

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | FRESH codebase; no FLOWS/ERD                |
| Step 0               | HOLD confirmed; 4 impl gaps surfaced         |
| Section 1  (Arch)    | 1 issue (TurtleEditorPanel filename)        |
| Section 2  (Errors)  | 6 error paths mapped, 0 GAPS after fixes    |
| Section 3  (Security)| 0 issues (client-side, no new surface)      |
| Section 4  (Data/UX) | 3 edge cases mapped, 2 addressed           |
| Section 5  (Tests)   | Diagram produced, 2 gaps → added           |
| Section 6  (Future)  | Reversibility: 4/5, debt: IDB key (fixed)  |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 1 issue (async resetShapesToAuto typing)   |
| Section 8  (Code Ql) | 0 DRY violations, 0 over/under-eng         |
| Section 9  (Eng Test)| Test diagram produced, 2 gaps → filled     |
| Section 10 (Perf)    | 0 issues (bounded dataset size)            |
+--------------------------------------------------------------------+
| PLAN.md updated      | 5 truths added, 3 files added to modified   |
| CONTEXT.md updated   | 6 review decisions logged                   |
| Error/rescue registry| 6 methods, 0 CRITICAL GAPS                  |
| Failure modes        | 6 total, 0 CRITICAL GAPS                    |
| Delight opportunities| N/A (HOLD mode)                             |
| Diagrams produced    | 3 (architecture, error flow, test coverage) |
| Unresolved decisions | 0                                           |
+====================================================================+
```
