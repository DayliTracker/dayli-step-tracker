# Issue #20 — builder evidence (development build, iOS Simulator)

Environment: Xcode 27.2 (27B52), iPhone 18 Pro simulator (iOS 27.0 runtime),
Expo dev build with the local `DayliHealthKit` module (`npx expo run:ios`,
headless simulator on this host).

**Build proof**

- The dev build compiles and installs with the new module: the app's
  `DayliStepTracker.debug.dylib` (RN 0.88 debug layout) contains the
  `readDailyStepTotals` symbol, and `Pods/libDayliHealthKit.a` built from this
  branch's Swift source.
- The simulator carries `dayli.health-decisions.v1 = {"decision":"requested"}`
  from #19's QA, so the app launches in the `granted` permission state.

**What the screenshot shows**

| File | What it shows |
|---|---|
| 01-home-no-data.png | Today on the dev build, granted access, after the app-open refresh ran: the count slot renders the truthful `—` (neutral no-data path), the duck and textless shell unchanged. The first-launch explain sheet correctly stays closed for a granted user. |

**What simulator evidence proves here:** the app builds with the one-shot
`HKStatisticsCollectionQuery`, launches in the granted state, and the app-open
refresh executes through the native module without crashing — rendering the
truthful no-data state rather than a fabricated zero (AC3's no-data wording).

**What simulator evidence cannot prove (and this PR does not claim):**

- Live HealthKit coverage — AC1 requires a physical iPhone with user-supplied
  device time (issue Risk; phase-03 spec Test 1).
- A populated Health read: this host's simulator has no supported CLI to seed
  HealthKit step data, so the read resolves with zero samples (the truthful
  empty path). Data-present rendering is covered by unit tests
  (tests/health-steps.test.mjs).
- The Settings → Health granted page with the last-refresh line: this host has
  no touch automation (idb unavailable, no GUI session), so navigation could
  not be driven. The line's presence logic is covered by unit tests and the
  source checks in tests/health-steps.test.mjs.
