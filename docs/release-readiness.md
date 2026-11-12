# Release readiness — phase-04

Status: **NOT READY** — gated on the physical-iPhone HealthKit checks in
`docs/verification-matrix.md` and on release-build inspection. Recorded
2026-11-12 at head `3a5948c` for issue #21. This document prepares readiness
artifacts only; it performs and authorizes no store submission, rollout, or
publication (phase-04 spec, Deploy 4).

## What is done

- Executed acceptance matrix with per-requirement evidence:
  `docs/verification-matrix.md` (typecheck clean, suite 158/158).
- Contributor docs: `docs/healthkit-native-setup.md` (dev build workflow,
  verified minimum iOS 16.4, native config) and the README (setup, health
  permissions, local-data limitations).
- Simulator-class visual evidence on the development build:
  `docs/super-board/runs/issue-21-build/`.

## What blocks readiness

| Blocker | Unblocked when |
|---|---|
| Physical-iPhone HealthKit evidence | Every row in the matrix's "Physical-iPhone HealthKit gate" records PASS with device model, iOS version, and evidence |
| Release-build inspection | A signed release build is checked for bundle id, entitlements, permission strings, privacy disclosures, and absence of backend/cloud integration (spec Test 5) |
| On-device accessibility/localization review | VoiceOver and Dynamic Type review on hardware for EN + VI (spec Test 4) |
| Release operator record | The artifact version, build configuration, test evidence, known limitations, and rollback/contact procedure below are filled in by the operator |

## App Store metadata drafts (no unsupported claims)

Permission purpose string — already shipped in `app.json`
(`NSHealthShareUsageDescription`): "Dayli reads your daily step count from
Apple Health to show your progress. Read-only — Dayli never writes health
data." Release builds must keep this string unchanged unless behavior
changes.

Draft description:

> Dayli is a walking companion with a duck that reacts to your day. Today
> shows your step count, your goal, and a progress ring. Progress keeps the
> last seven days with each day's goal and manual corrections.
>
> - Read-only access to Apple Health step counts, requested after a short
>   explanation
> - A custom daily goal from 1 to 100,000 steps, with past days keeping
>   their own goals
> - English and Vietnamese, with an override in Settings
> - Your entries and settings live on your device; uninstalling the app
>   removes them
>
> Dayli reads steps when you open the app, return to it, or pull to refresh.
> It does not read steps in the background. Dayli never writes health data,
> has no accounts, and sends nothing to a server.

Compliance check against issue #21 AC 6:

| Unsupported claim | Status in the drafts |
|---|---|
| Background refresh | Stated as absent, explicitly: "does not read steps in the background" — matches the shipped behavior (refresh on open/foreground/pull-to-refresh only) |
| Cloud backup / sync | Stated as absent: "has no accounts, and sends nothing to a server"; on-device storage stated |
| Data recovery | No recovery promise anywhere; loss on uninstall stated plainly |
| Health-data storage | Stated as absent: "never writes health data"; fetched totals are never persisted (unit-verified: "fetched Health totals are never written to storage") |

App Privacy questionnaire (draft, for the operator to file): "Data Not
Collected" — the app has no analytics, no advertising, no network endpoints
(repo scan at `3a5948c`: zero tracked files matching
`server|backend|firebase|analytics|.sql`; `package.json` carries no
telemetry dependency), and no data leaves the device.

## Known limitations (accepted, recorded)

- Live HealthKit acceptance is unverified until the physical-iPhone gate
  passes; simulator and Expo Go evidence is deliberately not claimed for it.
- App-local data (goals, manual entries, preferences, cached summaries) is
  stored on the device and may be lost on uninstall or device replacement;
  there is no export, backup, or recovery.
- Clear app data resets the four local documents and does not revoke Health
  permissions; users change those in iOS Settings or the Health app.
- Android is deferred without a timeline; iPad is unsupported
  (`app.json` `supportsTablet: false`).
- Minimum supported iOS is 16.4 (verified record in
  `docs/healthkit-native-setup.md`).

## For the future release operator

To be filled when readiness unblocks; recorded here as the template the
phase-04 spec (Deploy 3) requires:

- Artifact version and build number: ______
- Build configuration and signing identity: ______
- Test evidence at release: link the verification matrix and the physical-
  device evidence directory committed on the release branch: ______
- Known limitations at release: copy the section above and update anything
  the device pass changed: ______
- Rollback: remove the build from distribution via App Store Connect
  (no server component exists to roll back); users keep device-local data
  ______
- Contact: ______

## Stop line

No submission, rollout, review, or publication happens from this card. The
separate, explicit release decision and authorized credentials belong to a
human (phase-04 spec, Deploy 4; issue #21 "does not authorize a store
release or submission").
