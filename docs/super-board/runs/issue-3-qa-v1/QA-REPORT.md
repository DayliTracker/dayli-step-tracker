# Issue #3 QA v1

**Result:** Failed to complete UI verification. The local checks pass, but native
screen interaction and the required standard-viewport screenshots could not be
captured in this non-interactive environment. No product behavior is reported as
broken; all four acceptance criteria remain unchecked pending observable UI proof.

**Branch/head:** `issue-3-app-shell` / `7539991b56c48f8c0aa52a8cda96da6a3ad03760`

## Checks

| Check | Result |
|---|---|
| `npm test` | Pass, 4 tests |
| `npm run typecheck` | Pass |
| `npx expo run:ios --no-install --device 77EC52AC-8FB5-4CE2-B248-A27A071541EE` | Native build succeeded and the app installed. Expo exited 1 when its Simulator.app foreground check invoked `osascript`/System Events. |
| Metro status at `http://127.0.0.1:8081/status` | `packager-status:running` |
| Native interaction/screenshots | Not captured. GUI launch, `simctl launch`, and `simctl io screenshot` were denied because the environment had no interactive permission response. |

Test output is in `npm-test.txt` and `typecheck.txt`.

## Acceptance criteria

| AC | Result and evidence |
|---|---|
| 1. Launch into Today and navigate to Progress | [ ] Unit route-state checks pass at `tests/shell.test.mjs:9-18`; the rendered launch and tab interaction could not be observed. |
| 2. Reach Settings from both primary tabs | [ ] The route-state test covers both origins and return paths at `tests/shell.test.mjs:9-18`; the rendered controls could not be tapped. |
| 3. Present goal, language, Health access, and confirmed clear-data destinations without later-phase behavior | [ ] Source-contract checks pass at `tests/shell.test.mjs:33-41`; no rendered Settings or confirmation preview could be inspected. |
| 4. Accessible names, usable touch targets, and bilingual component interfaces | [ ] Locale and source-contract checks pass at `tests/shell.test.mjs:21-30,44-56`; no screen-reader or runtime hit-target check was possible. |

## Test-gap check

| AC | Unit/source contract | Component | E2E/native |
|---|---|---|---|
| 1 | `tests/shell.test.mjs:9-18` checks the navigation state | None | None |
| 2 | `tests/shell.test.mjs:12-18` checks Settings origin/return state | None | None |
| 3 | `tests/shell.test.mjs:33-41` checks destination declarations and preview copy | None | None |
| 4 | `tests/shell.test.mjs:21-30,44-56` checks locale completeness, labels, and declared minimum heights | None | None |

The added Settings and accessibility assertions inspect source contracts, not a
rendered React Native tree. A dropped or miswired `onPress` callback, a VoiceOver
announcement issue, or a layout regression can still survive these tests. No
component-test renderer or web test runtime is installed; adding product code or
changing the app architecture to work around that would exceed this Tester pass.
The immediate high gap is runtime UI evidence for all four ACs.

## Screenshot and simulator blocker

The app is an iOS-only native shell (`ios.supportsTablet` is false) and the project
has no Expo web test dependencies. This environment denied opening Simulator.app
and denied app-launch/screenshot commands without an interactive approval. Thus
none of the requested **desktop 1920×1080**, **tablet 1024×768**, or
**mobile 375×667** viewports was truthfully captured. No screenshots were
fabricated or substituted with resized images. The native build and installation
are evidence of compilation only, not UI interaction.

**Expected to complete QA:** launch the installed app in an interactive iOS
Simulator, exercise Today → Progress and Settings from both origins, inspect all
four Settings rows and the clear-data confirmation, check accessible names and
touch targets, then commit truthful standard-viewport screenshots before
re-reporting.

**Root-cause hash:** `09c1b16bb2c`
