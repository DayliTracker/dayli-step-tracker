# Phase 3: Native health integration

## Purpose

Integrate read-only step data from Apple HealthKit on iPhone while keeping
manual tracking usable when access is skipped, declined, or unavailable.
Android and Health Connect are deferred and are not part of the current MVP.

## Dependencies

- The project scaffold described as complete in Todo 2 of [`../plan.md`](../plan.md).
- Phase 2's local-date, source-selection, and manual-total rules. A manual total
  must continue to override a fetched Health total for its date.
- This phase can proceed alongside Phase 1 after Phase 2; it must not be
  presented as complete until its health-specific behavior is validated in
  native builds.

## Plan

1. Confirm supported operating-system versions, Expo/native integration
   requirements, identifiers, entitlements, permission declarations, and
   setup instructions from current project configuration and official Apple
   and Expo documentation. Establish the minimum supported iOS version from
   verified requirements rather than guessing.
2. Choose the smallest read-only permission scope needed to read daily steps.
   Do not add write access to health stores.
3. Enumerate permission and data states independently: not yet requested,
   granted, skipped or declined, no matching data, refresh in progress, and
   refresh failure.
4. Define the refresh contract: app open/foreground and user-initiated
   pull-to-refresh; no background refresh; show the last refresh time.
5. Keep manual tracking available even when platform health access is not
   available.

## Design

1. On first launch, explain why step access is useful before requesting the
   platform permission.
2. Make skip and decline valid paths. Do not repeatedly prompt or nag after
   either path; provide a route in Settings for a later access request.
3. Keep these user-visible states distinct:
   - Access not requested or skipped/declined.
   - Access granted but no step data found for the date.
   - Refreshing and refresh failed.
4. Use neutral language for no data. Do not imply that missing data proves the
   user denied access.
5. Show which source produced the displayed daily total. A Phase 2 manual total
   continues to take precedence over a Health total for that date.
6. Display last refresh time with an unambiguous local date/time presentation.
   Do not imply that a background refresh occurred.
7. Keep the permission explanation, Settings instructions, and errors
   available in both supported app languages.

## Implement

1. Configure the iOS project for the minimum read permission required by
   HealthKit, following current platform requirements. Do not request write
   permissions.
2. Implement the HealthKit adapter behind a typed boundary so availability,
   permission, query, and error states remain explicit.
3. Implement first-launch explanation and permission request, skip/decline
   handling, and a user-initiated later request from Settings without automatic
   repeat prompts.
4. Read daily step totals for device-local dates and map responses to explicit
   source and availability states.
5. Refresh when the app opens or returns to the foreground and on
   pull-to-refresh. Track and display the last successful refresh time.
6. Do not schedule background refresh and do not persist fetched Health totals.
   Keep any permitted transient or summary cache separate from persistent
   Health data and honor Phase 2's clear-data behavior.
7. Preserve Phase 2's source precedence: for a date with a manual total, show
   the manual total instead of adding it to the Health total.
8. Surface unexpected native errors explicitly; do not convert them into a
   zero-step success state.

## Test

1. Use an iOS development build. Expo Go cannot verify native HealthKit
   integration. Use the iOS Simulator for development checks, but do not claim
   live HealthKit acceptance from simulator or mocked results.
2. On a physical iPhone, verify the first-launch explanation and every
   permission result: grant, skip or decline, later enablement from Settings,
   and permission unavailable.
3. Verify daily query date ranges across local midnight and a timezone change;
   confirm data is attributed to the intended device-local date.
4. Verify no data is shown with neutral wording and is distinguishable from
   skipped/declined permission.
5. Verify refresh on app open/foreground and pull-to-refresh, last refresh
   timestamp behavior, refresh failure handling, and absence of background
   refresh.
6. Verify a manual total stays selected through Health refresh and is not
   summed with the fetched Health total; remove it and verify the source
   falls back correctly.
7. Inspect persisted storage and restart the app to verify fetched Health
   totals were not persisted. Verify clear-data does not revoke system
   permissions.
8. Test localized permission explanations, no-data states, and
   errors in English and Vietnamese.

## Deploy

1. Create and install an iOS development build with the required configuration.
   Verify permission declarations and HealthKit entitlements on a physical
   iPhone before treating HealthKit acceptance or release readiness as passed.
2. Document build prerequisites and the exact native-build workflow needed by
   contributors; do not describe Expo Go as a supported verification path for
   health features.
3. Before any release build, verify privacy disclosures and store metadata
   accurately describe read-only health access, local data handling, and
   platform permission behavior.
4. Treat signing and store-submission checks as readiness tasks only. Do not
   submit or publish a build as part of this phase.

## Exit criteria

- Health integrations request read-only access and provide the specified
  explanation, skip/decline, Settings, refresh, and last-refresh behavior.
- No-data, denied/skipped, unavailable, and error states are distinct and
  truthful.
- Manual totals retain precedence and fetched Health totals are not persisted.
- HealthKit behavior has passing evidence from a physical iPhone; simulator
  and Expo Go results are not used to claim live health integration coverage.
- The minimum supported iOS version is documented after being verified against
  the selected native integration and development toolchain.

## Risks and verification notes

- Native permissions and HealthKit data availability depend on iOS
  configuration and device state; validate on a physical iPhone.
- Permission status and data availability are separate facts. Keep their UI
  states and tests separate.
- Any discrepancy between a platform's current requirements and this plan must
  be resolved against official platform documentation and recorded before
  changing permission scope.
