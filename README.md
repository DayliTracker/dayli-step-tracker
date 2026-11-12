# Dayli Step Tracker

Dayli Step Tracker is a bilingual iPhone walking companion built with Expo, React Native, and TypeScript. The current MVP supports iOS only and keeps app data on the device. Android is deferred without a commitment or timeline.

## Project scope

This repository contains the iOS app at its root. Backend services are explicitly out of scope for the MVP: there is no backend application, server API, authentication service, cloud sync, or remote database. Step data is read from Apple HealthKit; the app never writes health data and has no analytics or telemetry dependencies.

## Current status

Phases 1–3 are built and merged: Today/Progress/Settings navigation with the animated mascot, local persistence with bilingual (English/Vietnamese) copy and a language override, goal editing with per-date goal history, manual totals, confirmed clear-data, and read-only HealthKit step access with truthful permission and no-data states.

- Requirements and planned work: [plan.md](./plan.md)
- Executed acceptance matrix and evidence: [docs/verification-matrix.md](./docs/verification-matrix.md)
- Release-readiness status (not ready — gated on physical-iPhone verification): [docs/release-readiness.md](./docs/release-readiness.md)

## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
npm test
npm run typecheck
```

All three commands are part of the board's verification routine and were last run clean at `3a5948c` (typecheck exit 0; suite 158/158).

To open the JavaScript-development experience:

```sh
npm start
```

## Native development build (required for HealthKit)

HealthKit is native: Expo Go cannot run it, and simulator results cannot establish live HealthKit coverage. The `ios/` folder is generated (CNG) and never committed.

```sh
npx expo prebuild --platform ios
npx pod-install
npx expo run:ios            # simulator
npx expo run:ios --device   # physical iPhone
```

The full workflow, the verified minimum iOS version (16.4), and the native configuration live in [docs/healthkit-native-setup.md](./docs/healthkit-native-setup.md).

## Health permissions and your data

- Dayli asks for read-only access to your step count on first launch, after a short explanation. It never writes health data.
- If you skip or decline, Dayli does not nag — the app stays fully usable with manual entries, and you can request access later from Settings.
- Dayli reads steps when you open the app, return to it, or pull to refresh. It does not read steps in the background.
- Fetched Health totals are shown, never saved: only your goals, manual entries, preferences, and permission decisions are stored, and always on your device.

## Where your data lives

All app data is local to the device. There is no account, no backend, and no cloud sync or backup. Uninstalling the app or replacing your device removes your goals, manual entries, and settings; there is no export or recovery. Clear app data (in Settings, with confirmation) resets the locally stored goals, entries, and preferences to defaults, and does not revoke Health permissions — change those in the iOS Settings or Health app.

## Verification

The acceptance matrix maps every plan requirement to its check, target, result, and evidence: [docs/verification-matrix.md](./docs/verification-matrix.md). Live HealthKit acceptance is verified on a physical iPhone, not in a simulator or Expo Go; the recorded physical-device gate is the current release-readiness blocker.
