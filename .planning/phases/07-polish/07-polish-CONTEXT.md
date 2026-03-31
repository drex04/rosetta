# Phase 7: Onboarding & Polish — Context

## Decisions
- Status bar: `h-6` strip, `border-t border-border bg-background`, last child in App root flex column
- Status bar content: save status indicator on the left, GitHub icon-only button on the far right
- Header: remove save status chip and GitHub button entirely; keep brand, Project dropdown, Help, About
- Drag handle: visible 1px line on left edge of RightPanel, pointer events (handles mouse + touch), no snap presets
- Right panel width constraints: min 260px, max 60vw (desktop/tablet only)
- Viewport root: use `h-dvh` instead of `h-screen` for iOS Safari address-bar compatibility (Tailwind 3.4+)
- Mobile breakpoint: `window.innerWidth < 640` (Tailwind `sm`); tracked reactively via resize listener
- Mobile panel: collapse/expand toggle only — no drag; expanded = full-width overlay (z-20); collapsed = `w-10` strip
- Desktop panel: collapse/expand toggle AND drag-to-resize; same `w-10` collapsed strip
- Collapse indicator in strip: CaretLeftIcon (expand) in strip; CaretRightIcon (collapse) in tab bar

## Discretion Areas
- Drag handle visual: executor may choose a subtle `bg-border hover:bg-primary/30` transition on the 4px grab zone, as long as the visible indicator is a 1px line
- StatusBar component placement: can be inline in App.tsx or extracted to `src/components/layout/StatusBar.tsx` — prefer extraction if it keeps App.tsx clean

## Deferred Ideas
- Snap-to-preset on double-click of drag handle (user explicitly declined)
- Landscape phone orientation (not in scope — mobile < 640px covers it)
- Undo/redo (REQ-52, separate plan)
- Interactive walkthrough tour (REQ-46, separate plan)
