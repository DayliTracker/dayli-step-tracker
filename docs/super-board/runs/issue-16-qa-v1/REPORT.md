# QA v1 — issue #16 (✨ [feature] phase-2: local persistence, locale, language override)

Card: #16 · PR #34 · head `c9521a9` (`issue-16-local-persistence`)
Tester: super-board Tester lane, 2026-10-31 · evidence for `[qa] [report] ✅ passing · v1`

## Commands run

```
npm ci --silent                                   # exit 0
npm test                                          # exit 0 — 61/61 pass
npm run typecheck                                 # exit 0
git diff origin/main...HEAD | grep -iE '^\+' | grep -iE 'healthkit|HKHealth|HKQuantity|healthStore|requestAuthorization'  # no matches — no Health code added
xcodebuild -workspace ios/DayliStepTracker.xcworkspace -scheme DayliStepTracker \
  -configuration Release -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build build                    # exit 0 — BUILD SUCCEEDED of c9521a9
simctl install 77EC52AC… DayliStepTracker.app     # exit 0 (iPhone 17, iOS 27.0)
simctl launch 77EC52AC… com.anonymous.dayli-step-tracker
idb ui tap / idb ui describe-all                  # real taps + accessibility reads
simctl io 77EC52AC… screenshot <file>             # every rendered state below
```

Note on the build: `npx expo run:ios` could not resolve a simulator destination on this host —
Xcode's DVT layer reports `CoreSimulator is out of date. Current version (1174.9.2) is older than
build version (1174.21.0)` (Xcode was updated mid-evening; `xcodebuild -runFirstLaunch`, which
installs the matching frameworks, hangs unattended). The build was produced with the generic
`-destination 'generic/platform=iOS Simulator'`, which skips device enumeration; install, launch,
taps and screenshots all ran against the booted iPhone 17 simulator (iOS 27.0) normally. The app
under test is the Release build of this branch's head `c9521a9`.

## Per-AC results

| AC | Result | Evidence |
|---|---|---|
| AC1 initial language from device locale (vi → Vietnamese, otherwise English) | ✅ | Fresh install, no stored preferences: device `en_US` → English UI (`ac1-first-launch-en.png`); device switched to `vi-VN`, app terminated + relaunched → full Vietnamese UI (`ac1-first-launch-vi.png`); device reset to `en`, relaunch → English again (`ac2-before-override-en.png`). Unit rung: `tests/preferences.test.mjs:28` (vi-VN, vi, en-US, empty list, mixed list, case-insensitivity) |
| AC2 language override survives restart | ✅ | Device `en`: Language page → tap "Tiếng Việt" → in-session switch with `Selected` trait on that row (`ac2-override-set-vi.png` + `.a11y.json`); `simctl terminate` (process kill) + `simctl launch` → relaunched fully Vietnamese while device language is `en` (`ac2-after-relaunch-vi.png` + `.a11y.json` — "Mở Cài đặt", "Hôm nay", vi date). Persistence went through the real AsyncStorage. Unit rung: `tests/preferences.test.mjs:55` |
| AC3 clearing the override restores device-derived language | ✅ | Language page → tap "Dùng ngôn ngữ của thiết bị" → in-session English, `Selected` moves to the device row (`ac3-cleared-in-session.png` + `.a11y.json`); terminate + relaunch → English UI with device language `en` (`ac3-after-relaunch-en.png` + `.a11y.json`). Unit rung: `tests/preferences.test.mjs:64` |
| AC4 typed storage module, explicit error path, failure ≠ success-shaped fallback | ✅ | `src/preferences.ts`: `StorageResult<T>` = `{kind:'ok'} | {kind:'error', reason}` (`src/preferences.ts:32`); read failure → `error` (`:63`), malformed payload → `error` (`:67`), write failure → `error` (`:81`); missing document → defaults (`:65`). Simulated persistence failure tested: `tests/preferences.test.mjs:73-83` (failing backend read + write), malformed payloads `:85-97` (6 payloads). App surfaces the reason on the language page (`App.tsx:76`, `App.tsx:365`), and a failed write keeps the previous selection (`App.tsx:92`) |
| AC5 no Health code; npm test + typecheck pass with new unit tests | ✅ | Health grep over the diff additions: no matches; `npm test` 61/61 (origin/main is 52 — +9, the new `tests/preferences.test.mjs`; `tests/shell.test.mjs` updated for the device-language row); `npm run typecheck` exit 0; no new Health dependency in `package.json` |

## Test-gap check (ledger)

| AC | Unit | Component/e2e (device) |
|---|---|---|
| AC1 | `tests/preferences.test.mjs:28-39` | first-launch vi + en on-device (this run) |
| AC2 | `tests/preferences.test.mjs:55-62` | set → kill → relaunch on-device (this run) |
| AC3 | `tests/preferences.test.mjs:64-71` | clear → kill → relaunch on-device (this run) |
| AC4 | `tests/preferences.test.mjs:73-97` | n/a — device failure injection needs app-code changes; the explicit error state is unit-proven and wired by `tests/preferences.test.mjs:99-111` + read on-device |
| AC5 | full suite 61/61 + typecheck (delta +9 over main's 52) | n/a — static grep for Health code |

No High gaps: every AC has an asserting unit test, and the on-device rung (real AsyncStorage,
process restarts) was exercised here. Medium/Low gaps (not written, not blocking):

- `parsePreferences` tolerates unknown extra keys in the stored document (only
  `languageOverride` is validated) — the docstring reads stricter than the code; forward-compat
  tolerance, no data-loss path (stored docs are written by `savePreferences` only). Medium.
- The App-level wiring of the error state (`App.tsx:76`, `App.tsx:92`, `App.tsx:365`) is pinned by
  source-regex assertions (`tests/preferences.test.mjs:99-111`), not a rendered component test —
  the repo's established pattern (no React test renderer configured). Low.
- `savePreferences` does not re-validate the `Preferences` argument it is handed; type safety
  (`Locale = 'en' | 'vi'`) makes an invalid override unreachable from app code. Low.

## Test artifacts

- `ac1-first-launch-en.png` / `ac1-first-launch-vi.png` — AC1 both branches
- `ac2-before-override-en.png`, `ac2-language-page-en.png` — pre-override states
- `ac2-override-set-vi.png` — override set in-session
- `ac2-after-relaunch-vi.png` — AC2 restart proof
- `ac3-cleared-in-session.png` — override cleared in-session
- `ac3-after-relaunch-en.png` — AC3 restart proof
- `*.a11y.json` — idb accessibility dumps for every interactive state (roles, labels,
  `Selected` traits)
