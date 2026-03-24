# Phase 1: Scaffolding & Core Setup — Locked Decisions

## Design Decisions

### D-01: ReactFlowProvider Scope
**Decision:** Single `ReactFlowProvider` wrapping the entire app (in `main.tsx` or `App.tsx`).
**Why:** Toolbar buttons and external hooks need access to `useReactFlow()` (fitView, programmatic node selection) from outside the canvas component. Scoping the provider to the canvas would require prop-drilling or a ref forwarding pattern.

### D-02: Store Architecture
**Decision:** Three fully isolated Zustand stores (`ontologyStore`, `sourcesStore`, `uiStore`) with no cross-imports. Cross-store coordination lives exclusively in custom hooks.
**Why:** Stores have a natural seam — master ontology state and per-source state are genuinely independent. Coordination points (canvas sync, source switching) are few and well-defined; named hooks make data flow explicit.

### D-03: Canvas Data Assembly
**Decision:** `useCanvasData()` hook combines `ontologyStore.nodes/edges` and `sourcesStore.activeSourceNodes/activeSourceEdges` into the single flat array that React Flow consumes. Neither store imports React Flow or knows about the other.
**Why:** React Flow needs one nodes array. The hook is the right abstraction boundary — stores stay pure, canvas assembly is testable.

### D-04: Bidirectional Sync Flags
**Decision:** `isUpdatingFromCanvas` and `isUpdatingFromEditor` are `useRef` values inside the `useOntologySync()` hook — not Zustand state.
**Why:** These are transient synchronization primitives, not application data. Storing them in Zustand would trigger unnecessary re-renders.

### D-05: App Routing
**Decision:** No router. Single-page app with no URL-based navigation.
**Why:** Tool is a single-screen experience. A router adds complexity with no user-facing benefit in v1. Deep-linking to sources/tabs is deferred.

### D-06: Right Panel Width
**Decision:** Fixed `30vw` width. Not resizable in Phase 1.
**Why:** Simpler layout implementation; adequate at typical 1400px+ screen widths. Resize handle deferred to Phase 7 polish.

### D-07: TypeScript Configuration
**Decision:** `strict: true` in `tsconfig.json`. No exceptions.
**Why:** Strict mode catches null/undefined bugs early, especially important for RDF graph data that can be sparse.

### D-08: Semantic Color System
**Decision:** Define amber/blue/green color semantics as CSS custom properties in `globals.css`, then extend `tailwind.config` to expose them as Tailwind classes (`bg-source`, `border-master`, `stroke-mapping`, etc.).
**Why:** React Flow nodes and edges often require inline styles or direct CSS var access. Defining colors once in CSS vars and referencing them from Tailwind avoids duplication and ensures consistency across Tailwind classes and React Flow's style props.

### D-09: Deployment Target
**Decision:** Static hosting (e.g. GitHub Pages). Vite configured with `base: './'` for portable relative paths. No Vercel.
**Why:** User preference. Static bundle from `npm run build` → `dist/` is the deploy artifact.

### D-10: Plan Split
**Decision:** Phase 1 split into two plans:
- **01-01:** Project bootstrap (REQ-01–03, REQ-07) — Vite, Tailwind, shadcn/ui, Vitest
- **01-02:** App shell (REQ-04–06, REQ-08) — Zustand stores, React Flow canvas, layout components, build verification

## Deferred
- Resizable right panel → Phase 7
- Deep-linking to sources/tabs via URL → Phase 7
- Dark mode → out of scope (v1)
- OWL-DL reasoning → out of scope (v1)

## Review Decisions (from /fh:plan-review 2026-03-24)

### RD-01: Vite Init Flag
`npm create vite@latest . --` must include `--yes` to suppress the "directory not empty" interactive prompt. The project root already contains `.git`, `CLAUDE.md`, `.planning/` — without `--yes` an autonomous executor will hang.

### RD-02: Phosphor Icons Install Method
`@phosphor-icons/react` must be installed via `npm install @phosphor-icons/react`. The `npx shadcn@latest add phosphor-icons` command is **not valid** — `phosphor-icons` is not a shadcn component. `components.json` iconLibrary must be manually set to `"phosphor"` if the preset does not set it correctly.

### RD-03: @xyflow/react Version Pin
`@xyflow/react` is left unpinned. The `v12` reference has been removed from `CLAUDE.md`. Use whatever latest resolves at install time; version is locked by `package-lock.json` after first install.

### RD-04: useCanvasData Tests Added
`src/__tests__/useCanvasData.test.ts` added to 01-02 Task 1 scope. Must cover: empty stores, active source merge, and missing-source fallback (no crash when `activeSourceId` has no matching source).

## NOT In Scope (review-confirmed deferrals)
- React error boundaries → deferred to Phase 2 (no async/persistent state in Phase 1, risk is negligible)
- Viewport responsiveness below 900px → deferred to Phase 7 polish (desktop-only tool per DESIGN.md)
- `vitest.config.ts` / `vite.config.ts` consolidation → deferred; duplication is minor for Phase 1 scope
