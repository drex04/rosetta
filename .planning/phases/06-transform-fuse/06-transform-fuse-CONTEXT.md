# Phase 06: Transform, Fuse & RML Export — Context

## Decisions

- **Comunica lazy-loaded via dynamic import**: `fusion.ts` uses `await import('@comunica/query-sparql')` with a module-level singleton engine. Vite code-splits Comunica into a separate chunk. Cost deferred until first "Transform & Fuse" click. (alternatives: static import — unacceptable 3–5 MB initial load; N3.Store pattern matcher only — cannot handle user-edited SPARQL).
- **fusionStore is ephemeral**: No IDB persistence. Results lost on page reload. User re-runs fusion explicitly. Mirrors validationStore precedent. (alternative: IDB-persist fused JSON — adds stale-invalidation complexity for no durable benefit).
- **Provenance via `prov:wasAttributedTo` literal**: After fusing all source quads, one `<entity> prov:wasAttributedTo "<sourceName>"` triple added per distinct subject per source. Prefix `prov: <http://www.w3.org/ns/prov#>`. (alternative: named graphs — breaks simple JSON-LD serialization; full PROV-O model — over-engineered).
- **JSON-LD compaction, not full framing**: `jsonldFramer.ts` uses `jsonld.fromRDF()` + `jsonld.compact()` with auto-derived context from OntologyNode URIs. No `jsonld.frame()`. (alternative: full frame — too brittle with auto-derived types from arbitrary ontologies).
- **Mapping kind picker is inline, not modal**: Kind-specific fields (templatePattern, constantValue, targetDatatype, languageTag, join fields) render inline in MappingPanel below the kind `<select>`. (alternative: modal/drawer — breaks panel flow in narrow panel).
- **`join` kind generates a placeholder SPARQL stub**: `generateConstruct` for `kind === 'join'` emits a commented stub with `FILTER(false)` guard. RML/YARRRML annotate join mappings as `# requires manual conversion`. (alternative: heuristic join SPARQL — high risk of silent semantic errors).
- **RML subject template uses `*id*`/`*key*` property heuristic**: First property whose local name contains `id` or `key` is used as template variable; falls back to first property; falls back to blank node template if no properties.
- **YARRRML is a plain string — no js-yaml dep**: YAML built with manual string interpolation; double-quote values; escape `"` as `\"`. (alternative: js-yaml — unwarranted ~60 KB bundle cost for a shallow structure).
- **OUT tab gets three sub-tabs: Ontology | Fused | Export**: "Ontology" retains existing Turtle/JSON-LD toggle. "Fused" shows fusionStore output + Transform button + source summary + JSON/JSON-LD download. "Export" shows RML + YARRRML download buttons + SPARQL-kind warning. (alternative: separate top-level tabs — requires RightPanel layout changes).

## Discretion Areas

- **Fused tab empty state copy**: Executor decides the exact wording of the empty state when no sources are mapped or fusion hasn't run yet. Should mention "Transform & Fuse" button.
- **Source summary format in Fused tab**: REQ-44 says `"Fused from: Norwegian Radar (12 tracks), German Radar (8 tracks)"` — exact count label ("tracks" vs "triples" vs "entities") is at executor discretion.
- **Kind-specific field labels in MappingPanel**: Exact labels for templatePattern, constantValue, targetDatatype, languageTag, join fields are at executor discretion within the existing shadcn design language.
- **RML/YARRRML "requires manual conversion" annotation style**: Exact comment format in generated files is at executor discretion (block comment vs line comment, placement).
- **fusionStore stale detection**: If mappings change after a fusion run, optionally set a `stale` flag. Executor decides whether to implement stale detection in Phase 6 or defer to Phase 7 polish.

## Review Decisions (06-03 plan-review)

- [review] **inferIterator must guard null/primitive JSON parse results**: `JSON.parse('null')` returns `null`; `Object.entries(null)` throws TypeError. Guard added: if parsed is `null` or non-object primitive, return `'$'`.
- [review] **No blank node templates in RML**: `rr:template` only generates IRIs. The plan's `_:r{trackId}` option was removed; sole fallback is `http://example.org/{classLocalName}/{index}`.
- [review] **YARRRML constant kind po entry**: Leading space before `<` in `[" <uri>", ...]` was a spec bug — corrected to `["<uri>", ...]`.
- [review] **inferIterator only infers one level of JSONPath nesting**: `$.tracks[*]` is supported; `$.data.tracks[*]` (deep nesting) is not. Accepted limitation for Phase 6 — documented in Deferred Ideas.

## Deferred Ideas

- **Full jsonld.frame() with user-editable frame document**: Auto-deriving a frame from OntologyNode[] is brittle. Defer to a future "frame editor" feature.
- **Auto-validation on fusion**: Running SHACL validation automatically after fusion completes would close the feedback loop. Deferred — validationStore is already independent and user can trigger manually.
- **Named graph provenance**: Using N-Quads named graphs per source would allow precise per-source SPARQL queries. Deferred — requires updating the entire serialization pipeline.
- **SPARQL template library for join mappings**: Pre-built join CONSTRUCT patterns for common join types (inner join, left join). Deferred to Phase 7 (REQ-58 mentions SPARQL template library).
- **RML/YARRRML round-trip import**: Parsing RML/YARRRML back into Rosetta mappings. Out of scope for Phase 6.
- **Multi-level JSONPath inference**: `inferIterator` only infers one level deep (e.g. `$.tracks[*]`). For `{"data":{"tracks":[...]}}` it would return `$.data[*]` instead of `$.data.tracks[*]`. A future version could recurse until it finds an array. Deferred — one-level covers all sample data.
- [Expansion opportunity]: The ambitious version would add a live RML preview panel showing the generated Turtle for a single sample record from the active source, updating on every mapping change.
- **Progress indicator per-source during fusion**: REQ-60 mentions progress indicators for Comunica queries. Deferred to Phase 7 polish.
