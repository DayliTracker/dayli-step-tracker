# Dayli Step Tracker — Project Plan

## Goal

Build Dayli Step Tracker, a bilingual iPhone app for people who enjoy walking and cute character art. The MVP uses React Native with Expo and TypeScript, local-only app storage, and read-only access to Apple HealthKit.

## Agreed product scope

- Two primary tabs: Today and Progress. Settings is reachable from a gear on both tab headers.
- The current MVP supports iPhone on iOS only. iPad and Android are out of scope; Android is deferred without a commitment or timeline.
- Today displays the current step total, an 8,000-step default goal, a circular progress ring, Health/manual source status, and an original pixel-art character that reacts when the goal is reached.
- Progress displays today plus the previous six local dates, with daily totals, each date's active goal, source labels, and manual-entry controls.
- The ring fills clockwise and remains full at goal completion; show the exact step count and an uncapped ratio such as `1.5× goal`.
- Users can set a custom positive whole-number goal from 1 to 100,000. Goal changes apply immediately to the current date; previous dates retain their historical goals.
- Read steps from Apple HealthKit without writing data. Request access on first launch after a short explanation; if skipped or declined, do not automatically nag and allow a later request from Settings.
- Refresh health data when the app opens/returns to foreground and via pull-to-refresh; show the last refresh time. Do not add background refresh or persist Health totals in the app.
- If no Health steps are found, use neutral wording, offer Settings access guidance, and keep manual entry available without claiming permission was denied.
- Allow one editable manual total for today or the previous six local dates. A manual total replaces (never adds to) the Health total for that date, persists over Health refreshes until removed, and is labeled Manual; Health-sourced totals are labeled Health.
- Use the device's current timezone for local dates and day boundaries.
- Follow Vietnamese device locale when detected, otherwise English; allow a persistent Vietnamese/English override in Settings.
- Settings includes goal editing, language, health access, and a confirmed Clear app data action. Clearing resets local preferences, goal history, manual entries, and cached summaries; restore the 8,000 goal and device-default language; do not revoke Health permissions.
- Disclose that data is device-local and may be lost on uninstall or device replacement.
- Visual direction: use the reference site's cream `#FAF3E6`, mint `#C8EBDD`, warm brown `#5B4634`, pastel accents, Nunito/Lexend typography, and rounded-card tokens as inspiration. Create original layouts and original pixel-art character artwork; do not copy the reference's assets or exact screens.
- No backend, database schema, server API routes, authentication, cloud sync, export, analytics, mock endpoints, complex onboarding, streaks, reminders, badges/rewards, or individual walk/run logs in this MVP.

## Todos

1. Completed: create a GitHub organization at `https://github.com/DayliTracker` and a public repository named `dayli-step-tracker` under it.
2. Completed: scaffold the Expo React Native TypeScript frontend in the repository root and document that backend services are out of scope for this MVP.
3. Implement navigation, Today and Progress screens, Settings access, design tokens, and original pixel-art character presentation.
4. Implement local persistence, bilingual strings, goal history, manual daily totals/overrides, source labeling, and clear-data behavior.
5. Integrate read-only HealthKit step access, permission guidance, refresh behavior, truthful no-data states, and a verified minimum supported iOS version.
6. Validate the main user flows and iOS configuration; document development-build setup, health permissions, local-data limitations, and verification.

## Dependencies and considerations

- Todo 2 depends on Todo 1. Todos 3 and 4 depend on Todo 2. Todo 5 depends on Todos 2 and 4. Todo 6 depends on Todos 3, 4, and 5.
- HealthKit requires native iOS configuration and development/production builds; Expo Go is not sufficient for verifying native health integration. Simulator checks can cover UI and layout, but live HealthKit acceptance and release readiness require verification on a physical iPhone.
- Determine and document the minimum supported iOS version in the native-integration phase from verified Expo and HealthKit requirements; do not assume a deployment target.
- The requested GitHub organization handle resolved to `DayliTracker`; the user confirmed proceeding with that organization. The public repository is empty and ready for scaffolding.
- Organization and repository were created through GitHub's authenticated UI; no account credentials or authentication codes were shared in chat.
- Preserve the local-only boundary: platform health data remains read-only and is not copied into app storage.
