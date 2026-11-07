# Issue #20 — QA v2 evidence (PR #60 @ 27d2605)

Scope of this pass: re-verify the full AC set after the Builder's round-2 rebuild of AC4
(`27d2605` — stepper Remove affordance). Focus is AC4's removal clause, driven live.

Environment: Xcode 27.2 (27B52), iPhone 18 Pro simulator (iOS 27.0, booted), fresh dev
build from `npx expo run:ios` on the issue branch at `27d2605` (bundle
`com.daylitracker.dayli`), interaction via idb taps/swipes + accessibility reads.

## What was run

- `npm test` → 150/150 pass (adapter boundary-state tests in tests/health-steps.test.mjs;
  the AC4 UI-path pin in tests/shell.test.mjs — the stepper-wiring test).
- `npm run typecheck` → exit 0.
- Fresh install on the simulator; app driven live through the whole manual-total life
  cycle on the Progress rows (states below).
- Storage inspection before/after removal (storage-inspection.txt).
- Terminate + relaunch: the removal persists; home renders the truthful no-data state.

## AC4 — the rebuilt removal clause, live

| Step | a11y state (verbatim) | Screenshot |
|---|---|---|
| Stepper on a date with no manual total — **no Remove offered** (Cancel + Save only) | `Cancel` `Save total`, draft "Steps for this date: 0" | 04-stepper-no-manual-no-remove.png |
| Saved 100 on Today → row takes manual precedence | "Today. 100 steps. Daily goal: 8,000 steps. **Source: Manual.**" | 05-today-manual-100.png |
| Stepper reopened on that date — **Remove total appears** (destructive red, between Cancel and Save) | `Cancel` `Remove total` `Save total` | 06-stepper-with-remove.png |
| Tapped Remove total → popup closes, row re-renders from the store | "Today. … No step data for this date yet." (no-data state — Health has no data on the sim, so removal reveals the correct no-data state, not a Health total) | 07-after-remove-row-revealed.png |
| Save-0 rest day: Save with draft 0 → 0 is a *valid* manual total | "Today. **0 steps**. Daily goal: 8,000 steps. Source: Manual." | 08-today-manual-0-rest-day.png |
| Stepper reopened on the rest day — **Remove total offered for a stored 0** (v1's "Save-0 keeps precedence forever" complaint is fixed) | `Cancel` `Remove total` `Save total`, draft "Steps for this date: 0" | 09-stepper-rest-day-remove-offered.png |
| Removed the rest day → row truthful again | "Today. … No step data for this date yet." | 10-after-remove-rest-day.png |
| Manual precedence on home (100 saved again, Back to Today) | "100 steps. Daily goal: 8,000 steps. 0× of goal. Source: Manual." — the pill renders `100 👣` | 11-home-manual-100-precedence.png |
| After Remove + restart — removal persisted, home truthful | "Your step total will appear when step data is connected. Daily goal: 8,000 steps." | 13-restart-no-manual-home.png |

## Storage (AC5 re-check on this build)

`storage-inspection.txt`: with the manual total saved, the store holds exactly
`dayli.health-decisions.v1` + `dayli.manual-totals.v1` = `{"totals":{"2026-11-08":100}}`;
immediately after Remove, `{"totals":{}}`; after terminate + relaunch the removal is still
what is stored (13-restart-no-manual-home.png). No step-totals key exists anywhere —
fetched Health totals remain React state only (unchanged from v1; the granted-session
storage inspection still needs the physical iPhone).

## AC2 / AC3 re-observation on this build

- Not-connected home wording on fresh launch (01-launch-fresh-install.png) and the
  skipped/declined wording on the Health subpage (02-health-subpage.png) remain distinct —
  two different truthful sentences, live at `27d2605`.
- This session's decision record is `skipped`, and the app-open refresh guard returns
  early on anything but `granted` (App.tsx:371: `if (healthPerm !== 'granted') return;`)
  — the metro console showed no step query
  on launch, consistent with the guard. The granted-path app-open refresh log evidence
  (the one-shot `HKStatisticsCollectionQuery` on launch) remains QA v1's
  (`docs/super-board/runs/issue-20-qa-v1/simlog-step-query.txt`); the granted live path is
  still blocked by F2 (dev-build entitlements, #19 follow-up). No background refresh: no
  timer/background-fetch code exists; the refresh effect and `RefreshControl` are the only
  callers of `refreshHealthTotals` (tests/health-steps.test.mjs:184).
- Pull-to-refresh live observation stays tooling-blocked: idb swipes do not reach RN's
  gesture recognizer on this host (same as v1). The in-app swipe navigation *was* driven
  live this session (duck-led swipe: Settings ↔ Today), so the block is specific to the
  ScrollView's pull gesture, not all gestures.

## Tooling notes

- idb taps + accessibility reads drive the app reliably; the navigation swipe works when
  it starts on the duck (the duck sits outside the ScrollView, so the pan reaches the
  shell's PanResponder) — swipe attempts starting on the ScrollView surface never set the
  pan responder (recorded as v1's swipe limit; unchanged).
- The "Open debugger to view warnings" toast in the screenshots is dev-build Metro noise,
  not app UI.
