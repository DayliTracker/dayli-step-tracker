# QA evidence — issue #19 (phase-3 HealthKit config, entitlements, permissions) · v1

Head under test: `3985f28`. Branch: `issue-19-phase-3-healthkit-config-entitlements-permissions`.
Environment: Xcode 27.2 · iOS 27.0 simulator "iPhone 18 Pro"
(UDID `D1685295-6302-4015-B352-561ECA30D998`) · dev build (`Debug`, iphonesimulator,
`xcodebuild -workspace ios/DayliStepTracker.xcworkspace -scheme DayliStepTracker` → **BUILD SUCCEEDED**).
Expo Go was NOT used (PROJECT.md forbids it as a verification path).
Unit suite: `npm test` → **137/137 pass, 0 fail** (QA worktree, this session).
Typecheck: `npm run typecheck` → exit 0 (Builder pass this session).

## Harness

`UITests.swift` (copied here as `UITests.swift.txt` for review) is a disposable XCUITest
bundle added to the CNG-generated, gitignored `ios/` tree — not part of the PR diff.
Two test cases, both **passed** on this session:

- `testFirstLaunchExplainSkipRelaunchSettingsRequest` — passed (39.3 s)
- `testEnglishSurfaces` — passed (19.1 s)

## Per-AC proof

| AC | Evidence | Result |
|---|---|---|
| AC1 bundle ID | generated `project.pbxproj`: `PRODUCT_BUNDLE_IDENTIFIER = com.daylitracker.dayli`; built app `Info.plist` `CFBundleIdentifier = com.daylitracker.dayli`; no `com.anonymous.` in the diff | PASS |
| AC2 dev build installs with read-only entitlement + disclosure | `codesign` ad-hoc signature embeds the entitlement plist in the binary: `<key>com.apple.developer.healthkit</key><true/>` (extracted at binary offset 13445; ad-hoc simulator signing shows an empty DER slot, the raw plist blob is the authoritative embed). Built `Info.plist` carries `NSHealthShareUsageDescription` ("…Read-only — Dayli never writes health data."); `NSHealthUpdateUsageDescription` is absent. App installed via `simctl install` and launched. pbxproj wires `CODE_SIGN_ENTITLEMENTS = DayliStepTracker/DayliStepTracker.entitlements` (lines 356/393) | PASS (static embed + install/launch) |
| AC3 explain-before-request; skip usable; never auto-reprompt | `vi-01` first launch shows the explanation sheet with NO system sheet behind it; `vi-02` home after "Để sau" (skip); `vi-03` app relaunch — no sheet, no prompt (the test asserts absence with a 10 s wait and passed). Skip records `{"decision":"skipped"}` — observed verbatim in `RCTAsyncLocalStorage_V1/manifest.json` on the simulator | PASS |
| AC4 Settings later request opens the system flow | `vi-04` Settings row "Quyền truy cập Sức khỏe"; `vi-05` Health page shows the typed skipped state copy; `vi-06` the page's request button re-opens the explanation sheet; `vi-07`/`vi-08` after Continue the **system permission sheet** appears: "Allow "Dayli Step Tracker" to access your Health data?" with a **Read Access** section only, our App Explanation text, the Steps toggle, Allow / Don't Allow | PASS |
| AC5 typed states distinct + EN/VI | `src/healthkit.ts:35-39` four variants; unit `tests/healthkit.test.mjs:67,100` asserts all four localized + distinct in EN and VI; on-device: `vi-05` (VI skipped copy) and `en-02` (EN granted copy) render both languages of the same surface | PASS |
| AC6 minimum iOS verified + documented | `docs/healthkit-native-setup.md` documents **iOS 16.4**; generated project `IPHONEOS_DEPLOYMENT_TARGET = 16.4`; `node_modules/expo-modules-core/ExpoModulesCore.podspec:54` floor `:ios => '16.4'`; the doc references the phase-03 spec's open exit criterion | PASS |

`en-01` shows the Settings list in English (same surface as `vi-04`).

## Honest limits (what this run does NOT claim)

- **The system sheet was not answered on this simulator.** The HealthKit permission UI is a
  remote-process sheet: XCUITest element taps, coordinate taps, and UI interruption monitors
  do not reach it on this host (Xcode 27.2 / iOS 27.0). The sheet itself, its read-only
  scope, and our disclosure are captured (`vi-07`, `vi-08`). The app-side consequence of an
  answer is proven through the app's documented decision record (below), not through a live
  system-sheet answer. Live grant/decline evidence stays a physical-iPhone item per
  `docs/phase-03-native-health-integration.md` line 121 and `docs/super-board/PROJECT.md`.
- **`en-02` / `en-01` run with the decision record seeded to `{"decision":"requested"}`**
  (written to `RCTAsyncLocalStorage_V1/manifest.json` with the app terminated; the shape is
  the app's versioned contract pinned by `tests/healthkit.test.mjs:42-53`) and the device
  per-app language set to English (`AppleLanguages = en`). This drives the app into a
  defined state to photograph the connected surface; it does not fabricate any HealthKit
  answer.
- Debug dev builds load their JS from Metro; the server for this run was started from the
  QA worktree at `3985f28`, so the JS under test is the branch's code. A stale Metro from
  the main checkout (serving pre-HealthKit code, started Nov 6) was found on port 8081 and
  killed before evidence capture — the first two screenshots taken before that kill were
  discarded.
- Web viewports (1920×1080 / 1024×768 / 375×667) do not apply to a native iPhone app;
  screenshots are native iPhone 18 Pro simulator captures (repo-standard path).

## Files

`TEST-PLAN.md` · this file · `UITests.swift.txt` · 12 screenshots (`vi-01…vi-08`, `en-01…en-02`,
`ac3-01-first-launch-explain.png` — the pre-harness first-launch capture, same evidence as `vi-01`).
