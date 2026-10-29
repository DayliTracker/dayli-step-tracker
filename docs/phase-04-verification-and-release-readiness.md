# Phase 4: Verification and release readiness

## Purpose

Verify the integrated product against its acceptance rules, resolve
cross-phase inconsistencies, and prepare clear development and release
documentation. This phase is verification and readiness work, not an
authorization to publish the app.

## Dependencies

- Phase 1: navigation, UI/UX, and screen shell.
- Phase 2: local product rules and persistence.
- Phase 3: native health integration.
- This reflects plan Todo 6's dependency on Todos 3–5.

## Plan

1. Build an acceptance matrix from [`../plan.md`](../plan.md) and the phase exit
   criteria. Map each requirement to a test, iOS target, result, and evidence.
2. Identify supported OS/device configurations from project configuration
   rather than assuming a support range.
3. Run a clean installation and upgrade/relaunch workflow, including
   permission, local-data persistence, and clear-data checks.
4. Review the complete user journey in English and Vietnamese on iPhone,
   including offline use and unavailable HealthKit data.
5. Prepare contributor and release-readiness documentation covering native
   builds, permissions, local-data limits, and verification.

## Design

1. Define a verification matrix with these dimensions:
   - iPhone and iOS Simulator.
   - English and Vietnamese.
   - Permission granted, skipped/declined, unavailable, and no data.
   - Health totals and manual-total override.
   - Initial install, app restart, foreground refresh, pull-to-refresh, and
     confirmed clear-data.
2. Set evidence requirements for each check: test output for automated checks;
   device/build details and reproducible steps for platform checks; screenshots
   only for visual evidence.
3. Define release gates that block readiness on unresolved correctness,
   accessibility, privacy, localization, or native-configuration failures.
4. Ensure release descriptions make no unsupported claims about background
   refresh, cloud backup, data recovery, or health-data storage.

## Implement

1. Add or complete automated unit, component, and integration tests at the
   repository's established test layers. Prefer deterministic tests for domain
   rules and native-adapter boundary states.
2. Complete end-to-end checks for:
   - Today totals, goal display, source label, and progress ring.
   - Seven local dates, historical goals, and manual entry lifecycle.
   - Language selection and Settings access from both primary tabs.
   - Health explanation, permission outcomes, refresh, and no-data.
   - Clear-data confirmation, exact reset behavior, and permission retention.
3. Fix only issues needed to meet the source plan and phase exit criteria;
   record any scope change for explicit product review.
4. Write contributor instructions for native development builds and
   platform-specific health setup, including the limits of Expo Go.
5. Write user-facing privacy/data-limit disclosures: data is on-device, no
   backend or cloud sync is included, uninstall/device replacement may lose
   app-local data, and clear-data does not revoke Health permissions.
6. Document supported build, test, and release-readiness commands using
   commands verified in the repository. Do not invent commands or claim tests
   that were not run.

## Test

1. Run the repository's targeted checks and full required test suite; record
   command, environment, result, and any known limitation.
2. Execute Phase 1 accessibility/layout checks in an iOS Simulator development
   build. Execute all live HealthKit acceptance checks in a native build on a
   physical iPhone; Expo Go, simulator, and mocked results are insufficient for
   live HealthKit acceptance.
3. Verify critical invariants across phase boundaries:
   - A goal change never rewrites past goals.
   - Manual totals replace and survive refresh over Health totals.
   - Fetched Health totals are not persisted.
   - Clear-data removes specified app-owned data but does not revoke system
     permissions.
   - Missing Health data does not imply denied access.
4. Run accessibility and localization review on real screens, including
   large text, screen-reader labels, and long translated strings.
5. Check release builds for correct identifiers, permission declarations,
   signing, privacy disclosures, and absence of excluded backend/cloud
   integrations.
6. Re-run failed checks after fixes and retain the final evidence, not only the
   initial failure report.

## Deploy

1. Produce release-candidate builds only after all blocking iOS acceptance
   gates pass, including physical-iPhone HealthKit verification. Verify the
   signed artifact installs and opens on the supported iPhone target.
2. Complete applicable App Store metadata, privacy, permission, and submission
   checklists as readiness work; confirm all health disclosures match actual
   behavior.
3. Record the artifact version, build configuration, test evidence, known
   limitations, and rollback/contact procedure for a future release operator.
4. Stop before store submission, rollout, or publication. Those actions
   require a separate explicit release decision and authorized credentials.
5. Do not deploy a backend or cloud service; none is in the approved product
   scope.

## Exit criteria

- Every in-scope source-plan requirement maps to a passing check or a clearly
  recorded, explicitly accepted limitation.
- Cross-phase invariants pass on the supported iPhone/iOS target.
- Physical-iPhone HealthKit evidence is recorded before release readiness is
  considered complete.
- Localization, accessibility, privacy, and local-data disclosures are
  reviewed.
- Development/build/test instructions are verified and reproducible.
- Release-readiness artifacts exist, but no store submission or publication is
  implied or performed.

## Risks and verification notes

- Automated tests alone cannot establish that native HealthKit permissions and
  data access work on iPhone. Require physical-iPhone evidence.
- Avoid claiming success from a build-only check when the acceptance criteria
  require interaction or data verification.
- Any unresolved platform, privacy, or release-policy question is a blocker to
  release readiness; document it instead of guessing.
