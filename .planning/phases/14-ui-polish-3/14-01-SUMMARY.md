---
phase: 14-ui-polish-3
plan: 01
status: complete
commit: 2312fa5
test_metrics:
  build: pass
  lint: skipped
  spec_tests_count: 0
---

# Plan 14-01 Summary: Seven Targeted UI Polish Improvements

## What Was Built

Five parallel subagent tasks delivered all seven improvements from the plan spec:

**Task 1 — StatusBar mobile fix + FUSE tab scroll:**
- Changed `Tabs` className from `h-full` to `flex-1 min-h-0` in RightPanel so the sibling StatusBar stays visible below the viewport fold on mobile
- Rewrote OutputPanel with proper `TabsList`/`TabsTrigger`/`TabsContent` sub-tabs ("Fuse" / "Export"), defaulting to "fuse", each with `flex-1 min-h-0` for correct overflow

**Task 2 — SHACL violations scroll:**
- Added `data-[state=open]:flex data-[state=open]:flex-col` to the violations AccordionContent, restoring the flex chain that Radix's `overflow:hidden` animation wrapper collapsed

**Task 3 — Unified chip hover + flattened Source Data:**
- Replaced two-sibling chip layout (Button + separate ×) with a single compound `<div>` owning all border/hover chrome; × uses opacity-only hover
- Removed Accordion/ScrollArea wrappers from SourcePanel Source Data section; Upload and Reset buttons moved into toolbar with text labels

**Task 4 — Multi-format ontology upload:**
- Created `src/lib/parseOntologyFile.ts` supporting `.ttl` (validate/normalize), `.jsonld` (via jsonld.toRDF → N-Quads → Turtle), `.rdf` (via dynamic rdfxml-streaming-parser import)
- Added `onUpload` prop to TurtleEditorPanel with hidden file input, Upload button, and destructive error Alert
- Wired `onUpload` in RightPanel ONTOLOGY tab

**Task 5 — Labeled download buttons:**
- FusedTab, ExportTab RML, and ExportTab YARRRML download buttons changed from `size="icon"` to `size="sm"` with text labels

## Files Changed

- `src/components/layout/RightPanel.tsx`
- `src/components/layout/SourceSelector.tsx`
- `src/components/panels/SourcePanel.tsx`
- `src/components/panels/TurtleEditorPanel.tsx`
- `src/components/panels/ValidationPanel.tsx`
- `src/components/panels/OutputPanel.tsx`
- `src/lib/parseOntologyFile.ts` (new)
- `package.json` + `package-lock.json` (added rdfxml-streaming-parser)

## Verification

- `npm run build`: **pass** — 5347 modules, 0 TypeScript errors
- All 7 must_haves.truths addressed

## Issues Encountered

None. LSP showed stale diagnostics for TurtleEditorPanel after subagent edits; build confirmed clean.
