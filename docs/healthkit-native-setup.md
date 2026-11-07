# HealthKit native setup (phase-03)

Contributor notes for the read-only HealthKit integration configured by
issue #19. The source of truth is `app.json` (Expo CNG: the `ios/` folder is
generated, never committed — see `.gitignore`). Expo Go cannot verify any of
this: use an iOS development build.

## Minimum supported iOS version

**iOS 16.4.**

Verified against the installed toolchain (2026-11-07, Expo SDK 58 /
`expo@~58.0.21`, React Native 0.88):

- The installed `expo-modules-core` podspec declares its iOS deployment target
  as `16.4` — the floor CocoaPods enforces for any SDK 58 build.
- `npx expo prebuild --platform ios` generates the app target with
  `IPHONEOS_DEPLOYMENT_TARGET = 16.4` (see the generated
  `ios/DayliStepTracker.xcodeproj`).
- Expo's app-config reference lets `ios.deploymentTarget` raise, not lower,
  this floor; no override is set, so 16.4 stands.
- Apple HealthKit itself requires a far older floor (iOS 8+) and is never the
  binding constraint here.

This documents the phase-03 exit criterion "the minimum supported iOS version
is documented after being verified against the selected native integration and
development toolchain". `docs/phase-03-native-health-integration.md` keeps the
open criterion; this note is the verified record.

## Native configuration (all in `app.json`)

| Key | Value | Why |
|---|---|---|
| `ios.bundleIdentifier` | `com.daylitracker.dayli` | Production-app ID; replaces the scaffold default `com.anonymous.dayli-step-tracker`. |
| `ios.entitlements` | `{"com.apple.developer.healthkit": true}` | The HealthKit entitlement, read-only scope. The entitlements dictionary carries exactly this one key. |
| `ios.infoPlist.NSHealthShareUsageDescription` | "Dayli reads your daily step count from Apple Health…" | Apple: "You must set the usage keys, or your app will crash when you request authorization." Required for reading. |

`NSHealthUpdateUsageDescription` is deliberately absent: that key is required
only for writing health data, and the app never writes.

## Native module

`modules/dayli-health-kit/` is a local Expo module (official `modules/`
directory convention — autolinked by `expo prebuild` / pod install):

- `expo-module.config.json` — iOS only, one module.
- `ios/DayliHealthKitModule.swift` — exposes exactly two functions:
  `isHealthDataAvailable()` and `requestStepReadAuthorization()`. The request
  calls `requestAuthorization(toShare: [], read: [stepCount])` — the empty
  share set is the read-only guarantee; there is no write or query API.
- `ios/DayliHealthKit.podspec` — the pod definition. It must live inside the
  `ios/` subdirectory: `expo-modules-autolinking` scans only subdirectories
  of a module for `*.podspec`, so a podspec at the module root is never
  linked.
- `index.ts` — typed accessor via `requireOptionalNativeModule`; builds
  without the module (Expo Go) resolve to `null` and the app reports
  HealthKit as unavailable.

Autolinking evidence for this layout: `pod install` resolves
`DayliHealthKit (0.0.0)` from `../modules/dayli-health-kit/ios` in the
generated `Podfile.lock`, and the pod's Xcode scheme compiles against the
prebuilt ExpoModulesCore.

## Permission model (why the app tracks its own record)

Apple never discloses the user's read choice: the request completion "doesn't
indicate whether the user actually granted permission", and
`authorizationStatus(for:)` covers saving only. The app therefore records the
user's own path (`src/healthkit.ts`, `dayli.health-decisions.v1`):
`not-requested` → explain → `granted` (request completed) or
`skipped-declined`, with `unavailable` when HealthKit is not on the device.
The system permission sheet itself appears once per install; later requests
complete silently, and users change their choice in the iOS Settings or
Health app.

## Development build workflow

```bash
npm ci
npx expo prebuild --platform ios   # regenerates ios/ from app.json (CNG)
npx pod-install                    # resolves pods incl. the local module
npx expo run:ios --device          # development build on a physical iPhone
```

Expo Go is not a verification path for HealthKit; live permission behavior
needs a physical iPhone (phase-03 spec, Test and Deploy sections).
