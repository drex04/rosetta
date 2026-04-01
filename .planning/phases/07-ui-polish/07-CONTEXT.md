# Phase 7: UI Polish & Bug Fixes — Context

## Decisions

- **SPARQL auto-update on keystroke (debounced):** When user changes any kind-specific field (templatePattern, constantValue, constantType, targetDatatype, languageTag, join fields), auto-regenerate SPARQL via `generateConstruct()` after 300ms debounce. Remove the standalone "Regenerate" button — it's confusing and the user shouldn't need it. Kind changes already regenerate (keep that).
- **Mapping invalidation = auto-delete + undo:** When a source or ontology property is deleted and a mapping references it, auto-delete the mapping immediately. Show a toast "Removed N invalid mapping(s)" with an "Undo" button (5s timeout). Store deleted mappings in a small undo buffer (last batch only). This is less disruptive than a persistent warn state and matches user's stated preference.
- **Tab styling = shadcn defaults:** Remove the custom `data-[state=active]:bg-muted` override in RightPanel tab triggers. Use shadcn's built-in TabsTrigger styling (`bg-background`, `text-foreground`, `shadow-sm` on active). Increase tab text from `text-xs` to `text-sm` for readability. This makes tabs visually obvious with minimal custom CSS.
- **Tab renames:** SRC→INPUT, ONTO→ONTOLOGY, MAP→MAP, OUT→OUTPUT, VAL→VALIDATE
- **OUTPUT tab restructure:** Remove the "ontology" subtab from OutputPanel (it duplicates ONTOLOGY tab content). Keep "fused" and "export" subtabs. Move the "Download Turtle" (.ttl export) button to the ONTOLOGY tab's Turtle editor section.
- **Template prop labeling:** In the template pattern editor, show labels above/below the input identifying which mapping property is `{prop1}` (source) and `{prop2}` (target), derived from the mapping's `sourcePropUri` and `targetPropUri` via `localName()`.
- **Mobile minimap:** Hide `<MiniMap />` on screens < 640px using Tailwind `hidden sm:block` wrapper.

## Discretion Areas

- Toast library choice: use shadcn's built-in toast/sonner or a lightweight alternative — executor decides based on what's already in the project.
- Undo buffer size: 1 batch (last delete operation) is sufficient; executor can increase if trivial.
- Exact debounce timing for SPARQL regen: 300ms suggested, executor can tune between 200-500ms.

## Deferred Ideas

- Undo/redo support for all operations (REQ-74, Phase 9) — only mapping-delete undo is in scope here.
- Keyboard shortcuts for tab switching — Phase 9.
- "Regenerate All" button for batch SPARQL refresh — not needed if auto-update works.
