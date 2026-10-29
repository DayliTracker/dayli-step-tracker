# Phase 2: Local product rules and persistence

## Purpose

Implement the product's local domain rules: goal history, manual daily totals,
language preferences, settings, and clear-data behavior. Health data remains
read-only and is not persisted as a fetched total.

## Dependencies

- The project scaffold described as complete in Todo 2 of [`../plan.md`](../plan.md).
- This phase can proceed in parallel with Phase 1.
- Phase 3 depends on this phase's manual-total and local-date rules, matching
  the source plan's Todo 5 dependency on Todos 2 and 4.

## Plan

1. Define and test the local-date boundary used to identify a day, based on the
   device timezone.
2. Define the local records and transitions needed for:
   - Current and historical daily goals.
   - At most one editable manual total for each date in the seven-date window.
   - The user's language override and other local preferences.
   - Any permitted cached summaries, distinct from persisted Health totals.
3. Specify validation, persistence, migration, reset, and error behavior before
   wiring the settings and Progress controls.
4. Preserve data-loss disclosure: local data may be lost on uninstall or
   device replacement.

## Design

1. Model **goal history** as the goal that applies to each date. A goal change
   affects today; it must not rewrite a past date's goal.
2. Model a **manual total** as one editable daily total, not a Health-data
   addition. For its date, it replaces the displayed Health total; it persists
   through Health refreshes until the user removes it.
3. Keep source identity explicit: a daily total is labeled as manual or Health
   based on the applicable source. Do not blend or sum those two sources.
4. Define validation for a custom goal as a whole number from 1 through
   100,000, inclusive. Define the default as 8,000.
5. Define language selection as Vietnamese when the device locale is
   Vietnamese and English otherwise, unless the user has a saved override.
   Changing the override must persist across app restarts.
6. Design Settings to expose goal, language, health access, and clear-data
   controls. Clearing data requires confirmation and explains its consequences.
7. Define clear-data precisely: remove local preferences, goal history, manual
   entries, and cached summaries; restore the default goal and device-derived
   language; do not revoke operating-system Health permissions.
8. Keep "no Health data found", skipped or declined access, and unavailable
   Health Connect as distinct states. A zero or absent total must not be used to
   infer a permission decision.

## Implement

1. Implement typed local models and persistence using the repository's
   established storage patterns; do not add a remote data store.
2. Implement goal updates and per-date goal history, including validation and
   an explicit error or recovery path for invalid values and persistence
   failures.
3. Implement creation, editing, removal, and seven-date-window enforcement for
   manual totals. Ensure a manual total remains the selected source after a
   Health refresh and removal restores the Health source when available.
4. Add English and Vietnamese strings for all product surfaces and validation
   messages. Resolve the initial language from the device locale, then apply a
   persisted user override.
5. Implement Settings controls and confirmed clear-data. Ensure the confirmation
   describes what is removed, what resets, and that Health permissions remain
   unchanged.
6. Show the uninstall/device-replacement data-loss disclosure in an appropriate
   user-facing location.
7. Keep fetched Health totals out of persistent storage. If cached summaries
   are needed, document their content and lifecycle so clearing them cannot be
   confused with persisting Health totals.

## Test

1. Test goal validation at 1, 100,000, 0, 100,001, fractional values, blank
   input, and malformed input. Invalid input must not silently change the goal.
2. Change today's goal and verify today's value changes while a prior date's
   goal remains unchanged.
3. For each of the seven local dates, create, edit, and remove a manual total.
   Verify there is never more than one active manual total per date.
4. Verify manual totals replace rather than add to Health totals and survive
   Health refreshes until removed. Verify removal reveals the available Health
   total or the correct neutral no-data state.
5. Test dates at local midnight and around timezone and daylight-saving
   transitions on supported platforms. Confirm the seven-date window follows
   device-local dates rather than UTC date labels.
6. Test initial locale selection for Vietnamese and non-Vietnamese device
   locales, persisted language overrides, and app restart behavior.
7. Test clear-data confirmation, cancellation, successful reset, and next
   launch. Verify local preferences, goal history, manual entries, and cached
   summaries are removed; the default goal and device language return; Health
   permissions are not revoked.
8. Verify visible and accessible source labels distinguish manual totals from
   Health totals. Verify missing Health data is not presented as a permission
   denial.
9. Exercise persistence read/write failures and surface them using the app's
   established error handling rather than a success-shaped fallback.

## Deploy

1. Run the repository's checks and install a development build on iOS and
   Android to validate local persistence and locale behavior on-device.
2. Confirm that no backend, cloud-sync service, analytics service, or new
   permission is required for these local features.
3. Record any data-format or migration requirement discovered during
   implementation for Phase 4's release checklist.
4. Do not publish a store release as part of this phase.

## Exit criteria

- Goal bounds, default, and historical-goal behavior match the source plan.
- Manual totals are one per date within the seven-date window, replace Health
  totals, survive refresh, and can be removed.
- Language fallback and persisted override work for English and Vietnamese.
- Confirmed clear-data resets exactly the specified local data and does not
  revoke Health permissions.
- Local-data, source-label, timezone, and persistence-failure tests pass with
  evidence recorded.

## Risks and verification notes

- Device-local date handling can fail at timezone changes or daylight-saving
  boundaries; test date identity separately from display formatting.
- A cached summary must never become a persisted fetched Health total. Inspect
  the storage boundary and test across app restarts.
- Clearing app-owned data and revoking a system permission are separate
  operations. The clear-data action must not silently perform the latter.

