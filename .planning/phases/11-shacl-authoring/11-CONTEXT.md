# Phase 11 — SHACL Authoring: Context & Locked Decisions

Corresponds to **ROADMAP Phase 12: SHACL Authoring** (REQ-108 through REQ-110).

---

## Decisions

- **Shapes source of truth**: The ValidationPanel editor content is the sole input to validation. Auto-generated shapes (from `generateShapes(ontologyNodes)`) are used as the *seed* when the editor is empty; once the user edits, only editor content is validated against. If `userShapesTurtle` is empty or invalid Turtle, validation falls back to `generateShapes(ontologyNodes)` automatically — no crash.

- **Editor seeding**: `generateShapesTurtle(nodes: OntologyNode[]): string` serializes auto-generated shapes to Turtle, one block per ontology class, each preceded by an `# Auto-generated — derived from <ClassName>` comment. Uses N3.Writer per-node then joins blocks. Seeding happens on mount if `userShapesTurtle` is empty.

- **Reset behavior**: A "Reset" button in the Shapes accordion trigger calls `resetShapesToAuto(ontologyNodes)` in the store, replacing editor content with freshly auto-generated Turtle. No confirmation needed (editor is always re-seedable).

- **Layout**: `ValidationPanel` uses `Accordion type="multiple"` (shadcn, same pattern as Output tab). Two items: "Shapes" (CodeMirror Turtle editor + Reset button) and "Violations" (existing results list + Validate button). Both open by default.

- **Store**: Extend `validationStore` — add `userShapesTurtle: string` (default `''`), `setUserShapesTurtle`, `resetShapesToAuto(ontologyNodes)`, `snapshot()`, `hydrate()`. Persist via the existing `useAutoSave` snapshot pattern (single `rosetta-project` IDB key) — do NOT use a separate `shacl-shapes` key or direct idb-keyval calls in the store. Hydrate guard: `typeof snapshot.userShapesTurtle === 'string'`. [revised in review: IDB approach changed from direct key to useAutoSave pattern]

- **`runValidation` wiring**: `validationStore.runValidation()` passes `userShapesTurtle` to `validateSource`. Signature of `validateSource` gains an optional fourth parameter `userShapesTurtle?: string`.

- **Sample shapes file**: `src/data/sample-shapes.ttl` — SHACL constraints for the NATO air defense ontology (track class: `sh:minCount` for required fields, `sh:datatype` for lat/lon/altitude/speed, `sh:pattern` for IFF code). Loaded as `userShapesTurtle` initial value when sample project is loaded.

## Review Decisions

- [review] **TurtleEditorPanel filename prop**: `TurtleEditorPanel.tsx` hardcodes `"ontology.ttl"` in the header label and Download button. Add optional `filename?: string` and `downloadLabel?: string` props. Both default to `'ontology.ttl'` so existing ontology tab is unchanged. SHACL tab passes `filename="shapes.ttl"`.

- [review] **Whitespace trim check**: Empty check for `userShapesTurtle` must use `.trim()` before testing falsy. A whitespace-only string is truthy but produces 0 quads from N3.Parser with no error — causing validation to silently pass everything. Use `!userShapesTurtle?.trim()` in `validateSource`.

- [review] **resetShapesToAuto error handling**: `generateShapesTurtle` is async (N3.Writer callback). `resetShapesToAuto` must wrap its body in try/catch. On error: leave `userShapesTurtle` unchanged and swallow the error (no unhandled rejection). A failing Reset leaves the editor with its previous content — acceptable UX for this phase.

- [review] **IDB persistence via useAutoSave**: Use project-standard `snapshot()`/`hydrate()` on `validationStore` wired into `useAutoSave.ts`. No direct `idb-keyval` calls in the store. `useAutoSave.ts` is added to `files_modified`.

- [review] **E2E test coverage**: Add `e2e/shacl-authoring.spec.ts` with 3 tests using `freshPage` fixture. This is added to `files_modified`.

- [review] **Sample project overwrite**: Loading the sample project unconditionally overwrites user-edited shapes. Consistent with existing contract — sample project load resets all other state (ontology, sources, mappings) without prompting.

- **Import/export shapes**: Export via the existing TurtleEditorPanel Download button (parameterized to `shapes.ttl` in Task 4). Import via a hidden `<input type="file" accept=".ttl">` triggered by an Import button in the Shapes accordion header. FileReader reads as text, calls `setUserShapesTurtle(content)`. Invalid Turtle from import is handled by the existing fallback in `validateSource` — no extra error handling needed. [un-deferred from Deferred Ideas]

## Discretion Areas

- **N3.Writer serialization order**: Properties within a shape block may appear in any order; executor may choose whatever N3.Writer produces naturally.
- **Accordion default open/closed state**: Both accordions open by default; executor may use `defaultValue={["shapes","violations"]}` or equivalent.
- **CodeMirror editor height**: Use a reasonable fixed height (e.g., `h-48` or `h-56`) inside the accordion; exact height is executor's discretion.

## Deferred Ideas

- **Live parse-error indicator** in the editor header (red badge when Turtle is invalid) — useful but out of scope; the silent fallback is sufficient for this phase.
- **Per-shape toggle** (checkboxes to enable/disable individual shapes) — too complex for this phase.
- **Auto-reseed when ontology changes** (watching `ontologyStore` and updating shapes) — deferred; user uses Reset button instead.
- ~~**Import/export shapes file**~~ — un-deferred; added to this phase (see Review Decisions).
