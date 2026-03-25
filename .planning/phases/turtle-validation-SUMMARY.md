# Summary: Persist Invalid Turtle & Show Validation Errors

## What was built

Invalid Turtle text is now preserved across reloads and parse errors are surfaced to the user in real-time.

## Changes

| File | Change |
|------|--------|
| `src/store/ontologyStore.ts` | Added `parseError: string \| null` state and `setParseError` action |
| `src/components/ui/alert.tsx` | New — shadcn Alert component (via `npx shadcn add alert`) |
| `src/hooks/useOntologySync.ts` | Set `parseError(null)` on success, `parseError(message)` on failure, cleared on canvas path |
| `src/hooks/useAutoSave.ts` | Catch block now restores `turtleSource` + sets `parseError` instead of silently discarding |
| `src/components/layout/RightPanel.tsx` | Reads `parseError` from store, passes to `TurtleEditorPanel` |
| `src/components/panels/TurtleEditorPanel.tsx` | Accepts `parseError` prop; shows destructive Alert banner below editor when set |
| `src/__tests__/autoSave.test.ts` | Updated test to assert new restore-and-set-error behavior |

## Commits

- `41f93e3` feat(turtle-validation): add shadcn Alert component
- `fbab9bb` feat(turtle-validation): add parseError state to ontologyStore
- `b39866f` feat(turtle-validation): set/clear parseError in sync hook and restore invalid turtle on load
- `973877e` feat(turtle-validation): show parse error banner in TurtleEditorPanel
- `8740f69` test(turtle-validation): update autoSave test for invalid-turtle restore behavior

## Verification

- 47/47 tests pass (`npm run test`)
- `tsc --noEmit` clean
- Vite build passes
