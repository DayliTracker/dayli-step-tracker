# QA v1 evidence — issue #66 pin the ScreenEnter Reduce Motion gate (PR #70 head `69889ef`)

Environment: QA worktree `.claude/worktrees/issue-66-qa` on branch
`issue-66-pin-screenenter-reduce-motion-gate` @ `69889ef` — the builder head, unchanged by
QA except for this evidence directory. Node v22.23.4. The branch is based on origin/main
`b61a0f0` (merge-base equals the origin/main tip, the #58 squash) and
`git diff 69889ef origin/main -- App.tsx` is empty, so every run below executes against
merged-main `App.tsx` content (`logs/git-branch-vs-main.log`).

## AC results

| AC | Command / mutation | Artifact(s) | Result |
|---|---|---|---|
| AC1 — the pin fails when `ScreenEnter`'s conditional `reduceMotion ? [] : [offset timing]` entrance is replaced by an unconditional offset timing | Mutation: replaced the `...(reduceMotion ? [] : [ Animated.timing(offset, …) ])` spread (App.tsx:511-516) with a bare `Animated.timing(offset, …)` as the first element of `Animated.parallel`, ran the pin, restored `App.tsx` with `git checkout --` | `logs/mutant1-unconditional-slide.log` | **PASS** — pin red on the mutant: `not ok 1 — the ScreenEnter entrance stays behind the Reduce Motion answer (issue #66)`, assertion `'the offset slide plays only when Reduce Motion is off'`; the `doesNotMatch` guard for `Animated.parallel([\s*Animated.timing\(offset,` also fires on this shape. After restore the pin is green. |
| AC2 — the pin passes on the merged `main`; `CI=1 npm test` stays green | `CI=1 npm test` in the QA worktree | `logs/npm-test-pass-160.log` | **PASS** — **160/160 pass, 0 fail** (`# tests 160`, `# pass 160`, `# fail 0`). Because the branch's `App.tsx` is byte-identical to origin/main, this run is the merged-main run. |
| (supporting) typecheck | `npm run typecheck` | `logs/typecheck.log` | **PASS** — `tsc --noEmit` exit 0. |

## Mutation matrix — all three gate shapes were seen red

The pin (`tests/shell.test.mjs:175-203`) asserts three shapes plus one guard. Each was
proven able to fail by applying a source mutation to `App.tsx`, running the pin, and
restoring. No mutant was ever committed; `git status` on `App.tsx`/`tests/` is clean and
the final suite run is on the untouched builder head.

| # | Mutant applied to App.tsx | Pin result | Log |
|---|---|---|---|
| 1 | conditional spread → bare `Animated.timing(offset, …)` (the AC's literal regression) | ❌ `'the offset slide plays only when Reduce Motion is off'` | `logs/mutant1-unconditional-slide.log` |
| 2 | `subscription.remove();` line removed from the unmount cleanup | ❌ `'the reduceMotionChanged listener is cleaned up on unmount'` | `logs/mutant2-cleanup-dropped.log` |
| 3 | `AccessibilityInfo.isReduceMotionEnabled()` promise chain removed | ❌ `'ScreenEnter reads the Reduce Motion setting before animating'` | `logs/mutant3-read-dropped.log` |

Harness note: mutants 2 and 3 were first applied incorrectly — the pattern text was left
inside a `// MUTANT:` comment, so the source regex still matched and the pin stayed green.
That was a QA harness mistake, not a pin gap (source pins match raw text, comments
included). Redone with the text removed; the red results above are from the corrected
mutants.

## Environment note for the Reviewer rerun

On a fresh checkout without `node_modules`, `CI=1 npm test` is red at
`tests/smooth-frames.test.mjs:220` — that spec spawns the mascot validator, which imports
the devDependency `@resvg/resvg-js`
(`logs/npm-test-fresh-checkout-no-deps.log`). This is an environment gap, not a code
failure: after `npm ci` the full suite is 160/160. Rerun as
`npm ci --silent && CI=1 npm test` (the merge gate's `verify_commands` installs first).

## Test gaps (not written)

- Low: the slice bounds are sentinel-based (`indexOf('function Header')`, App.tsx:532).
  Renaming or relocating `Header` changes the slice shape; the
  `assert.ok(screenEnter.includes('function ScreenEnter'))` guard only catches the
  empty-slice case, not a wrong-but-nonempty one.
- Low: the `doesNotMatch` guard rejects a bare offset timing first in the parallel list;
  an additional unconditional timing appended after the conditional spread would not trip
  it. Out of the AC's scope.

## Screenshots

Not captured — both ACs are non-visual (source-pin test runs); PR #70 touches only
`tests/shell.test.mjs`, no UI surface. Evidence is the test and mutation logs above.
