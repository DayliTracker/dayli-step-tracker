# Issue #3 QA v2 — pass

**Branch `issue-3-app-shell` @ `4fbe62b` · Release build · iPhone 17 simulator (iOS 27.0, UDID `77EC52AC-8FB5-4CE2-B248-A27A071541EE`) · all four ACs verified with real touch interaction.**

This round closes the gap QA v1 named: v1 could build and run unit checks but had no
interactive simulator access (osascript denied). This round drove the rendered app with
`idb ui tap` (real touch synthesis), read semantics with `idb ui describe-all` (live OS
accessibility tree), and captured every state with `xcrun simctl io booted screenshot`.

## Method

| What | Value |
|---|---|
| Build | `CI=1 npx expo run:ios --configuration Release` from this worktree (project's own tooling) |
| Why Release | Dev builds render the RN 0.88 `SafeAreaView` LogBox banner directly over the tab bar (documented in `issue-3-build-v2/BUILD-REPORT.md`); it intercepts tab taps. Release builds don't render LogBox — verified: no banner element in any dump. |
| App | `com.anonymous.dayli-step-tracker`, installed and launched via `xcrun simctl launch booted` |
| Drive | `idb ui tap x y` at centers read from the live `idb ui describe-all` frames — every navigation step is a real OS-level touch |
| Screenshots | `xcrun simctl io booted screenshot` — native 1206×2622 (@3x, 402×874 pt). This is a native iOS app; the web standard viewports (desktop/tablet/mobile) do not apply. |

## Per-AC result

| AC | Result | Evidence |
|---|---|---|
| 1. Launches into Today, navigates to Progress | ✅ | `ac1-launch-today.png` (Today, goal ring, tabs) → real tap on Progress tab → `ac1-progress.png` (7 day rows, `Today` + `Thu, Oct 29` … `Sat, Oct 24`); a11y dumps `a11y/ac1-*.json` |
| 2. Settings reachable from both tabs | ✅ | From Progress: `ac2-settings-from-progress.png`, header button "Back to Progress"; back → `ac2-back-on-progress.png` (Progress rows). From Today: `ac2-settings-from-today.png`, header "Back to Today". Dumps `a11y/ac2-*.json` |
| 3. Goal / language / health / clear-data destinations, no later-phase claims | ✅ | `ac3-goal-destination.png` — "Goal editing will be added later. 8,000 is the product default, not a saved setting." · `ac3-language-destination.png` — "This choice is temporary…" · `ac3-health-vietnamese.png` — "…does not request or change permissions" · `ac3-clear-data-preview-vi.png` — native alert "Dữ liệu sẽ không bị xóa trong giai đoạn này" with Hủy/Đã hiểu; **"Đã hiểu" dismissed by a real touch**, app returned to Settings intact (`a11y/ac3-after-alert-dismiss.json`). No destructive handler exists: `App.tsx:19-21` `Alert.alert` with cancel/got-it only |
| 4. Accessible names, touch targets, non-English interface | ✅ | Zero unlabeled buttons across all dumps (`a11y/*.json`); live frames: smallest control "Open Settings" 44×52 pt, tabs 184×48, settings rows 362×71, language rows 320×54 — all ≥ 44 pt HIG minimum, all but the 44-wide header action ≥ 48 pt. Vietnamese render after a real touch on "Tiếng Việt": `ac3-language-vietnamese.png`, `Selected` trait moves (`a11y/ac3-language-vietnamese.json`); Settings fully translated (`a11y/ac3-settings-vi.json`). Declared minHeight ≥ 48 stays covered by `tests/shell.test.mjs:44-56` |

Relaunch check: terminate + relaunch → English Today (`ac4-relaunch-today-english.png`) —
the documented phase-1 temporary-locale behavior; no persistence claimed, nothing deleted
by the clear-data preview.

## Local tests

`npm test` 4/4 pass · `npm run typecheck` clean — outputs in `npm-test.txt`, `typecheck.txt`.

## QA tooling committed with this evidence

- `app.json`: pinned `ios.bundleIdentifier` (`com.anonymous.dayli-step-tracker`) so
  `simctl launch` targets the app deterministically (left by the interrupted QA worker, kept).
- `package.json`: `npm run ios` = `expo run:ios` (was `expo start --ios`).

## Notes for the Reviewer

- Dev-only LogBox banner over the tab bar (RN 0.88 `SafeAreaView` deprecation) is real in
  debug builds and does intercept touches there; not visible in Release. Known issue from
  the builder's report, unchanged this round.
- VoiceOver-specific runtime behavior (gesture navigation order) still unverified — no
  VoiceOver control tooling; the OS accessibility tree (roles, labels, states, frames) is
  the evidence here.
- QA v1's "standard viewports" requirement does not apply to a native iOS app; screenshots
  are native device resolution.
