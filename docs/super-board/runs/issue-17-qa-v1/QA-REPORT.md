# Issue #17 QA report — v1

**Outcome:** Pass — 5/5 acceptance criteria
**PR:** [#35](https://github.com/DayliTracker/dayli-step-tracker/pull/35)
**Reviewed head:** `6910c062f969384a59939060b569a272311bce32`
**Base:** `origin/main` at `517d45f187397e85bc0edbdc6f0f385e55239999`
**Branch:** `issue-17-goal-editing-history`
**Device evidence:** iPhone 17 simulator, iOS 27.0, `com.anonymous.dayli-step-tracker` Release build from this head; screenshots + idb accessibility dumps in this folder (`*.png` / `*.ax.json`).

## Host tooling note

`xcrun simctl` and per-UDID xcodebuild destinations hang on this host (CoreSimulator 1174.9.2 < 1174.21.0 — same drift documented in the 2026-10-31 run). QA used the documented workaround: direct CoreSimulator binary via `/tmp/qa-shim/simctl`, Release build with `-destination 'generic/platform=iOS Simulator'`, install/launch/screenshots through the shim, interactions via `idb ui tap/key/text` with accessibility-tree assertions. Every step was verified against the AX tree with polling; nothing is claimed without a dump or screenshot.

## Acceptance criteria

| AC | Result | Observable evidence |
|---|---|---|
| A custom goal set in Settings is reflected on Today immediately, including ring fill and the goal-reached state. | Pass | On device: save 1 → Today shows "1 steps" (`09-today-goal-1`); save 4,000 → Today shows "4,000 steps" (`09-today-custom-4000`); save 100,000 → "100,000 steps" (`16-today-100000`) — each without a restart, a11y label "Daily goal: N steps." updated. Unit: ring fill and goal-reached keyed to the saved goal, not the 8,000 constant — `tests/goals.test.mjs:170-184` (wiring), `tests/goals-qa.test.mjs:15-31` (custom-goal fill/reach), `src/today.ts:35-40,61-63`. Phase-1 shell has no step source, so the ring is dark and goal-reached cannot fire on-device by design (`App.tsx:225-232`, snapshot `unavailable`); the goal value feeds `litSegments`/`goalReached` exactly as the unit tests pin. |
| Validation accepts 1 and 100,000 and rejects 0, 100,001, fractional, blank, and malformed input without changing the saved goal. | Pass | On device: `0` rejected with "Enter a whole number from 1 to 100,000.", goal stays 8,000 (`04-goal-invalid-0`); `100001` rejected, goal stays 1 (`05-goal-invalid-100001`); `12.5` rejected (`06-goal-invalid-fractional`); blank submit rejected (`06b-goal-invalid-blank`); `1` accepted (`07-goal-saved-1`); `100000` accepted (`15-goal-saved-100000`). Unit: full rejection table incl. `8,000`, `-1`, `+8000`, `1e4`, Arabic-Indic digits, zero-padded zero — `tests/goals.test.mjs:39-94`, `tests/goals-qa.test.mjs:33-45`. |
| Changing today's goal leaves previous dates' goals unchanged in Progress (historical goals per date). | Pass | On device: after the first change (today 4,000), Oct 31 and earlier still show the 8,000 default (`10-progress-after-4000`); with a seeded past entry (2026-10-28 → 6,000), Oct 28–31 show 6,000, Oct 26–27 keep the 8,000 default, today keeps 4,000 (`11-progress-seeded-past`); changing today to 5,500 leaves Oct 28–31 at 6,000 (`13-progress-past-unchanged`). Unit: today-only write — `tests/goals.test.mjs:96-106`; carry-forward/latest-earlier — `tests/goals.test.mjs:108-116`, `tests/goals-qa.test.mjs:47-55`; per-row rendering — `App.tsx:316-336`. |
| The custom goal persists across app restart. | Pass | On device: terminate + relaunch after saving 5,500 → Today shows "5,500 steps" (`14-today-restart-5500`); backing store `dayli.goals.v1` = `{"goals":{"2026-10-28":6000,"2026-11-01":5500}}` read from the app container. Unit round-trip — `tests/goals.test.mjs:118-137`. |
| `npm test` and `npm run typecheck` pass with new unit tests for goal validation and per-date history. | Pass | `npm run typecheck` exit 0; `npm test` 77/77 pass (73 builder + 4 QA gap tests), node v22.14.0, on this head. |

## Test-gap check

High gap found and closed in this pass: every ring-fill / goal-reached test used only `DEFAULT_GOAL`, so AC1's custom-goal behavior had no unit coverage. `tests/goals-qa.test.mjs` adds it. Red-first verified with four mutations, each run, seen red, and reverted (never committed):

| Mutation | Test that went red |
|---|---|
| `goalReached` `>=` → `>` (`src/today.ts:62`) | QA: ring fill and goal-reached follow a custom goal |
| `parseGoalInput` `.trim()` dropped (`src/goals.ts:41`) | QA: input edges |
| `isValidGoal` `value >= MIN_GOAL` → `>= 0` (`src/goals.ts:25`) | QA: input edges |
| Today a11y goal line pinned to `DEFAULT_GOAL` (`src/today.ts:76`) | QA: the Today screen-reader goal line announces the custom goal |

Remaining gaps (not written, not blocking):

- Medium: the save-refusal path when the goal history read failed (`canSave=false`, `App.tsx:452`) is asserted at source level only (`tests/goals.test.mjs:183`); injecting a failed read at launch has no seam in this test setup.
- Low: Settings subtitle "Current goal: N steps" after a custom save is wired (`App.tsx:127-129`) but only the default subtitle was screenshotted.

## Observations (not AC failures)

- Low: goal lines do not pluralize — "1 steps" (`09-today-goal-1`). Pre-existing copy format `{value} {steps}`; cosmetic.
- The editor prefill initializes from the goal at mount and does not re-sync if the prop changes afterwards; on-device the prefill was correct in every flow (`4000`/`5500` prefills observed), so no defect claimed.

## Verification limits

No HealthKit/step-source behavior exists in this phase; ring fill and goal-reached are exercised at unit level with custom goals, on-device they render the truthful "no data" shell. No tablet runtimes (app declares `supportsTablet: false`). Seeding of the past-date entry wrote the same AsyncStorage document the app itself writes (verified valid JSON, then read back by the app after relaunch).
