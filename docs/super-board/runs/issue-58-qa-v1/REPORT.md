# QA report — issue #58 · PR #69 · head `73753c4`

Tester first pass. Scope: the PR diff (1 file, +1/−1, `App.tsx` only; `git merge-base HEAD origin/main` = `0c3d154` = current `origin/main`, so the diff is exactly one commit).

## AC ledger

| AC | Observable test | Rung | Result |
|---|---|---|---|
| AC1 — `goalForDate(goalHistory, localDateKey(new Date()))` appears exactly once in App's render scope | `grep -c 'goalForDate(goalHistory, localDateKey(new Date()))' App.tsx` → `1`, at `App.tsx:254`; no `goal={goalHistory…}` inline copy remains (grep exit 1); Today prop is `goal={currentGoal}` (`App.tsx:426`) | source-level grep — the AC is a render-scope wiring property; behavior is separately pinned by the suite | ✅ PASS (`ac1-expression-count.txt`) |
| AC2 — `npm run typecheck` clean and `CI=1 npm run test` green; home pill and goal page still agree | `npm run typecheck` → exit 0 · `CI=1 npm run test` → 159 pass / 0 fail. Agreement is structural: home pill (`App.tsx:426 goal={currentGoal}`) and goal page (`App.tsx:443 currentGoal={currentGoal}` → `GoalEditor` at `App.tsx:1020`) read the same `currentGoal` defined once at `App.tsx:254` | typecheck + full node test suite (`npm run test` = `node --experimental-strip-types --test tests/*.test.mjs`) | ✅ PASS (`typecheck.log`, `test-output.log`) |

## Behavior-equivalence check (the guard drift)

The deleted inline copy guarded with `goalHistory ? …` (truthy); `currentGoal` guards with `goalHistory !== null` (`App.tsx:254`). Verified equivalent over every reachable value: `goalHistory` is assigned exactly once, `goals.kind === 'ready' ? goals.history : null` (`App.tsx:252`) — a `GoalHistory` object or `null`, nothing else, so truthy and `!== null` cannot diverge. Zero behavior change holds.

## Test-gap check

- **Ledger:** every AC mapped above. No AC has `none` at all rungs: AC1's correct rung is the source-level check the AC itself demands; AC2 is typecheck + the full suite, and the suite pins Today's goal rendering (`tests/today.test.mjs` goal a11y lines, `tests/today-qa.test.mjs` ring/goal boundary) plus goal logic (`tests/goals.test.mjs`, `goals-qa.test.mjs`).
- **Edge cases:** no input or branch changed by the diff — the only change is which variable the prop reads. Boundary/money/date/auth/error classes live in `goalForDate`/`goals.ts`, untouched by this diff and already covered by the goals tests. Guard classes reachable for `goalHistory`: object or null only (both paths exercised — history loaded vs `kind !== 'ready'`).
- **Test the tests:** no test asserts the deleted inline expression (`tests/today.test.mjs:221` "Today wires…" asserts `goalForDate(goalHistory, dateKey)` — the per-row Progress goal at `App.tsx:787`, untouched). Reverting the diff would fail AC1's grep, not silently pass.
- **Rank:** no High gaps. Medium/Low: none material — pure dedup of a value already computed in the same scope.

## Screenshots

Not captured — intentional. The issue states "no user-visible behavior" and "Evidence screenshot: n/a — why: code duplication, no pixel"; both ACs are code-level (grep + typecheck/tests), no UI-affecting change.

## Verdict

✅ **PASS — 2/2 AC** · QA v1 · head `73753c4`
