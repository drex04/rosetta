# Architecture Decisions

Autonomous and manually logged decisions made during this project.

| ID | Decision | Confidence | Affects | Status |
|----|----------|------------|---------|--------|

## DEC-001: Skipped build in phase 5 after repeated failure
- **Status:** ACTIVE ⚠ NEEDS REVIEW
- **Confidence:** LOW
- **Context:** Step "build" failed 2 time(s). Last error: claude -p exited with code 1
stderr: 
- **Decision:** Skipping step and continuing to next. Manual intervention required.
- **Affects:** Phase 5, step build

## DEC-002: Skipped review in phase 5 after repeated failure
- **Status:** ACTIVE ⚠ NEEDS REVIEW
- **Confidence:** LOW
- **Context:** Step "review" failed 2 time(s). Last error: claude -p exited with code 1
stderr: 
- **Decision:** Skipping step and continuing to next. Manual intervention required.
- **Affects:** Phase 5, step review

# Phase 06 Autonomous Decisions

> Written by: plan-work Step 3 (auto mode)
> Date: 2026-03-30

These decisions were made autonomously (workflow.auto_advance=true) and not yet reviewed by the user.

---

## Decision 1 — Comunica lazy-loading via dynamic import
- **Category:** architecture
- **Decision:** Install `@comunica/query-sparql` and access it via `await import('@comunica/query-sparql')` inside `fusion.ts`. A module-level singleton caches the engine after first instantiation. Vite code-splits the Comunica bundle into a separate chunk loaded only when the user clicks "Transform & Fuse".
- **Why:** Comunica has ~200 transitive dependencies and produces a 3–5 MB bundle chunk. Static import would penalise initial page load. Dynamic import defers cost to the first fusion run.
- **Alternatives considered:** (a) Static import — simpler but unacceptable load-time penalty for a learning tool; (b) Replace Comunica with extended N3.Store pattern matcher — would not handle user-edited/arbitrary SPARQL CONSTRUCT queries, which REQ-40 requires.
- **Expand scope note:** A more ambitious version would pre-compile SPARQL queries at "save mapping" time and warn on parse errors.

## Decision 2 — fusionStore is ephemeral (no IDB persistence)
- **Category:** architecture
- **Decision:** `fusionStore.ts` holds fusion results in memory only. Not saved to IndexedDB. Results are lost on page reload; user re-runs fusion by clicking "Transform & Fuse".
- **Why:** Mirrors the validationStore precedent (also ephemeral). The fused output is always derivable from sources + mappings, so persisting it adds IDB complexity with no durability benefit.
- **Alternatives considered:** Persist the fused JSON string to IDB under a dedicated key — adds hydration/stale-invalidation complexity without meaningful user benefit.
- **Expand scope note:** A production version might auto-save the last fused output with a `lastFusedAt` timestamp for diff inspection.

## Decision 3 — Provenance via `prov:wasAttributedTo` literal annotation
- **Category:** architecture
- **Decision:** After fusing all source quads, `fuseSources()` adds one `<entity> prov:wasAttributedTo "<sourceName>"^^xsd:string` triple per distinct subject in each source's output quads. Prefix `prov: <http://www.w3.org/ns/prov#>`.
- **Why:** REQ-42 asks for provenance annotations per entity. A simple literal satisfies the educational goal without requiring a full PROV-O graph or named graphs.
- **Alternatives considered:** (a) Named graphs — each source's quads in a separate named graph — adds N-Quads complexity and breaks simple JSON-LD serialization; (b) Full PROV-O activity/agent model — over-engineered for a learning tool.
- **Expand scope note:** A production system would use `prov:wasDerivedFrom` pointing to a `prov:Entity` with a dataset URI, enabling lineage queries.

## Decision 4 — JSON-LD compaction (not full framing) for fused output
- **Category:** architecture
- **Decision:** `jsonldFramer.ts` serializes fused N3.Store to N-Quads → `jsonld.fromRDF()` → `jsonld.compact()` with an auto-derived `@context` built from ontology class/property URIs. Skip `jsonld.frame()` for Phase 6.
- **Why:** `jsonld.frame()` requires a well-formed frame document that precisely matches the data graph; auto-derivation from an arbitrary OntologyNode[] hierarchy is non-trivial and error-prone. `compact()` produces human-readable output with stable `@context` injection that covers REQ-43's "structured JSON" requirement.
- **Alternatives considered:** Full `jsonld.frame()` with a generated frame document — unacceptable risk of producing an empty `@graph` if frame types don't align with actual data types.
- **Expand scope note:** A future version could offer a "frame editor" that lets users write a JSON-LD frame and preview the structured output.

## Decision 5 — Mapping kind picker: inline form fields (no modal)
- **Category:** product
- **Decision:** In MappingPanel, when a mapping is selected, a `<select>` kind picker appears in the edit form. Kind-specific fields (templatePattern, constantValue, targetDatatype, etc.) render inline below the picker, collapsing/expanding as kind changes.
- **Why:** The right panel is narrow (resizable, min ~240px). A modal for a simple field change would be disruptive. Inline fields match the existing MappingPanel list+editor pattern.
- **Alternatives considered:** Modal/drawer for kind-specific fields — heavier UX, breaks panel flow.

## Decision 6 — `join` kind generates placeholder SPARQL with TODO comment
- **Category:** implementation
- **Decision:** `generateConstruct()` for `kind === 'join'` returns a commented SPARQL stub:
  ```sparql
  # JOIN mapping: manual SPARQL required
  # parentSource: {parentSourceId}, join: {parentRef} = {childRef}
  CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o . FILTER(false) }
  ```
  The YARRRML/RML generators annotate join mappings as `# requires manual conversion`.
- **Why:** Cross-source joins require knowing both sources' iterators and data shapes at SPARQL generation time. A deterministic auto-generator would produce incorrect results. An explicit stub is safer and educational (explains what needs to be done).
- **Alternatives considered:** Heuristic join SPARQL generator — high risk of generating semantically wrong queries silently.

## Decision 7 — RML subject template uses first `*id*`/`*key*` property heuristic
- **Category:** implementation
- **Decision:** In `rml.ts`, `buildSubjectTemplate(classUri, props)` looks for the first property whose local name (lowercased) contains `id` or `key`. If found, uses `{classLocalName}_{$(idPropName)}` as the `rr:template`. If not found, uses `{classLocalName}_{$(firstPropName)}` with the first property. If no properties, uses a blank node template.
- **Why:** RML templates need a stable, unique value per instance. Most real-world schemas have an identifier property. The heuristic covers the common NATO scenario (trackId, unitId, etc.).
- **Alternatives considered:** Always use blank nodes — produces valid RML but loses the referencing ability that makes RML valuable; always use first property — first prop may be a boolean or non-unique value.

## Decision 8 — YARRRML serialized as plain string (no js-yaml dependency)
- **Category:** implementation
- **Decision:** `yarrrml.ts` builds the YAML string character-by-character with manual indentation. Values are quoted with double-quotes. No `js-yaml` or similar dependency added.
- **Why:** The YARRRML output has a predictable, shallow structure (2-3 nesting levels). Adding a dep for ~50 lines of string building is wasteful. The only escaping needed is double-quote chars in values (replaced with `\"`).
- **Alternatives considered:** `js-yaml` — cleaner escaping, handles edge cases automatically, but adds ~60KB to the bundle for minimal benefit at this scale.

## Decision 9 — OUT tab gets three sub-tabs: Ontology | Fused | Export
- **Category:** product
- **Decision:** The OUT tab retains the existing "Ontology" view (Turtle/JSON-LD toggle for master ontology). Two new sub-tabs are added: "Fused" (displays fusionStore output, Transform button, source summary, JSON/JSON-LD download) and "Export" (RML + YARRRML download buttons, SPARQL-kind warning).
- **Why:** REQ-44/45/50 add distinct output types. A sub-tab strip within the OUT panel matches the existing format-toggle pattern and avoids clutter.
- **Alternatives considered:** (a) Separate top-level tabs — would require changes to RightPanel layout and tab ordering; (b) Accordion within OUT panel — more vertical space but harder to navigate.
- **Expand scope note:** A future "Diff" sub-tab could compare before/after fusion for educational inspection.

### D-001: Speculative plan validated: phase 5
- **Category:** implementation
- **Status:** ACTIVE
- **Confidence:** HIGH
- **Context:** No file overlap with predecessor phases (none)
- **Decision:** Plan proceeds as-is (VALID)
- **Affects:** Phase 5

### D-002: Skipped plan-work in phase 6 after repeated failure
- **Category:** implementation
- **Status:** ACTIVE ⚠ NEEDS REVIEW
- **Confidence:** LOW
- **Context:** Step "plan-work" failed 2 time(s). Last error: claude -p exited with code 1
stderr: 

Last output (tail):
```
{"type":"result","subtype":"success","is_error":true,"duration_ms":290,"duration_api_ms":0,"num_turns":1,"result":"You've hit your limit · resets 1pm (UTC)","stop_reason":"stop_sequence","session_id":"5a86c740-0e8d-430b-a314-34a69763e930","total_cost_usd":0,"usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0},"inference_geo":"","iterations":[],"speed":"standard"},"modelUsage":{},"permission_denials":[],"fast_mode_state":"off","uuid":"a49244bf-01a9-4c7d-8939-23363f6c1bb7"}
```
- **Decision:** Skipping step and continuing to next. Manual intervention required.
- **Affects:** Phase 6, step plan-work

# Phase 06 — Autonomous Planning Decisions

Decisions made during plan-work (auto mode). These supplement CONTEXT.md.

---

## D1: Phase 5 dependency — instanceGenerator.ts

**Decision**: Plan 06-01 imports `src/lib/shacl/instanceGenerator.ts` (for `jsonToInstances`). This file is created by Phase 5, Plan 05-01. Executor of Plan 06-01 MUST check whether `src/lib/shacl/instanceGenerator.ts` exists before starting. If Phase 5 has not been built, the executor should inline a minimal `jsonToInstances` implementation in `src/lib/fusion.ts` itself (parse JSON array/objects into N3.Store triples using the same URI prefix logic as `jsonToSchema.ts`). A full Phase 5 implementation provides a richer version — the inline fallback only needs to produce typed instance triples for SPARQL queries to run against.

**Why**: Phase 6 plans were authored independently; build order may vary. The fusion pipeline requires instance data (not just schema) to execute CONSTRUCT queries.

**How to apply**: Before executing Plan 06-01, executor runs `ls src/lib/shacl/instanceGenerator.ts 2>/dev/null`. If absent, inline the minimal implementation.

---

## D2: generateConstruct signature change (Plan 06-02)

**Decision**: `generateConstruct` parameter type changes from `Omit<Mapping, 'id' | 'sparqlConstruct' | 'kind'>` to `Omit<Mapping, 'id' | 'sparqlConstruct'>`. This is a breaking change to all callers. Executor of Plan 06-02 must update all call sites:
- `MappingPanel.tsx` `handleRegenerate()` — pass full `selectedMapping` (already has kind)
- `mappingStore.ts` `addMapping()` — adds `kind: 'direct'` default when calling generateConstruct at mapping creation time

**Why**: New CONSTRUCT generation must dispatch on `kind`. Passing a full Mapping (minus id/sparqlConstruct) is the cleanest way to thread all kind-specific fields.

---

## D3: Sub-tabs string-based, no shadcn Tabs component

**Decision**: OUT tab sub-tabs (Ontology | Fused | Export) use the same hand-rolled pill-button pattern already used in `OutputPanel.tsx` for the Turtle/JSON-LD toggle. Do NOT use shadcn `<Tabs>` component — it would require modifying `components.json` and adds nesting complexity.

**Why**: Consistent with existing panel pattern; avoids a new component dependency in a single file.

---

## D4: yarrrml.ts imports inferIterator from rml.ts

**Decision**: `yarrrml.ts` imports `inferIterator` directly from `@/lib/rml`. The alternative (duplicating the logic) is rejected — divergence would silently produce inconsistent RML vs YARRRML iterators for the same source.

**Why**: Single source of truth for JSONPath inference.

---

## D5: Plan execution order

**Decision**: Plans must be executed in sequence: 06-01 → 06-02 → 06-03. Each plan depends on the previous:
- 06-01 creates `fusionStore` and `fusion.ts`
- 06-02 imports `fusionStore` in `OutputPanel.tsx` and adds kind fields to `Mapping`
- 06-03 imports kind fields from the expanded `Mapping` type and replaces the `ExportTab` placeholder

Plan 06-02 `depends_on: ["06-01"]` and Plan 06-03 `depends_on: ["06-02"]` capture this formally.

---

## D6: RML subject template heuristic (re-affirmed from CONTEXT.md)

**Decision**: The locked CONTEXT.md decision states: "First property whose local name contains `id` or `key` is used as template variable; falls back to first property; falls back to blank node template if no properties." Plan 06-03 implements this. If no properties exist, the subject template falls back to `http://example.org/{classLocalName}/{index}` where `{index}` is a JSONPath array index expression.

**Why**: Heuristic covers the common case (most JSON payloads have an id field). Executor should not change this without user approval.

---

## D7: YARRRML po format for language and typecast

**Decision**: YARRRML language entries use `lang=tag` suffix in the po array (3-element): `["<pred>", "ref~jsonpath", "lang=en"]`. Typecast uses `datatype=<URI>`. This follows YARRRML 1.0 spec shorthand. No full objectMap object is needed.

**Why**: Keeps the YAML readable and aligned with common YARRRML tooling output format.

### D-003: Speculative plan validated: phase 6
- **Category:** implementation
- **Status:** ACTIVE
- **Confidence:** HIGH
- **Context:** No file overlap with predecessor phases (none)
- **Decision:** Plan proceeds as-is (VALID)
- **Affects:** Phase 6

### D-004: Skipped build in phase 6 after repeated failure
- **Category:** implementation
- **Status:** ACTIVE ⚠ NEEDS REVIEW
- **Confidence:** LOW
- **Context:** Step "build" failed 2 time(s). Last error: claude -p exited with code 1
stderr: 

Last output (tail):
```
{"type":"result","subtype":"success","is_error":true,"duration_ms":489,"duration_api_ms":0,"num_turns":1,"result":"You've hit your limit · resets 9pm (UTC)","stop_reason":"stop_sequence","session_id":"99eb9403-66aa-4147-9810-908d3f5dec5d","total_cost_usd":0,"usage":{"input_tokens":0,"cache_creation_input_tokens":0,"cache_read_input_tokens":0,"output_tokens":0,"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":0},"inference_geo":"","iterations":[],"speed":"standard"},"modelUsage":{},"permission_denials":[],"fast_mode_state":"off","uuid":"160a956e-c829-44be-bae3-241f67a2b8a1"}
```
- **Decision:** Skipping step and continuing to next. Manual intervention required.
- **Affects:** Phase 6, step build
