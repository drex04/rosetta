---
created: 2026-03-26T11:46:45.278Z
title: Expand Generated RDFS section by default in SRC tab
area: ui
files:
  - src/components/panels/SourcePanel.tsx:108
---

## Problem

The "Generated RDFS" collapsible section in the SRC tab initialises collapsed (`useState(false)`), so users don't see it until they manually expand it. It's one of the most useful outputs in the panel and should be visible on first load.

## Solution

Change `useState(false)` to `useState(true)` at line 108 of `SourcePanel.tsx`. The toggle and collapse behaviour remain unchanged — only the default open state flips.
