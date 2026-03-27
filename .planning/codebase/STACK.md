# Technology Stack

**Analysis Date:** 2026-03-27

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (strict mode enabled)

**Secondary:**
- JavaScript - Configuration files (ESLint, Vite, Tailwind)
- HTML - Document structure
- CSS - Styling via Tailwind

## Runtime

**Environment:**
- Node.js (ES2023 target)

**Browser Support:**
- Modern browsers (ES2023 compatible)
- Special handling: iOS Safari (via `h-dvh` in Tailwind for address bar compatibility)

**Package Manager:**
- npm (with `package-lock.json`)
- Lockfile: Present at `package-lock.json`

## Frameworks

**Core:**
- React 19.2.4 - UI framework with strict mode
- TypeScript 5.9.3 - Type system

**UI Components & Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- shadcn/ui - Headless component library (preset: bcivVKZU, icon library: Phosphor)
- @tailwindcss/typography 0.5.19 - Typography plugin
- tailwindcss-animate 1.0.7 - Animation utilities
- @phosphor-icons/react 2.1.10 - Icon library

**Canvas & Graph:**
- @xyflow/react 12.10.1 - Graph visualization (React Flow)

**State Management:**
- Zustand 5.0.12 - Client-side state management

**Code Editing:**
- CodeMirror 6.0.2 - Core editor
- @codemirror/commands 6.10.3 - Editor commands
- @codemirror/lang-json 6.0.2 - JSON language support
- @codemirror/language 6.12.2 - Language support base
- @codemirror/state 6.6.0 - Editor state management
- @codemirror/theme-one-dark 6.1.3 - Dark theme
- @codemirror/view 6.40.0 - Editor view
- codemirror-lang-turtle 0.0.2 - Turtle/RDF syntax highlighting

**RDF & Semantic Web:**
- n3 2.0.3 - RDF parsing, serialization, and N3 store
- jsonld 9.0.0 - JSON-LD processing

**Build/Dev:**
- Vite 8.0.1 - Build tool and dev server
- @vitejs/plugin-react 6.0.1 - React Fast Refresh
- vite-plugin-node-polyfills 0.25.0 - Node.js API polyfills for browser

## Key Dependencies

**Critical (RDF/Semantic Web):**
- n3 2.0.3 - RDF triple store; core to all ontology processing
- jsonld 9.0.0 - JSON-LD serialization/deserialization for data interchange

**Persistence:**
- idb-keyval 6.2.2 - IndexedDB wrapper for browser-local project persistence

**UI Libraries:**
- @radix-ui/react-dialog 1.1.15 - Modal dialog primitive
- @radix-ui/react-dropdown-menu 2.1.16 - Dropdown menu primitive
- @radix-ui/react-tabs 1.1.13 - Tabs primitive
- @radix-ui/react-tooltip 1.2.8 - Tooltip primitive
- @radix-ui/react-slot 1.2.4 - Slot composition primitive
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.5.0 - Tailwind class merging

**Testing:**
- Vitest 4.1.1 - Unit/integration test runner
- @vitest/ui 4.1.1 - Vitest UI dashboard
- Playwright 1.58.2 - E2E testing framework
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/dom 10.4.1 - DOM testing utilities
- @testing-library/jest-dom 6.9.1 - Custom Jest matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- jsdom 29.0.1 - DOM implementation for Node.js

## Planned (Not Yet Installed)

**Semantic Web (SPARQL & SHACL validation):**
- Comunica - In-browser SPARQL query engine (mentioned in CLAUDE.md, not yet installed)
- rdf-validate-shacl - SHACL shape validation (mentioned in CLAUDE.md, not yet installed)
- YASGUI - SPARQL query editor UI component (mentioned in CLAUDE.md, not yet installed)

**UX Enhancement:**
- react-joyride - Guided tour/onboarding (mentioned in CLAUDE.md, not yet installed)

## Configuration

**Environment:**
- No environment variables required (client-side only)
- Development server: `localhost:3000`
- All configuration is static (no `.env` file needed)

**Build:**
- Main config: `vite.config.ts`
  - Port: 3000
  - Base path: `./` (relative)
  - Alias: `@/` → `./src/`
  - Node polyfills enabled (except process, crypto, Buffer, global)
- App build: `tsconfig.app.json` (ES2023 target, strict mode)
- Linting: `eslint.config.js` (flat config)
  - Uses: @eslint/js, typescript-eslint, react-hooks, react-refresh
- Styling: `tailwind.config.ts` with CSS variables and semantic color tokens (source, master, mapping)
- PostCSS: `postcss.config.js` (Tailwind + Autoprefixer)

**Testing:**
- Vite test config: `vitest.config.ts`
  - Environment: jsdom
  - Setup file: `src/__tests__/setup.ts` (ResizeObserver and IndexedDB stubs)
- E2E config: `playwright.config.ts`
  - Browser: Chromium only
  - Base URL: http://localhost:3000
  - Dev server: automatically started (`npm run dev`)
  - Screenshots: on failure only
  - Traces: retained on failure

## Platform Requirements

**Development:**
- Node.js (recent version supporting ES2023)
- npm (for dependency installation and scripts)
- Modern browser with DevTools

**Production:**
- Static hosting (CDN or simple HTTP server)
- No backend required — all processing happens client-side
- Browser support: Modern browsers with ES2023 support

## Scripts

```bash
npm run dev          # Start Vite dev server on port 3000
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint check and fix
npm run test         # Run Vitest unit tests
npm run test:ui      # Run Vitest with interactive UI
npm run test:e2e     # Run Playwright E2E tests
npm run preview      # Preview production build
```

## Overrides

- flatted 3.4.2 - Pinned version to resolve dependency conflict

---

*Stack analysis: 2026-03-27*
