# Phase 14 — UI Polish III: Context & Locked Decisions

General UI housekeeping pass: mobile status bar fix, scroll containers, chip redesign,
Source Data flattening, BUILD tab ontology upload, and button label normalization.

---

## Decisions

- **StatusBar mobile fix**: Change `<Tabs className="flex flex-col h-full gap-0">` to
  `flex-1 min-h-0` in `RightPanel.tsx`. The `h-full` on a flex child expands to 100% of
  the parent, pushing the sibling `<StatusBar>` off screen. `flex-1 min-h-0` lets Tabs
  grow while respecting the StatusBar sibling.

- **SHACL violations scroll**: The violations `<div>` in `ValidationPanel.tsx` already has
  `overflow-y-auto` but the AccordionContent flex chain doesn't propagate height correctly.
  Fix: ensure the `AccordionContent` element itself carries `data-[state=open]:flex` and
  `data-[state=open]:flex-col` so the inner overflow div can resolve a real height.

- **Fused JSON-LD scroll**: `OutputPanel` has a broken structure — both `ExportTab` and
  `FusedTab` are inside a `shrink-0` div with padding, preventing `FusedTab`'s `flex-1`
  from resolving. Fix: remove the `shrink-0` wrapper and restructure so FusedTab fills
  available space. The existing `FusedJsonLdViewer` already uses `ScrollArea`; the fix is
  purely structural.

- **Source chips unified hover**: Replace the two-sibling structure (Button + separate
  `<button>` ×) with a single `<div className="group ...">` chip container. The name span
  activates/renames; the × button sits inside the group and uses `group-hover` visibility.
  The chip border/ring is on the container, not on either inner element. Interaction
  semantics (click=select, double-click=rename, ×=delete) are preserved.

- **Source Data — flatten accordion**: Remove the `<Accordion>` wrapper from the
  "Source Data" section in `SourcePanel.tsx`. The upload and reset icon buttons move into
  the existing toolbar div alongside the source name input and format badge. The editor div
  takes `flex-1 min-h-0` directly. The outer `ScrollArea` is also removed since there is
  only one content area; the panel is `flex flex-col h-full overflow-hidden`.

- **BUILD tab ontology upload — new lib**: Add `rdfxml-streaming-parser` for RDF/XML
  support. Create `src/lib/parseOntologyFile.ts` with three paths:
  - `.ttl` → pass text directly to `N3.Parser` then `N3.Writer` (normalizes the Turtle)
  - `.jsonld` → `jsonld.toRDF({ format: 'application/n-quads' })` → `N3.Parser` N-Quads
    → `N3.Writer` Turtle
  - `.rdf` → `RdfXmlParser` from `rdfxml-streaming-parser` → quads → `N3.Store` →
    `N3.Writer` Turtle
  All three return `Promise<string>` (Turtle). On parse error, throw with a user-readable
  message.

- **BUILD tab ontology upload — TurtleEditorPanel prop**: Add optional
  `onUpload?: (turtleContent: string) => void` prop. When provided, render an upload button
  in the header toolbar (between filename label and download button). The file reading and
  parsing happen inside TurtleEditorPanel using a hidden file input + `parseOntologyFile`.
  The prop receives the already-parsed Turtle string (not the raw file), so callers just
  call `setTurtleSource(turtle)` — same as typing in the editor.

- **Button label normalization**: `size="icon"` download buttons in `OutputPanel.tsx`
  (Download JSON-LD in FusedTab; Download RML and Download YARRRML in ExportTab accordion
  triggers) are converted to `size="sm"` with icon + text label, matching the CHECK tab's
  "Import" / "Reset" style. Accordion trigger layout adjusts to accommodate the wider
  button (use `gap-2` flex row, push button to the right with `ml-auto`).

## Discretion Areas

- **Chip rename UX on mobile**: Double-click to rename doesn't work on touch. The existing
  behaviour is unchanged — this plan doesn't need to add a touch rename path.

- **Ontology upload error banner**: On parse failure, show the existing `Alert`
  `variant="destructive"` banner pattern (same as LOAD tab). Exact wording is at
  executor discretion.

- **N3.Writer prefix handling for uploads**: When serializing uploaded ontologies to
  Turtle, preserve whatever prefixes the parser extracted. If none, emit a bare Turtle
  with full URIs — don't fabricate `@prefix` declarations.

## Deferred Ideas

- **Touch-friendly chip rename**: Long-press to rename on mobile — out of scope.
- **Ontology upload from URL**: Fetch-by-URL input — out of scope.
- **Source Data resizable split pane**: Resizable height between data editor and schema
  preview — out of scope for this phase.
