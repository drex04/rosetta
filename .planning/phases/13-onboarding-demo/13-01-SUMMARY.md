---
plan: 13-01
phase: 13
title: Example Data Assets
status: complete
commit: 164e3c1
one_liner: Enriched NATO ontology, 3 multi-nation radar sources, and comprehensive SHACL shapes for onboarding demo
test_metrics:
  tests_passed: 337
  tests_failed: 0
  build: pass
---

# Summary: 13-01 Example Data Assets

## What Was Built

Replaced all minimal placeholder data assets with a rich NATO air defense scenario:

- **`src/store/ontologyStore.ts`** — SEED_TURTLE now references `sample-ontology.ttl` (loaded as `?raw`) defining `nato:Track` (5 properties) and `nato:AirTrack` (7 air-specific properties, subClassOf Track), all with `rdfs:label`; prefix URI standardized to `https://nato.int/ontology#`
- **`src/data/sample-ontology.ttl`** — new Turtle file with full OWL class/property definitions
- **`src/data/sample-source-a-norwegian.json`** — 5 flat-structure NASAMS/NORSE-3D radar tracks (NOR, 12 fields each, IFF: 2 FRI/1 HOS/1 NEU/1 UNK)
- **`src/data/sample-source-b-german.json`** — 5 nested PATRIOT/ADLER-2000 radar targets (DEU, German field names, hoehe_m/geschwindigkeit_kmh unit differences)
- **`src/data/sample-source-c-uk.xml`** — 4 hierarchical Giraffe AMB/Sentinel radar tracks (GBR, XML with Position/Kinematics/Identification sub-elements, `ASSUMED_FRIEND` IFF corrected)
- **`src/data/sample-shapes.ttl`** — replaced minimal shapes with `nato:TrackShape` + `nato:AirTrackShape` covering all 12 properties with datatype, minCount, pattern, and range constraints

## Verification

- Build: ✓ clean (no TS errors)
- Tests: ✓ 337/337 passed
- All plan must-have truths satisfied
