# QA report — issue #58 · PR #69 · head `f485dd8`

Tester rebuild (round 1 after reviewer bounce). Bounce reason: the v1 QA handoff comments were posted as literal file paths, so the report never reached the PR or issue. No code or test defect was named; this pass re-runs the full suite and re-posts both comments with real content.

Scope: the PR diff (1 file, +1/−1, `App.tsx` only; `git merge-base HEAD origin/main` = `0c3d154` = current `origin/main`).

## AC ledger

| AC | Observable test | Rung | Result |
|---|---|---|---|
| AC1 — `goalForDate(goalHistory, localDateKey(new Date()))` appears exactly once in App's render scope | `grep -Fc 'goalForDate(goalHistory, localDateKey(new Date()))' App.tsx` → `1`, at `App.tsx:254`; zero `goal={goalHistory…}` inline copies remain; Today prop is `goal={currentGoal}` (`App.tsx:426`) | source-level grep — the AC is a render-scope wiring property | ✅ PASS (`ac1-expression-count.txt`) |
| AC2 — `npm run typecheck` clean and `CI=1 npm run test` green; home pill and goal page still agree | `npm run typecheck` → exit 0 · `CI=1 npm run test` → 159 pass / 0 fail / 0 skipped (20 suites). Agreement is structural: home pill (`App.tsx:426`) and goal page (`App.tsx:443` → `GoalEditor` `App.tsx:1020`) read the one `currentGoal` defined at `App.tsx:254` | typecheck + full node test suite (`npm run test` = `node --experimental-strip-types --test tests/*.test.mjs`) | ✅ PASS (`typecheck.log`, `test-output.log`) |

## Behavior-equivalence check (re-verified this pass)

The deleted inline copy guarded with `goalHistory ? …` (truthy); `currentGoal` guards with `goalHistory !== null` (`App.tsx:254`). Re-checked in code: `goalHistory` is assigned exactly once — `goals.kind === 'ready' ? goals.history : null` (`App.tsx:252`) — and `GoalHistory` is an object type `{ goals: Record<string, number> }` (`src/goals.ts:14`), so truthy and `!== null` cannot diverge on any reachable value. Zero behavior change holds.

## Dependency + suite facts

- `npm ci --silent` → exit 0 (config verify_commands precondition).
- `npm run typecheck` → exit 0 (`tsc --noEmit`).
- `CI=1 npm run test` → exit 0; `# tests 159 # pass 159 # fail 0 # cancelled 0 # skipped 0`.

## Test-gap check

- **Ledger:** every AC mapped. AC1's rung is the source-level check the AC itself demands; AC2 is typecheck + the full suite. The suite pins Today's goal rendering (`tests/today.test.mjs` goal a11y lines, `tests/today-qa.test.mjs` ring/goal boundary) plus goal logic (`tests/goals.test.mjs`, `tests/goals-qa.test.mjs`).
- **Edge cases:** the diff changes only which variable the prop reads — no input, branch, or boundary moved. Guard classes reachable for `goalHistory`: object or `null` only, both exercised in the suite.
- **Revert check:** reverting the diff would fail AC1's grep (inline copy reappears), so the check cannot silently pass on broken code.
- **Rank:** no High gaps. No Medium/Low material.

## Screenshots

Not captured — intentional. The issue states "no user-visible behavior" and "Evidence screenshot: n/a — why: code duplication, no pixel"; both ACs are code-level, no UI-affecting change.

## Verdict

✅ **PASS — 2/2 AC** · QA v2 · head `f485dd8`
