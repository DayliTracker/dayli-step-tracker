# Issue #20 — QA v1 evidence (PR #60 @ 1a4835a)

Environment: Xcode 27.2 (27B52), iPhone 18 Pro simulator (iOS 27.0, booted),
dev build from `npx expo run:ios` on the issue branch; interaction via idb
(taps + accessibility reads; see "Tooling limits").

## What was run

- `npm test` → 149/149 pass (incl. 10 new adapter boundary-state tests,
  tests/health-steps.test.mjs).
- `npm run typecheck` → exit 0.
- Dev build installed on the simulator; app driven live: first-launch sheet,
  native permission sheet, skip path, restart, storage inspection.
- Test-gap ledger: TEST-GAP.md (this folder).

## Findings

### F1 (High — AC4): a manual total cannot be removed in the UI

- `removeManualTotal` (src/manual-totals.ts:75) has zero callers in the app —
  only tests call it. The stepper popup (App.tsx:846-884) offers only
  Cancel/Save; `stepDelta` floors at 0 (App.tsx:779) and 0 is a *valid*
  manual total ("a genuine rest day", src/manual-totals.ts:14-16), so a saved
  manual total keeps precedence forever and never reveals the Health total or
  the no-data state. Phase 2 had a visible Remove button (commit 1fc0f0f,
  App.tsx:184); #44's stepper dropped it; this PR restores neither.
  AC4's "removing it reveals the Health total or the correct no-data state"
  is unreachable for a user. Fix looks like: a Remove affordance in the
  stepper popup that calls the existing `removeManualTotal` + a test pinning
  the affordance reaches the store.

### F2 (Medium — build config, #19 foundation): dev builds embed empty entitlements

- `codesign -d --entitlements :-` on three build products (this branch's
  Debug, the #19-era Debug, a Release) shows `<dict></dict>` — the HealthKit
  entitlement never reaches the signature, although the generated
  `ios/DayliStepTracker.xcodeproj/project.pbxproj` sets
  `CODE_SIGN_ENTITLEMENTS = DayliStepTracker/DayliStepTracker.entitlements`
  and the file carries `com.apple.developer.healthkit = true`.
- Live consequences on the simulator (all reproduced):
  - `requestStepReadAuthorization` completes with an error after the user
    answers Allow → the sheet renders "Step access could not be requested on
    this device." (05-after-allow-home.png).
  - `readDailyStepTotals` rejects: `Error Domain=com.apple.healthkit Code=5
    "Authorization not determined"` (sim log, 02:40:25) → home renders the
    error state ("Today's steps could not be loaded.").
- The app behaves truthfully at every step (errors surfaced, never faked);
  the defect is in the host build toolchain, not the adapter. Device builds
  take the entitlement from the provisioning profile, so this is unlikely to
  reproduce on hardware — but it blocked all granted-path simulator coverage
  and deserves a follow-up on #19's setup (docs/healthkit-native-setup.md).

## Live state evidence (idb accessibility reads + screenshots)

| State driven | Home a11y label (verbatim) | Screenshot |
|---|---|---|
| Decision record said `requested`, refresh rejected (entitlement defect) | "Today's steps could not be loaded. Daily goal: 8,000 steps." | 01-home-launch-no-data.png |
| First launch, fresh install | explain-before-request sheet opens on home | 03-first-launch-explain-sheet.png |
| Enable step access tapped | native read-only HealthKit sheet: single "Steps" read topic, NSHealthShareUsageDescription text | 04-native-permission-sheet.png |
| Allow completed (OS accepted, app request errored) | request-failure line in the sheet: "Step access could not be requested on this device." — decision NOT recorded, no fake granted state | 05-after-allow-home.png |
| "Not now" tapped | "Your step total will appear when step data is connected. Daily goal: 8,000 steps." (not-connected wording) | — |
| After terminate + relaunch | sheet does NOT reopen (decision persisted, no nag); same not-connected label | 06-restart-not-connected.png |

- Tap automation proof: 02-duck-poke.png (duck poke bubble "hey! that
  tickles").
- Home exposes the "Open Settings" accessibility custom action (swipe remains
  the sighted extra).
- Sim log proves the app-open refresh fires the one-shot
  `HKStatisticsCollectionQuery` for `HKQuantityTypeIdentifierStepCount` on
  launch (02:40:25) — and its rejection renders as the error state, never a
  zero-step success (AC3's error half, live).

## Storage inspection (AC5, runtime half available on this host)

After a restart, the app's entire AsyncStorage store
(`Library/Application Support/com.daylitracker.dayli/RCTAsyncLocalStorage_V1/manifest.json`)
contains exactly one document:

```
{"dayli.health-decisions.v1":"{\"decision\":\"skipped\"}"}
```

No step-totals key exists anywhere in the container. The decision record is
the only storage write in the health module (tests/health-steps.test.mjs:96
pins this); fetched totals live in React state only (App.tsx:143). The
granted-session inspection (totals present at runtime, absent from storage)
still needs the physical iPhone.

## Tooling limits on this host (recorded, not worked around)

- idb HID **swipes/drags never reach React Native's gesture recognizer**
  (5 parameterizations tried; taps and a11y reads work — 02-duck-poke.png).
  Therefore: pull-to-refresh could not be driven, and Settings navigation
  (swipe-led) was unreachable — the Health page's last-refresh line and the
  stepper popup could not be screenshotted. Both are pinned by unit/source
  tests (tests/health-steps.test.mjs:184, :251).
- No GUI session automation (no assistive access; Xcode 27 ships no
  Simulator.app to script), so drag-based interaction has no fallback.
- No CLI exists to seed HealthKit step data on the simulator; with the
  entitlement defect (F2) the granted read path cannot run here at all.
- No physical iPhone is attached to this host: AC1 and the device halves of
  AC5/AC6 remain Eric's to close.

## AC roll-up

- AC1 — NOT RUN: physical iPhone required (no device on host).
- AC2 — open-refresh live-proven (log), no-background-refresh proven
  (source + Swift one-shot + tests); foreground/pull wiring + last-refresh
  display proven by tests/source; live observation blocked (tooling limits).
- AC3 — PASS: neutral no-data copy distinct from skipped/declined (tests +
  two distinct live wordings); native rejection rendered as an explicit
  error, never zero steps (live).
- AC4 — FAIL (F1).
- AC5 — PASS on the inspectable half (storage inspection above; clear-data
  never touches grants by construction — src/clear-data.ts removes 4 local
  keys, no revoke API exists in the native module); granted-session half
  needs device.
- AC6 — `npm test` 149/149 + typecheck clean (ran here); device-evidence
  half needs the physical iPhone.
