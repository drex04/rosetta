---
created: 2026-03-26T11:46:45.278Z
title: Add GitHub button to top toolbar
area: ui
files:
  - src/components/layout/Toolbar.tsx
---

## Problem

There is no visible link to the project's GitHub repository from within the app. Users have no easy way to find the source, file issues, or contribute.

## Solution

Add a GitHub icon button to the top toolbar that opens the repo URL in a new tab. Use Phosphor's GithubLogo icon. The repo URL is available in user memory (user_profile.md references GitHub username).
