# QA test plan — issue #19 (phase-3 HealthKit config, entitlements, permissions)

Head under test: `3985f28` (branch `issue-19-phase-3-healthkit-config-entitlements-permissions`).
Environment: Xcode 27.2, iOS 27.0 simulator "iPhone 18 Pro" (UDID
D1685295-6302-4015-B352-561ECA30D998), dev build (`Debug`, iphonesimulator).
Expo Go is NOT a verification path (PROJECT.md); this run uses a real dev build.

## One observable test per AC

| # | AC | Observable test | Rung already covered by Builder | Native evidence this run |
|---|---|---|---|---|
| AC1 | Real production bundle ID | Generated project `PRODUCT_BUNDLE_IDENTIFIER` and the installed app's `CFBundleIdentifier` are `com.daylitracker.dayli`; no `com.anonymous.` anywhere in the built app | unit `tests/healthkit.test.mjs:178` (app.json assert) | `project.pbxproj` grep; built `Info.plist`; `simctl appinfo` |
| AC2 | Dev build installs with read-only entitlement + disclosure | `xcodebuild … -sdk iphonesimulator build` succeeds; `codesign -d --entitlements` on the built `.app` shows `com.apple.developer.healthkit`; built `Info.plist` carries `NSHealthShareUsageDescription`; app installs and launches on the simulator | unit `tests/healthkit.test.mjs:158,178` | pbxproj + entitlements file + Info.plist + codesign dump + install/launch |
| AC3 | Explain-before-request; skip leaves manual entry; never auto-reprompt | Fresh install → first launch shows the explanation sheet BEFORE any system permission sheet; "Not now" (skip) returns to a usable home with manual entry; app relaunch does NOT re-open the sheet | unit `tests/healthkit.test.mjs:78,117,193`, App.tsx effect `App.tsx:307-310` | Simulator screenshots of the first-launch sheet, the skipped home, and the relaunch |
| AC4 | Settings offers a later request that opens the system flow when possible | Settings → Health access shows the typed state; "Enable step access" re-opens the explanation sheet; Continue calls the native request → the iOS system permission sheet appears when HealthKit is available on the device | unit `tests/healthkit.test.mjs:135` | Simulator screenshots of the Settings row and the system sheet (or the unavailable path, stated honestly) |
| AC5 | Typed states distinct + localized EN/VI | `HealthPermissionState` has exactly 4 variants (`src/healthkit.ts:35-39`); all four copy keys exist and differ in EN and VI (unit `tests/healthkit.test.mjs:67,100`); the same Settings surface renders in both languages on the simulator | unit (strong) | Simulator screenshots: EN + VI of the Health access row |
| AC6 | Minimum iOS version verified + documented | `docs/healthkit-native-setup.md` documents **iOS 16.4**; generated project `IPHONEOS_DEPLOYMENT_TARGET = 16.4`; `expo-modules-core/ExpoModulesCore.podspec:54` floor `:ios => '16.4'`; phase-03 spec exit criterion referenced | docs + unit | Podspec line + pbxproj grep recorded in EVIDENCE.md |

## Test-gap ledger (post-build check)

- Every AC maps to at least one unit test AND one native/simulator observation in this
  folder. No AC is left with `none` at every rung.
- Edge cases pinned by the Builder's suite: malformed decision record is an error, not a
  reset (`:53`); failed write is an error (`:62`); clear-data removes the decision record
  (`:88`, `src/clear-data.ts:23`); failed record read never opens the sheet (`:78`,
  `App.tsx:302-310`); request failure is loud, not a zero-step success (`:150`).
- Remaining gap (accepted, documented): live grant/decline behavior of the SYSTEM sheet on
  a physical iPhone — spec `docs/phase-03-native-health-integration.md` line 121 reserves
  live HealthKit acceptance for physical-device evidence; simulator results here make no
  such claim.

## Viewports

Web viewports (1920×1080 / 1024×768 / 375×667) do not apply to a native iPhone app; the
standard path for this repo is iPhone simulator screenshots (see prior runs
`docs/super-board/runs/dayli-run-*.png`). Screenshot source is the iPhone 18 Pro
simulator at native resolution.
