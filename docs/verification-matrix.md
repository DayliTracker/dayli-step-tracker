# Verification matrix — phase-04 (executed)

Executed 2026-11-12 against head `3a5948c` (origin/main) for issue #21.
Scope: every requirement in `plan.md` "Agreed product scope" plus the
`docs/phase-04-verification-and-release-readiness.md` exit criteria. This
matrix is the executed record; the phase-04 spec remains the definition.

## Method and environment

- Automated checks: `npm ci --silent && npm run typecheck` (the board
  config's verify command) and `npm test` (full required suite). Node
  v22.23.4, macOS arm64, Xcode 27.2 (27B52). Result: typecheck clean;
  suite **158/158 pass, 0 fail, 0 skipped**. Full TAP output:
  `docs/super-board/runs/issue-21-build/test-suite-2026-11-12.log`.
- Simulator class: iPhone 18 Pro (iOS 27.0) development build via
  `npx expo prebuild --platform ios` + `npx expo run:ios`; screenshots in
  `docs/super-board/runs/issue-21-build/`.
- Physical iPhone: **none attached to this run** (`xcrun devicectl list
  devices` reports only simulated devices). Live HealthKit acceptance rows
  stay PENDING — the phase-04 spec (Test 2) rules that simulator, Expo Go,
  and mocked results are insufficient for live HealthKit acceptance.
- Test citations below are exact test names from the TAP log.

Result legend: **UNIT** deterministic test ran and passed here · **SIM**
simulator-class evidence (UI/layout only, never live HealthKit) · **DOC**
recorded document, verified as written · **PENDING** requires a physical
iPhone — recorded as the release gate, not a claim · **LIMITATION** accepted
and recorded with its reason.

## Matrix — plan.md scope to check, target, result, evidence

| # | Requirement (plan.md) | Check | Target | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Two primary tabs (Today, Progress); Settings from a gear on both headers | "home is the only root: settings opens from home and returns through settings"; "the tab bar and its navigation action are gone everywhere"; "home opens Settings through the duck-led swipe; the transition never traps navigation" | UNIT | PASS | suite log |
| 2 | iPhone/iOS only; Android deferred, no timeline | `app.json` `platforms: ["ios"]`, `ios.supportsTablet: false`; README scope section | DOC | PASS | `app.json`; README "Project scope" |
| 3 | Today shows step total, 8,000 default goal, ring, source status, character reaction | "the App renders Today and Progress through the single truthful-state rule"; "Today wires the textless hero: pet, count, footprints mark, and the a11y source group"; "QA: ring fill and goal-reached follow a custom goal, not the 8,000 default"; "PixelPet mood machine: walk plays on a rise, celebrate at the goal, both exit when progress falls" | UNIT | PASS | suite log; `src/today.ts` `DEFAULT_GOAL = 8000` |
| 4 | Progress: today + previous six local dates, totals, each date's active goal, source labels, manual controls | "Progress window is today plus the previous six device-local dates, newest first"; "the read window covers today and the previous six device-local dates"; "the seven-date window is exactly the dates Progress shows"; "Progress (en): seven date rows, each with a sibling manual-entry button" | UNIT | PASS | suite log |
| 5 | Ring fills clockwise, stays full at completion, exact count, uncapped ratio text | "segment angles step clockwise from 12 oclock"; "ring fills toward the goal and visually caps there without passing it"; "loaded summary exposes exact count, goal, uncapped ratio, and source to assistive tech"; "ratio text keeps the uncapped value with per-locale separators"; "QA: exactly-at-goal ratio renders the integer 1× path in both locales" | UNIT | PASS | suite log; `src/today.ts` `progressRatio`/`litSegments` |
| 6 | Custom goal 1–100,000 positive whole; applies to current date; past dates keep historical goals | "goal bounds: 1 and 100,000 are valid; 0 and 100,001 are not"; "recording a goal for today writes today only — a past date is never rewritten"; "the goal that applies to a date: its own change, else carried forward, else the default"; "a saved goal survives a restart (save, then read back)"; "QA: carry-forward reads the latest earlier change, never an older or a later one" | UNIT | PASS | suite log; `src/goals.ts` |
| 7 | HealthKit read-only; first-launch explain before request; no nag after skip/decline; later request from Settings | "the native module is read-only HealthKit over the local Expo module"; "the four permission states are distinct and typed"; "the explanation sheet explains before any request and never nags"; "the first-launch explanation opens only on a confirmed fresh record"; "the first-launch explanation does not delay navigation or fire from other screens"; "Settings offers the later request and the system route for the connected state" | UNIT | PASS (code) | suite log; `modules/dayli-health-kit/`; `docs/healthkit-native-setup.md` |
| 8 | Refresh on open/foreground/pull-to-refresh; last refresh time; no background refresh; Health totals never persisted | "refresh runs on app open, foreground, and pull to refresh — never in the background"; "fetched Health totals are never written to storage" | UNIT | PASS (code) | suite log |
| 9 | No Health steps: neutral wording, Settings guidance, manual entry stays, never claims "denied" | "loading, empty, unavailable, and error presentations are distinct and never imply denied permission"; "the no-data, refreshing, and refresh-failed copy exists, is neutral, and is distinct"; "every transient and failure state renders truthfully, never as zero steps"; "native requests fail loud, not as a zero-step success" | UNIT | PASS (code) | suite log |
| 10 | One editable manual total per date (today + six back); replaces, never adds; persists over refresh; labeled Manual vs Health | "a manual total keeps precedence through Health refreshes and is never summed"; "a manual total can be created, edited, and removed on each of the seven dates"; "writing a date that already has a total replaces it — never more than one per date, never summed"; "manual total bounds: 0 and 100,000 are valid; 100,001 and fractions are not"; "a saved manual total survives a restart (save, then read back)"; "removing one date leaves the other dates untouched" | UNIT | PASS | suite log; `src/manual-totals.ts` |
| 11 | Device timezone for local dates and day boundaries | "localDateKey pads month and day and never day-shifts like toISOString"; "samples map to the correct device-local dates and fragment sums stay whole" | UNIT | PASS | suite log |
| 12 | Follow Vietnamese device locale else English; persistent override in Settings | "device locale: Vietnamese preferred locale → vi, otherwise en"; "initial locale: the saved override wins, otherwise the device decides"; "a saved override survives a restart (save, then read back)"; "clearing the override stores null, so the next launch is device-derived"; "Vietnamese strings render across screens (vi is the longer locale)"; "shell labels are translated and complete in both supported locales" | UNIT | PASS | suite log; `src/localization.ts`, `src/preferences.ts` |
| 13 | Settings: goal editing, language, health access, confirmed clear-data; reset restores 8,000 goal + device language; never revokes Health permissions | "Settings lists all destinations and clear-data is a confirmed destructive action"; "confirmed clear-data removes exactly the local documents and nothing else"; "clear-data resets fetched totals and never touches the system grants"; "clear-data removes the decision record and nothing else"; "after clear-data the next launch reads the 8,000 default goal and device-derived language"; "LOCAL_DATA_KEYS is exactly the four stored documents" | UNIT | PASS | suite log; `src/clear-data.ts` |
| 14 | Disclose device-local data; loss on uninstall/device replacement | README "Health permissions and your data" + "Where your data lives" sections; release-readiness disclosures | DOC | PASS | this PR's README |
| 15 | Visual direction: cream/mint/brown palette, Nunito/Lexend, rounded-card tokens | "tokens pin the approved palette values exactly"; "tokens pin the approved radius, spacing, and type scales exactly"; "every rendered text pair meets its WCAG 2.1 AA contrast minimum"; "lit ring segment meets the 3:1 non-text minimum on the card"; "the App style sheet keeps no literal hex colors, radii, or font families" | UNIT | PASS | suite log; `src/tokens.ts` |
| 16 | No backend, server API, auth, cloud sync, export, analytics, streaks, walk logs | Repo scan: 0 tracked files match `server|backend|firebase|analytics|.sql`; `package.json` has no analytics/telemetry dependency; plan out-of-scope list enforced by review | DOC | PASS | scan run 2026-11-12 at `3a5948c` |

## Accessibility and localization review

| Requirement | Check | Target | Result | Evidence |
|---|---|---|---|---|
| Screen-reader labels complete and truthful | "a11y label never doubles a period in any snapshot kind or locale"; "row a11y label mirrors the three slots and never announces an absent total as a value"; "each date row is its own labeled control carrying the full sentence"; "QA: the Today screen-reader goal line announces the custom goal in both locales"; "QA: Vietnamese goal-reached assistive label names the cheer and the source"; "interactive controls have accessible names and at least 48-point touch targets" | UNIT | PASS | suite log |
| Large text and narrow layout | "largest text size (AX5) keeps buttons and geometry inside bounds"; "narrow device (iPhone 17e, 390pt) renders the same accessible structure"; "#44 dumps pass the geometric a11y checks (43pt floor)"; "every captured dump passes the geometric a11y checks (43pt floor)" | UNIT | PASS | suite log |
| Long Vietnamese strings on real screens | VI strings on the dev build: first-launch explain sheet + home (screenshots) | SIM | PASS (visual) | `docs/super-board/runs/issue-21-build/` |
| Full a11y/localization pass on physical device (VoiceOver, Dynamic Type on hardware) | Manual on-device review | Physical iPhone | PENDING | release gate below |

## Cross-phase invariants (phase-04 spec, Test 3)

| Invariant | Check | Result |
|---|---|---|
| A goal change never rewrites past goals | "recording a goal for today writes today only — a past date is never rewritten"; "the goal that applies to a date: its own change, else carried forward, else the default" | PASS (UNIT) |
| Manual totals replace and survive refresh over Health totals | "a manual total keeps precedence through Health refreshes and is never summed"; "writing a date that already has a total replaces it — never more than one per date, never summed" | PASS (UNIT) |
| Fetched Health totals are not persisted | "fetched Health totals are never written to storage"; "LOCAL_DATA_KEYS is exactly the four stored documents" | PASS (UNIT) |
| Clear-data removes specified app-owned data, never revokes system permissions | "confirmed clear-data removes exactly the local documents and nothing else"; "clear-data resets fetched totals and never touches the system grants"; "clear-data removes the decision record and nothing else" | PASS (UNIT) |
| Missing Health data does not imply denied access | "loading, empty, unavailable, and error presentations are distinct and never imply denied permission"; "the no-data, refreshing, and refresh-failed copy exists, is neutral, and is distinct" | PASS (UNIT) |

The invariants pass at the unit/integration layer on this host. "On the
supported iPhone/iOS target" (spec Test 3) is additionally covered by the
simulator run for the UI classes these rules render through; the physical
confirmation rides the gate below.

## Physical-iPhone HealthKit gate — PENDING (readiness blocker)

No physical iPhone was attached to this run, so no row here may be marked
PASS. Per the phase-04 spec (Test 2) and issue #21's AC 2, these checks need
a signed development build on a physical iPhone with real Health data. The
verifier records each with device model, iOS version, build, and evidence.

| Check | PASS criterion | Status |
|---|---|---|
| Install and launch signed dev build on iPhone (iOS ≥ 16.4) | App installs, opens, renders Today | PENDING |
| First-launch explain sheet before any system request | Sheet renders EN + VI, navigation not delayed | PENDING (SIM evidence exists from #19/#20; not transferable) |
| Grant path: system sheet accepted | Live step total appears for a date with Health data; source reads Health | PENDING |
| Live read correctness | Today total matches the Health app's step count for the same day | PENDING |
| Refresh paths on device | Open, foreground return, and pull-to-refresh update the read; last-refresh time updates | PENDING |
| Skip/declined path on device | Neutral no-data state; no re-nag; later request from Settings works | PENDING |
| Restart on device | Goal history and manual totals survive; Health totals still not persisted | PENDING |
| Clear-data on device | Local documents reset; Health permission stays granted in iOS Settings | PENDING |

## Release gates (phase-04 spec, Design 3)

| Gate | Status | Evidence |
|---|---|---|
| Correctness | PASS | typecheck clean; suite 158/158 at `3a5948c` |
| Native configuration | PASS (declared) / PENDING (built) | `app.json` bundle id `com.daylitracker.dayli`, HealthKit entitlement, read disclosure ("the iOS config carries a real bundle ID, the health entitlement, and the read disclosure", PASS); signed release build inspection PENDING |
| Accessibility | PASS (unit) / PENDING (on-device) | dump + contrast checks green; VoiceOver/Dynamic Type on hardware PENDING |
| Localization | PASS (unit + SIM) / PENDING (on-device) | EN/VI string coverage green; VI screenshots on dev build; hardware review PENDING |
| Privacy | PASS (declared) / PENDING (labels) | read-only entitlement, no backend (scan above), no analytics deps; App Privacy questionnaire drafted in `docs/release-readiness.md`, not submitted |

## Readiness verdict

**NOT READY.** Readiness is blocked on the physical-iPhone HealthKit gate
above and the release-build checks. This is the recorded, explicitly accepted
limitation of this run: everything automatable passed, and the remaining rows
are stated as gates with their PASS criteria, not assumed. No store
submission, rollout, or publication is implied, performed, or authorized by
this card (phase-04 spec, Deploy 4 and Exit criteria).
