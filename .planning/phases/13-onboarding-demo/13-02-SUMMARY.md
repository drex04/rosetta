---
plan: 13-02
phase: 13
title: Example Project Wiring
status: complete
commit: 6b6bef9
one_liner: Wired 3-source example project (Norway JSON, Germany JSON, UK XML) with 5 pre-seeded Norway mappings
test_metrics:
  tests_passed: 337
  tests_failed: 0
  build: pass
---

# Summary: 13-02 Example Project Wiring

## What Was Built

- **`src/components/layout/Header.tsx`** — `handleExampleProject` updated to load 3 sources:
  - Norway (JSON, flat, 12 fields) via existing JSON parse path
  - Germany (JSON, nested) via existing JSON parse path
  - United Kingdom (XML) via `xmlToSchema(sampleUkRaw, 'United Kingdom')` with `dataFormat: 'xml'`
  - 5 pre-seeded direct mappings for Norway: `trkNo→nato:trackNumber`, `lat→nato:latitude`, `lon→nato:longitude`, `spd_kts→nato:speedKts`, `time→nato:timestamp`

All work was already present from a prior session; verification confirmed it met all plan must-haves.

## Verification

- Build: ✓ clean
- Tests: ✓ 337/337 passed
