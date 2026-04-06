---
created: 2026-03-26T11:46:45.278Z
title: Remove duplicate Add Source button, label toolbar plus button
area: ui
files:
  - src/components/panels/SourcePanel.tsx
  - src/components/layout/Toolbar.tsx
---

## Problem

There are two ways to add a source: a button inside the Source panel, and a "+" button in the Source selection toolbar. The panel button is redundant and creates confusion about the canonical entry point.

## Solution

Remove the "Add Source" button from SourcePanel. Update the "+" button in the Source selection toolbar to include an "Add Source" label (e.g. "+ Add Source") so its purpose is unambiguous.
