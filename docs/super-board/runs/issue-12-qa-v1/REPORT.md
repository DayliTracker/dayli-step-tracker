# QA report — issue #12 · central design token module · v1

PR #25 · head `6189140` · base `main` · device iPhone 17 simulator (UDID `77EC52AC-8FB5-4CE2-B248-A27A071541EE`), Release configuration (self-contained JS bundle — the debug configuration attached to an orphaned Metro server rooted at the deleted `.claude/worktrees/issue-6-qa/`, so debug builds cannot render on this host right now).

## Checks

| AC | Check | Command | Result |
|---|---|---|---|
| 1 | token roles + scales exist | read `src/tokens.ts:17-84`; `tests/tokens.test.mjs` deepEqual assertions | all ten required roles (canvas, card, border, text, textMuted, accent, ringLit, ringTrack, danger, selection) + spacing/radius/typeSize/typeWeight/typeLeading pinned |
| 2 | no literals in `App.tsx` | `grep -nE '#[0-9a-fA-F]{6}\b' App.tsx` and `grep -nE 'borderRadius:\s*[0-9]' App.tsx`; plus guard test | no matches (both greps exit 1); `App.tsx:17` imports every token group |
| 3 | typecheck + tests | `npm run typecheck` · `npm test` | typecheck exit 0 · 27/27 pass, 0 fail |
| 4 | screens render unchanged | Release builds at branch `6189140` and pre-refactor parent `c1a3699`; same simulator; identical navigation (tab tap 298,804; gear tap 360,110 via idb); `xcrun simctl io … screenshot` | Today/Progress/Settings: 0 of 2,884,752 pixels differ per screen below the status bar (PIL ImageChops, threshold ≥8/255, `bbox=None`); full-image diff bbox `(263,77)-(293,117)` on all three = status-bar clock only |

## Files

- `ac4-*.png` — branch build (`6189140`) Today / Progress / Settings.
- `baseline-*.png` — pre-refactor build (`c1a3699`) same three screens.

## Test gaps (not written)

- Medium: the no-literal guard (`tests/tokens.test.mjs:32-33`) matches 6-digit hex and `borderRadius:` only — `rgb()/rgba()` or 3/8-digit hex forms would pass unnoticed. Styling-only scope, not High.
- Low: `src/duck.ts` mascot palette holds its own hex literals — outside this PR's diff and outside the AC, which names `App.tsx` only.

## Note for the merge gate

The branch was cut from `c1a3699`; `origin/main` moved to `e9d66ff` (App.tsx ring a11y label) after. The gate's base merge will reconcile that hunk.
