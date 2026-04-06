---
created: 2026-03-26T11:46:45.278Z
title: Increase child node indent so left edge clears parent center
area: ui
files:
  - src/lib/layout.ts:13
---

## Problem

In the default tree layout, child nodes don't indent far enough to the right. The desired visual is that the left edge of a child node sits slightly to the right of the horizontal center of its parent node. Currently `TREE_INDENT_X = 60` is too small for this to hold at depth 1.

## Solution

Increase `TREE_INDENT_X` in `src/lib/layout.ts` so that at depth 1 the child's left edge exceeds `parentX + nodeWidth / 2`. Node width appears to be around 200px, so the indent likely needs to be ~120–140px. Tune visually after adjusting.
