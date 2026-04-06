---
created: 2026-03-26T11:46:45.278Z
title: Group project actions into File/Project menu dropdown
area: ui
files:
  - src/components/layout/Toolbar.tsx
---

## Problem

"New Project", "Example Project", "Export Project", and "Import Project" are four separate toolbar buttons with semantically related purposes (project lifecycle management). As standalone buttons they consume horizontal space and lack a clear conceptual grouping.

## Solution

Collapse these four actions into a single "Project" (or "File") dropdown menu in the toolbar. Use a shadcn/ui DropdownMenu with a chevron or folder icon. This frees toolbar space and makes the project-management intent explicit.
