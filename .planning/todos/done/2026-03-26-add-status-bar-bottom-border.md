---
created: 2026-03-26T11:46:45.278Z
title: Add status bar or bottom border so UI doesn't bleed to viewport edge
area: ui
files:
  - src/App.tsx:37
  - src/components/layout/Toolbar.tsx:197
---

## Problem

The app root is `flex flex-col h-screen overflow-hidden` with no bottom boundary element. The canvas/panel content runs flush to the very bottom of the viewport, which makes it look like content may be cut off.

## Solution

Add a thin status bar or decorative bottom border as the last child in the App root flex column. Options:
- (a) A `<footer>` / `<div>` with `h-px bg-border shrink-0` — a 1px separator line, minimal footprint.
- (b) A slim status bar (`h-6` or `h-7`) styled like the top toolbar (`border-t border-border bg-background`) that can also host the autosave indicator (see related todo on autosave visibility).

Option (b) is preferred if the autosave spinner todo is tackled at the same time, as it solves both issues in one element.
