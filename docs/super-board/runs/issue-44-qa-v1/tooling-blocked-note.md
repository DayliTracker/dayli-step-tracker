# QA pass 1 — tooling-blocked note (issue #44, PR #53)

QA worktree: `.claude/worktrees/issue-44-qa/` @ `6d36f72` (issue branch `issue-44-settings-stepper-mini-duck-ring-out`).
Date: 2026-11-06 · Tester lane · iPhone 17 Simulator (77EC52AC-8FB5-4CE2-B248-A27A071541EE), iOS 27.0, 402x874.

## What passed (ran here, this pass)

- `npm ci --silent` → exit 0
- `npm run typecheck` → exit 0
- `npm test` → `# tests 124 / # pass 124 / # fail 0` (includes the #44 structural
  tests in `tests/shell.test.mjs`, `tests/progress.test.mjs`,
  `tests/a11y-dumps.test.mjs` that pin the stepper, mini duck, and ring removal)
- `litSegments` unit suites: `node --experimental-strip-types --test tests/today.test.mjs tests/today-qa.test.mjs`
  → `# tests 16 / # pass 16 / # fail 0` (assertions at `tests/today.test.mjs:16-22`,
  `tests/today-qa.test.mjs:17-23`; math kept at `src/today.ts:37`)
- `grep -rn "litSegments|segmentAngle|RING_SEGMENTS" App.tsx components/` → no matches
  in the shell (only `colors.ringLit` as the selected-row palette role, `App.tsx:952`)
- Home state live screenshots + `idb ui describe-all` dump (`ac4-home-a11y-dump.json`):
  one labeled group "300 steps. Daily goal: 8,000 steps. 0× of goal. Source: Manual.",
  no ring element, and the manual total saved during the Builder's session (300)
  survived a cold relaunch — persistence through the manual-totals owner observed live.

## What is tooling-blocked

The Settings screen is reachable only by the #42 swipe (App.tsx:435: dx ≤ −48) or the
VoiceOver custom action "Open Settings" (App.tsx:481) — neither can be driven on this
host today:

1. `idb ui swipe` never streams drag events. Five attempts on the app (y=400 through
   the duck, y=680, y=700, y=250 top area, duck-start 240→40) collapsed to tap/hold
   behaviors: duck poke bubbles ("again! again!", "hey! that tickles"), stroll ("a
   tiny stroll?"), never navigation. `--delta 5` is ignored; `--duration` hangs the
   idb client (killed with a watchdog each time). Two fresh `idb_companion` instances
   (port 10882) behaved identically.
2. Systemic confirmation, not app-specific: with the app terminated, a downward
   top-edge→500pt drag on the native springboard produced no Notification Center
   (`tooling-springboard-drag-no-response.png`). Native iOS ignores idb HID drags on
   this stack (iOS 27.0 + idb_companion built Oct 22 2026).
3. Alternatives absent: `axe`, `maestro`, `appium`, `applesimutils`, `fbsimctl` not
   installed; ios-simulator plugin UI backend reports `idb` not on its PATH; no
   Simulator.app GUI window (headless boot) and no Quartz/pyobjc for event injection;
   `xcrun simctl` has no touch injection; the app registers only the dev-client URL
   scheme (no deep-link navigation); the iOS 27.1 runtime refuses every device type
   (`Incompatible device` for iPhone 17 and iPhone 18 Pro).
4. `idb ui describe-all` exposes the home group's `custom_actions: ["Open Settings"]`,
   but the idb CLI has no verb to fire accessibility actions.

## Consequence for the ACs

- AC1 (rows + tap opens stepper for that exact date), AC2 (−/+ 100 with 0 floor,
  Save persists row+home, Cancel), AC3 (poke → surprised + heart → home): test-level
  verification passes here (the pinned a11y-dump geometry tests and structural tests
  run green in this pass), but live interaction evidence on the Settings screen was
  not capturable by QA. The Builder's captures on PR #53 remain the only live evidence
  for those ACs; QA cannot independently confirm them on this host.
- AC4 (no ring; structural tests updated; litSegments green): verified in full.
- AC5 (typecheck + test + before/after screenshots embedded on PR): verified in full
  (typecheck exit 0; 124/124; PR #53 body embeds before/after screenshots and a11y
  dumps pinned to head `6d36f72`).
