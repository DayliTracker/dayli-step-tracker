# Dayli Step Tracker

Dayli Step Tracker is a bilingual iPhone walking companion built with Expo, React Native, and TypeScript. The current MVP supports iOS only and keeps app data on the device. Android is deferred without a commitment or timeline.

## Project scope

This repository contains the iOS app at its root. Backend services are explicitly out of scope for the MVP: there is no backend application, server API, authentication service, cloud sync, or remote database. Step data will be read from Apple HealthKit; the app will not write health data.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm install
npm start
```

Use the Expo CLI to open the app in the iOS Simulator or an iOS development build. Run `npm run typecheck` to check TypeScript. Live HealthKit integration requires a native development build and physical-iPhone verification; Expo Go and simulator results cannot establish live HealthKit coverage.

## Current status

The repository currently contains the Expo TypeScript app scaffold. Product requirements and planned implementation steps are tracked in [plan.md](./plan.md).
