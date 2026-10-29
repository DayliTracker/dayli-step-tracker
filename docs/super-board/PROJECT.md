# Dayli Step Tracker

## Purpose

Dayli Step Tracker is a bilingual iOS and Android walking companion built with Expo, React Native, and TypeScript. The MVP reads daily steps from Apple HealthKit and Android Health Connect, supports manual totals, and keeps app data on the device.

## Product boundaries

- The app is mobile-first and has Today, Progress, and Settings surfaces.
- Today shows the current step total, an 8,000-step default goal, progress, source status, and original pixel-art character artwork.
- Progress covers today and the previous six local dates, including each date's goal and step source.
- Health data access is read-only. Do not write health data or persist fetched health totals.
- Manual totals replace Health totals for the selected date and remain local until removed.
- Use device-local dates and timezone boundaries. Vietnamese is selected for Vietnamese device locales; otherwise use English, with a persistent language override.
- Health access can be requested later from Settings. Keep manual tracking usable when access is skipped, declined, or unavailable.
- Clearing app data requires confirmation and resets local preferences, goal history, manual entries, and cached summaries without revoking Health permissions.
- Disclose that local data may be lost after uninstall or device replacement.

## Architecture and constraints

- Frontend: Expo, React Native, and TypeScript at the repository root.
- The MVP has no backend, database, authentication service, cloud sync, analytics, or server API.
- HealthKit and Health Connect need native development builds; Expo Go cannot verify those integrations.
- Keep health totals read-only and local. Do not add a remote data path or store fetched totals.
- Follow `plan.md` for the agreed user flows and exclusions.

## Verification

- Run `npm run typecheck` for the current TypeScript check.
- Native health integrations require platform development builds and cannot be verified in Expo Go.
