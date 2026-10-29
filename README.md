# Dayli Step Tracker

Dayli Step Tracker is a bilingual iOS and Android walking companion built with Expo, React Native, and TypeScript. The MVP is designed for phone use and keeps app data on the device.

## Project scope

This repository contains the mobile app at its root. Backend services are explicitly out of scope for the MVP: there is no backend application, server API, authentication service, cloud sync, or remote database. Step data will be read from Apple HealthKit and Android Health Connect; the app will not write health data.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm install
npm start
```

Use the Expo CLI prompts to open the app on a simulator, emulator, or Expo Go. Run `npm run typecheck` to check TypeScript. HealthKit and Health Connect integration will require native development builds; Expo Go alone cannot verify those integrations.

## Current status

The repository currently contains the Expo TypeScript app scaffold. Product requirements and planned implementation steps are tracked in [plan.md](./plan.md).
