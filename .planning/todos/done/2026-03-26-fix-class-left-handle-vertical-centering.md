---
created: 2026-03-26T11:46:45.278Z
title: Fix class-left handle vertical centering in node header
area: ui
files:
  - src/components/nodes/ClassNode.tsx:50
---

## Problem

The `class-left` React Flow handle sits slightly too high — it's not vertically centered within the header row of the ClassNode. This causes edge connectors to visually misalign with the header.

## Solution

Adjust the handle's `top` / `style` / CSS so it aligns to the vertical midpoint of the header row rather than the top of the node. Likely a `top: 50%` or flexbox alignment fix on the handle wrapper within the header element.
