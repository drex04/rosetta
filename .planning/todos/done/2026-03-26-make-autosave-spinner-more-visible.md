---
created: 2026-03-26T11:46:45.278Z
title: Make autosave spinner more visible
area: ui
files:
  - src/components/layout/Toolbar.tsx
  - src/store/uiStore.ts
---

## Problem

The autosave status spinner is too subtle — users don't notice it and can't tell whether their work is being saved. This undermines confidence in the persistence layer.

## Solution

Evaluate options: (a) move the indicator to a more prominent position (e.g. bottom status bar or center of toolbar), (b) increase size/contrast of the spinner, (c) add a brief text label ("Saving…" / "Saved") alongside the icon, or (d) use a toast/snackbar for save confirmations. Choose whichever makes save state most legible without being intrusive.
