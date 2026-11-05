# Issue #3 build v2 — rendered simulator verification

**Builder rebuild round 1 · branch `issue-3-app-shell` · verified against the working tree with the language-row fix applied.**

QA v1 could not capture rendered UI evidence: its environment denied `osascript`
System Events, `simctl launch`, and `simctl io screenshot` (see
`docs/super-board/runs/issue-3-qa-v1/QA-REPORT.md`). This rebuild re-ran the
verification in a shell where those tools are permitted, captured the four flows
on a real iOS simulator, and fixed the one rendered defect found.

## Method (read before trusting the evidence)

No synthetic touch input exists in this environment (no `idb`, no Accessibility
permission for UI scripting), so navigation was driven through the app's own
rendered controls: the Hermes debugger exposed by Metro (CDP) located each
`Pressable` in the live React fiber tree and invoked its real `onPress`. The
screenshots show the real rendered result of those handlers; the JSON files are
the live accessibility tree (labels may repeat — the walker visits React 19's
duplicated fiber paths). This proves the rendered controls are wired and the
screens render; it does not prove physical hit-testing, which still needs
Accessibility Inspector or a human pass.

## Environment

| What | Value |
|---|---|
| Device | iPhone 17 simulator, iOS 27.0, UDID `77EC52AC-8FB5-4CE2-B248-A27A071541EE` (same device QA v1 used) |
| App | Debug build from DerivedData `DayliStepTracker-dvvafkaqshzgukctzdljscxcbmoy`, bundle `com.anonymous.dayli-step-tracker` |
| JS | Served by Metro from this branch (`CI=1 npx expo start --port 8081`) |
| Screenshot | `xcrun simctl io booted screenshot` — native 1206×2622 (@3x, 402×874 pt) |

Reproduce: boot the device, `npm ci`, start Metro, install the app, launch it,
then `node drive-flows.mjs drive` (script in this folder; expects Metro on
8081 and the app running).

## Per-AC result

| AC | Evidence |
|---|---|
| 1. Launches into Today, navigates to Progress | `01-launch-today.png`, `02-progress.png`; a11y dumps show Today goal labels, then the seven Progress day rows |
| 2. Settings reachable from both tabs, correct return | `03-settings-from-progress.png` (header "Back to Progress"), `06-settings-from-today.png` ("Back to Today"), `04-back-on-progress.png` (return lands on Progress rows) |
| 3. Goal / language / health destinations + confirmed clear-data preview, no later-phase behavior | `07-goal-destination.png`, `09`/`10-language-*.png`, `12-health-vietnamese.png`, `14-clear-data-preview-vi.png` — native alert "Dữ liệu sẽ không bị xóa trong giai đoạn này" with Hủy/Đã hiểu, neither button has a destructive handler (`App.tsx:19-21`) |
| 4. Accessible names, touch targets, non-English interface | Live a11y dumps (`a11y-*.json`): every interactive control carries `accessibilityRole` + `accessibilityLabel`; full Vietnamese render after switching (`10`, `12`, `14`); declared minHeight ≥ 48 stays covered by `tests/shell.test.mjs:44-56`. VoiceOver runtime behavior remains unverified (needs interactive accessibility tooling) |

Relaunch after the alert (`16-relaunch-today-english.png`) shows the language
choice reset to English — the documented phase-1 temporary-locale behavior.

## Defect found and fixed in this rebuild

The language rows rendered as `EnglishSelected` / `Tiếng ViệtĐã chọn` — no gap
between label and badge. `s.card` centers children, so the rows shrink-wrapped
and `justifyContent: 'space-between'` had no space to distribute. Fix: `s.list`
gets `alignSelf: 'stretch'` (`App.tsx`), matching the Settings row layout.

## Known, not fixed here

- Dev builds show a LogBox banner ("Open debugger to view warnings") over the
  tab bar — `SafeAreaView` deprecation warning from `react-native` (RN 0.88).
  Dev-only; the replacement (`react-native-safe-area-context`) is a new native
  dependency and does not belong in this navigation shell. Release builds don't
  render LogBox.
- The native alert's buttons (Hủy / Đã hiểu) are outside the React tree and
  cannot be pressed by the driver; neither has an `onPress` handler, so neither
  can mutate anything (dismiss-only per React Native `Alert` semantics).
