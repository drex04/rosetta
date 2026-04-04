# Phase 12 — Onboarding & Demo: Context & Locked Decisions

Corresponds to **ROADMAP Phase 13: Onboarding & Demo** (REQ-68 through REQ-78).

## Decisions

- **REQ-72 only in scope for Plan 01:** User scoped this plan to the About/Onboarding dialog only. REQ-68 (tour), REQ-69/70 (sample project), REQ-71 (tooltips), REQ-73–78 are deferred to later plans.
- **Open state lives in AppLayout:** `isOpen` and first-visit check live in `AppLayout.tsx`, not `Header.tsx`. AppLayout mounts once and owns auto-open logic; passes `onAboutClick` callback to Header.
- **First-visit detection via localStorage:** Key `rosetta-onboarding-v1`. Set to `"seen"` when user closes the dialog (via Skip, Get Started, or dot nav to last + close). Read on mount to decide auto-open.
- **shadcn Dialog (not Sheet):** Use `Dialog` + `DialogContent` from shadcn. No custom overlay.
- **Dialog width:** `max-w-3xl` (wider than default to accommodate side-by-side text + SVG).
- **5 slides in order:** Challenge → Solution → Technology → Result → Try It Now. Content adapted from reference copy.
- **Slide animation:** CSS transition on opacity + translateY (250ms), triggered by state flag. No external animation library.
- **SVG illustrations inline:** All 5 SVG visuals (Silos, Ontology, Standards, Speed, Demo) defined as components in `about-dialog.tsx`. No image files.
- **Last slide CTA:** "Get Started" (not "Start Tour" — tour deferred).
- **Progress dots:** Clickable, jump to any slide. Active dot widens (pill shape).
- **No Zustand store:** Fully local state. No persistence beyond the localStorage `seen` flag.

## Discretion Areas

- **Tailwind color mapping:** Executor maps reference hex values to nearest Tailwind/app tokens: `#0E8A7D` → `teal-600`, `#E74C3C` → `red-500`, `#2980B9` → `blue-500`, `#D4A03C` → `amber-500`, `#8E44AD` → `purple-500`, `#94A3B8` → `slate-400`, `#0D1B2A`/`#0A1421` → `slate-900`. Use Tailwind classes; inline styles only where Tailwind cannot express it (e.g. SVG fill attributes).
- **Slide accent per-slide:** Each slide has an accent color used for the tag badge background/text. Executor uses the mapped Tailwind token.
- **Header prop shape:** Executor decides whether to use a render prop, callback prop, or context — callback prop preferred to match existing patterns.

## Deferred Ideas

- **REQ-68 react-joyride tour:** Deferred to Plan 02.
- **REQ-69/70 Sample project loading:** Deferred.
- **REQ-71 Contextual tooltips:** Deferred.
- **REQ-73 Empty states:** Already done per user, no action needed.
- **REQ-74 Undo/redo:** Deferred to Plan 03.
- **REQ-75 SPARQL template library:** Deferred.
- **REQ-76 Keyboard shortcuts:** Deferred.
- **REQ-77 Error handling/loading states:** Deferred.
- **REQ-78 Node palette:** Already done per user, no action needed.
- **"Replay onboarding" button:** Nice-to-have for dev purposes; defer — About button in header already re-opens.
- **Per-slide accent-colored Next button:** Reference code changes button color per slide accent. Defer for simplicity; use consistent teal-600.
