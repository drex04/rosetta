# Phase 11: RML-Native Transform — Context

## Decisions

- **Executor replaced**: `fusion.ts` is deleted; `src/lib/rmlExecute.ts` is the new executor. `fusionStore` imports from `rmlExecute`. Comunica is NOT removed from the project (still used by SHACL constructExecutor).
- **RMLmapper-js API**: Use `parseTurtle(rmlTurtle, inputFiles, { xpathLib: fontoxpath })` which returns a JSON-LD array (`object[]`). No N3.Store, no N-Quads conversion, no jsonld library needed in rmlExecute.ts. `fontoxpath` is passed as the XPath evaluation library (required for XML sources).
- **FusionResult simplified**: `{ jsonLd: object[], sources: FusionSourceResult[], warnings: string[] }`. No `store`, no `totalQuads`. `fusionStore` sets `jsonLd` directly from `fusionResult.jsonLd`. `compactToJsonLd` and `useOntologyStore` imports removed from fusionStore.
- **Output tab**: No "Export JSON" button. Output tab shows a JSON-LD preview and a single "Download JSON-LD" button. The raw `fusionResult.jsonLd` array is displayed and exported.
- **rmlSourceKey helper**: Exported from `src/lib/rml.ts` as `export function rmlSourceKey(source: Source): string`. Used in both `generateRml()` and `rmlExecute.ts` to guarantee filename key consistency. Sanitizes source name to produce a valid filename.
- **XML support**: Branch on `source.dataFormat` in `generateRml()` — JSON sources use `ql:JSONPath` + `.json` extension; XML sources use `ql:XPath` + `.xml` extension. Iterator inference for XML falls back to `"/*"`.
- **join kind removed**: `join` removed from `Mapping['kind']` union and from `MappingGroup` strategies (it was never a group strategy — only a Mapping kind). Remove `parentSourceId`, `parentRef`, `childRef` fields from Mapping interface. Remove join case from `generateConstruct()`. Remove join UI block and option from MappingPanel kind picker.
- **sparql kind preserved**: `sparql` kind keeps its CodeMirror editor and `sparqlConstruct` field. User-authored SPARQL is stored and displayed as before. The field is NOT executed by the new RML path — it is display/export only for this kind unless the user runs it manually via the SPARQL tab.
- **sparql/join silently skipped in RML**: `sparql`-kind mappings produce zero triples in RMLmapper-js (they are commented out in the RML). No runtime error — FusionResult.warnings notes the count of skipped mappings if any.
- **MAP panel display**: For non-sparql individual mappings, replace the SPARQL CodeMirror editor with a read-only RML snippet computed from `generateRml([source], { [source.id]: [mapping] })`. For `sparql` kind, keep the editable CodeMirror. For groups (CONCAT/COALESCE/TEMPLATE), keep the existing SPARQL display unchanged — groups are out of scope for this phase.
- **sparqlConstruct field**: Remains on `Mapping` interface (required for `sparql` kind). Auto-regeneration useEffect for non-sparql kinds is removed. Stale `sparqlConstruct` values on non-sparql mappings in IDB are ignored on load.
- **MappingGroup.sparqlConstruct**: Unchanged — groups keep their SPARQL display.
- **generateGroupConstruct()**: Kept in `sparql.ts` — still drives group SPARQL display.
- **[review] JSON-LD output confirmed**: Research primary recommendation was `{ toRDF: true }` → N-Quads → N3.Store. Reviewed and kept JSON-LD path (`{ xpathLib: fontoxpath }`). Phase 12 SHACL will re-parse JSON-LD into a store when needed.
- **[review] Duplicate rmlSourceKey handling**: When two sources sanitize to the same filename, append a numeric suffix (`_2`, `_3`, etc.) and emit `console.warn`. Prevents silent 0-triple output.
- **[review] FusionResult.error field**: Add `error?: string` to FusionResult. Set it when `parseTurtle` throws. FusedTab renders a red alert. Replaces silent empty-results failure.
- **[review] vite.config.ts update**: Add `optimizeDeps: { include: ['@comake/rmlmapper-js'] }` preemptively to prevent Vite/esbuild Node built-in residue errors during build.
- **[review] Import paths**: All files that previously imported `FusionResult`/`FusionSourceResult` from `fusion.ts` must update to import from `rmlExecute.ts`. Executor must update all callers (FusedTab, ExportTab, fusionStore).

## Discretion Areas

- RML snippet display format: can use a simple `<pre>` block with Turtle syntax highlighting or a read-only CodeMirror instance — whichever is simpler given existing `lightTheme` setup.
- Provenance annotation in rmlExecute: preserve the same `prov:wasAttributedTo` pattern from fusion.ts (per-subject URI → source name literal).
- Warning message wording for skipped `sparql`-kind mappings in FusionResult.warnings.

## Deferred Ideas

- **join kind as custom SPARQL**: User will implement join scenarios via the `sparql` kind manually. No automated join support in this phase.
- **Group RML execution**: MappingGroup CONCAT/COALESCE/TEMPLATE strategies are not represented in the RML output. They will silently produce no triples via RMLmapper-js. A future phase can add multi-field RML predicateObjectMap generation.
- **rmlmapper-js maintenance risk**: Library last published ~2 years ago. If it causes bundling issues, a Web Worker wrapper is the mitigation path. Defer until a build failure is observed.
- **[Expansion opportunity]**: Move `parseTurtle` to a Web Worker for non-blocking execution on large datasets. Current plan blocks main thread — acceptable for demo-scale data.
- **[Expansion opportunity]**: Turtle/N-Quads export from fused output (requires switching to `{ toRDF: true }` output). Deferred in favour of JSON-LD simplicity.
- **[Expansion opportunity]**: SHACL validation on fused JSON-LD output. Phase 12 will need to re-parse JSON-LD into N3.Store first.
