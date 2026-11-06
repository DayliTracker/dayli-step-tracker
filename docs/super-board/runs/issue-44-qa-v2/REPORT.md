# QA pass 2 — issue #44 (PR #53) — the AC1–AC3 walkthrough, live

Date: 2026-11-06 · Tester lane (Wave U re-run) · iPhone 18 Pro simulator,
UDID `D1685295-6302-4015-B352-561ECA30D998`, iOS 27.0, 402×874.

This pass re-drives exactly the walkthrough the Blocked card's own template
pinned: swipe-left entry → Settings, date-row taps → stepper (±100 / Save /
Cancel), mini-duck poke → home. QA v1 verified AC4+AC5 but was tooling-blocked
on AC1–AC3 (`docs/super-board/runs/issue-44-qa-v1/tooling-blocked-note.md`).

## Driver — why XCUITest

The host's idb companion still cannot stream HID drags on this stack, even on
the freshly reconnected companion (pid 23958, grpc-domain-sock) this pass
started on:

- `idb ui swipe 340 420 60 420` (plain, twice) → exit 0, screen unchanged.
- `idb ui swipe 340 500 80 500 --delta 8` → returns in 0.2 s, no navigation.
- `idb ui swipe --duration 600 --delta 8` → client hangs (killed), no movement.
- Taps DO deliver (duck poke bubble "hey! that tickles" observed live).
- Host-GUI drivers are permission-walled: osascript System Events window
  introspection → "not allowed assistive access"; no Simulator.app in this
  Xcode (only DeviceHub, whose window is not introspectable either).

So this pass used the Blocked template's own unblock route 2: an XCUITest UI
runner — the drag-capable driver the template names first. The driver is
`SettingsWalkthroughTests.driver.swift.txt` in this folder (archived from
`ios/DayliStepTrackerUITests/SettingsWalkthroughTests.swift`, which lives in
gitignored expo-prebuild output; added to the generated project via the
xcodeproj gem, scheme `QA44`).

Build provenance: the app under test was built Release from this QA worktree
at PR head `d7f43a8`; its embedded `main.jsbundle` greps for the branch's
feature strings (`Open Settings`, `stepperDecrease`, `manualSave`,
`that tickles`) all hit before install. Tests ran with
`xcodebuild test -scheme QA44 -configuration Release -destination id=D1685295…`.

## Result: all four test methods green (AC1–AC4)

```
Executed 4 tests, with 0 failures (0 unexpected) in 73.850s
** TEST SUCCEEDED **
```

- `test_a_ac1_date_rows_and_stepper_opens_for_that_exact_date` — passed.
  Swipe-left opens Settings (`app.swipeLeft()`, RN pan dx ≤ −48 at
  `App.tsx:435`). Exactly 7 date-row buttons found; every row's a11y label
  carries either the truthful no-data sentence ("Your step total will appear
  when step data is connected.") or `N steps` (the visual value '—' is a child
  of each accessible row, so it never appears as its own element; it is visible
  in `ac1-02-settings-after-swipe-left.png`). Tapping the Today row opens the
  stepper overlay: title "Today", readout "Steps for this date: 0", −/+ buttons
  present (`ac1-03-stepper-open-for-today.png`).
- `test_b_ac2_step_bounds_save_persists_cancel_is_a_noop` — passed.
  +100 steps once → readout 100; −100 steps ×3 from 100 → clamped at 0
  (0 floor, `ac2-01-floor-at-zero.png`); +100 ×3 → 300; Save → the Today row
  label becomes "… 300 steps. … Source: Manual."
  (`ac2-02-row-reflects-300.png`) and home's accessible group label reads
  "300 steps. Daily goal: 8,000 steps. … Source: Manual."
  (`ac2-04-home-reflects-300.png`). Cancel on ANOTHER date row: draft 200 →
  Cancel → the row label is unchanged and reopening shows its saved value 0,
  not 200 (`ac2-03-draft-200-before-cancel.png`).
- `test_c_ac3_mini_duck_poke_returns_home` — passed. The mini duck is a
  labeled button ("Poke the duck to go home" — the VoiceOver-equivalent
  control, `ac3-01-settings-with-mini-duck.png`); tapping it leaves Settings
  and lands home (arrival transition captured mid-slide in
  `ac3-02-poke-reaction.png`, home settled in `ac3-03-home-after-poke.png`).
- `test_d_ac4_no_ring_elements_on_any_screen` — passed. No element whose label
  contains "ring" on home or Settings; screenshots `ac4-01-home-ring-free.png`,
  `ac4-02-settings-ring-free.png`.

## Local suites (run on this branch this pass)

- `npm run typecheck` → exit 0.
- `npm test` → `# tests 124 / # pass 124 / # fail 0`.
- litSegments suites: `node --experimental-strip-types --test tests/today.test.mjs tests/today-qa.test.mjs`
  → 16/16 pass (assertions `tests/today.test.mjs:16-22`, `tests/today-qa.test.mjs:17-23`).
- `grep -rn "litSegments|segmentAngle|RING_SEGMENTS" App.tsx components/` → 0 matches;
  the only ring-flavored reference is the `colors.ringLit` palette role (`App.tsx:952`).

## Notes

- The QA sim's device locale is `vi`; the driver pins the app process to
  `en-US` via `XCUIApplication.launchArguments` so assertions match the English
  copy in `src/localization.ts`.
- A first test session left the sim's accessibility service wedged (all a11y
  dumps returned only the AXApplication element until the simulator was
  rebooted). After the reboot, idb `describe-all` reads the full tree again.
- Raw evidence bundle: `/tmp/dayli-qa/qa44.xcresult` (session-local); the 12
  exported screenshots live beside this note.
