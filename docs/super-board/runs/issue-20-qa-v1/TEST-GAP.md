# Issue #20 — Tester test-gap ledger (PR #60 @ 1a4835a)

Scope: `git diff --name-only dc3d66f...HEAD` — App.tsx, src/healthkit.ts,
src/localization.ts, src/progress.ts, modules/dayli-health-kit/{index.ts,
ios/DayliHealthKitModule.swift}, tests/*.

## 1. Ledger — every AC → the asserting test

| AC | Unit / contract test | e2e / device | Verdict |
|---|---|---|---|
| AC1 physical iPhone live totals | n/a — no physical device on this host | **none — tooling-blocked** (no iPhone; simulator explicitly not accepted by the AC) | not closable here |
| AC2 refresh open/foreground/pull + last refresh + no background | `tests/health-steps.test.mjs:184` — RefreshControl wiring, AppState 'active' re-fire, `subscription.remove()`, no `setInterval`/`BackgroundFetch`, granted-only gate, success stamps `lastRefreshMs`, failure keeps previous totals | pull gesture + last-refresh line exercised on simulator with idb (this run) | pass (sim scope) |
| AC3 neutral no-data wording, distinct from skipped/declined, errors never zero-step | `tests/health-steps.test.mjs:58` (malformed payload → error), `:76` (null reader / rejected query / malformed → error), `:136` (full truth table), `:168` (copy neutral + distinct, EN+VI) | no-data home screenshot (sim); error state via unit truth table | pass |
| AC4 manual precedence never summed; **removing reveals Health/no-data** | `tests/health-steps.test.mjs:121` (precedence, removal reveals, empty); `tests/manual-totals.test.mjs:102` (store create/edit/remove) | **UI remove path does not exist — `removeManualTotal` (src/manual-totals.ts:75) has zero callers in App.tsx** | **FAIL — High gap, needs app code** |
| AC5 fetched totals never persisted; clear-data keeps grants | `tests/health-steps.test.mjs:96` (loader never writes; only `setItem` is the decision record; key list), `:213` (in-memory reset); `src/clear-data.ts:19` (4 local keys only) | storage inspection of the app container after a restart (this run) | pass |
| AC6 suite + typecheck + boundary tests | ran here: `npm test` → 149/149, `npm run typecheck` → exit 0 | — | pass |

## 2. Edge cases

Pinned (test file:line): malformed/non-array payload, NaN and negative steps,
out-of-window sample (2020), null reader, rejected query, 0-sum truthful 0,
fragment sums with rounding (1000.4+2000.3→3001), manual precedence vs Health
(3000 vs 8000 → 3000 manual, never 11000), removal reveals Health, empty vs
unavailable vs refreshing vs failed under granted, all not-connected
permissions → unavailable, failed refresh keeps old totals, failed manual read
→ error even with Health data, copy distinct in both locales.

Gaps (all non-blocking, go to the Builder handoff):
- **High — AC4 UI removal path.** The stepper popup (App.tsx:846-884) offers
  only Cancel/Save; `stepDelta` floors at 0 and 0 is a *valid* manual total
  ("a genuine rest day", src/manual-totals.ts:14-16), so saving 0 keeps manual
  precedence forever and never reveals the Health total. `removeManualTotal`
  exists (src/manual-totals.ts:75) and phase 2's UI used it (commit 1fc0f0f
  App.tsx:184 with a visible Remove button); issue #44's stepper (32ced8f)
  dropped the button and this PR did not restore it. AC4's second clause and
  phase-03 spec Test 6 ("remove it and verify the source falls back
  correctly") are unreachable for a user. Witness: `grep -rn removeManualTotal
  App.tsx` → no match; only tests call it.
- Medium — a hung native promise leaves `refreshing: true` forever (no
  timeout on `loadDailyStepTotals`); today every Swift path settles
  (ERR_UNAVAILABLE / ERR_RANGE / ERR_QUERY_FAILED / resolve), so low likelihood.
- Low — the in-flight duplicate-trigger guard (`refreshBusy`, App.tsx:352) is
  not asserted by any test.
- Low — a sample exactly at the window boundary `fromMs` is accepted
  (`startMs < fromMs` rejects only strictly-before); correct but unpinned.
- Low — dead code: `mergeDayTotals` (src/healthkit.ts:174-187) is unexported,
  uncalled, and carries a stale "// window validation below" comment with no
  validation.

## 3. Test-the-tests

No test asserts on its own mock in a way that cannot fail: reader doubles are
injectable surfaces; source-assertion tests pin real contracts (RefreshControl
props, AppState branch, Swift one-shot shape). Surviving mutants checked:
dropping the window check → out-of-window test fails; summing manual+health →
precedence test fails; resolving a rejection as `[]` → loud-fail test fails.

## 4. Rank and act

High: AC4 removal gap → needs app code (a Remove affordance in the stepper
popup, calling the existing `removeManualTotal`, plus a test pinning the
affordance reaches the store) → **Fail per super-qa: bounce to Builder**.
Medium/Low: listed above as handoff items, not blocking.
