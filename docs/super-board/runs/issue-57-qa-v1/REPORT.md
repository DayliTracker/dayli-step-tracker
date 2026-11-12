# QA pass 1 — issue #57 (PR #68) — the stepper scrim spans the status bar

Date: 2026-11-13 · Tester lane · iPhone 18 Pro simulator, UDID
`D1685295-6302-4015-B352-561ECA30D998`, iOS 27.0, 402×874pt @3x (1206×2622px).
App under test: Release build produced from this QA worktree at PR head
`11c98e2` (`main.jsbundle` regenerated during the build — no prebuilt bundle was
present). UI driven by XCUITest (real HID events; the host's idb companion
cannot stream drags — same finding as `issue-44-qa-v2`). Driver:
`ios/DayliStepTrackerUITests/QA57Driver.swift` (gitignored expo-prebuild output;
never committed).

```
Executed 2 tests, with 0 failures (0 unexpected) in 57.570 (57.578) seconds
** TEST SUCCEEDED **
```

- `test_a_stepper_open_vi` — swipe-left → Settings (Cài đặt) → tap the Today
  row → stepper opens; −/+ / Save / Cancel present (`ac1-stepper-open-vi.png`).
- `test_b_stepper_open_en` — switches the app's persisted language to English
  through its own Language page, returns home, reopens Settings, opens the
  stepper (`ac1-stepper-open-en.png`).

The app persists a language override (issue #16), so locale launch arguments do
not change the UI; the EN pass drives the app's own language switch. The sim
ends the run with the override set to English — noted as a test-device side
effect.

## Result: all three ACs pass

### AC1 — no hard cream edge at the safe-area top (EN + VI) ✅

Pixel scan (`scan-scrim.py`, full output in `scan-scrim-output.txt`):

| Image | cream run at top | verdict |
|---|---|---|
| before fix `58f03a1` (`before-fix-stepper-vi.png`) | 186px = **62.0pt**, hard edge at y=62.0pt | reproduces the issue's premise exactly |
| after fix · VI (`ac1-stepper-open-vi.png`) | **0px** — row y=0 already dim (dim fraction 1.00) | scrim reaches y=0 |
| after fix · EN (`ac1-stepper-open-en.png`) | **0px** — row y=0 already dim (dim fraction 1.00) | scrim reaches y=0 |

The scan classifies each row of the top 250px as page-cream (250,243,230 ±14)
vs scrim-dimmed (≈180,175,166 ±14, cream under rgba(0,0,0,.28) per
`src/tokens.ts:31`). The before shot's transition sits exactly at the issue's
reported y=62pt, which validates both the tooling and the premise; the fixed
build shows no cream rows anywhere in the scan band, in either language.

### AC2 — popup card position and VoiceOver containment ✅ (one documented nuance)

Card bounding box from the same scan (card bg rgba(250,243,230,.98)):

| | before fix | after fix · VI | after fix · EN |
|---|---|---|---|
| x (pt) | 51.0–351.0 | 51.0–351.0 | 51.0–351.0 |
| y (pt) | 357.3–544.7 | 344.0–530.0 | 344.0–530.0 |
| size (pt) | 300 × 187.4 | 300 × 186.0 | 300 × 186.0 |

- Horizontal position, width, and size: pixel-identical before and after.
- Vertical: the card recentered 13.3pt up. The in-screen overlay centered its
  content in the safe-area box (62–874pt → center 451.0pt); the Modal's window
  centers in the full screen (0–874pt → center 437.0pt). The prototype mounts
  its overlay with `inset: 0` (the issue's stated authority), so the full-window
  centering is the prototype's own geometry — the pre-fix safe-area centering
  was part of the drift this card fixes. Judged pass; flagged for the Reviewer.
- XCUITest element frames while the popup is open (`ac2-stepper-frames-*.json`):
  card title, readout, −/+, Save, Cancel all present and laid out inside the
  popup in both languages.
- VoiceOver containment: `accessibilityViewIsModal` stays on the scrim — the
  branch's own `tests/shell.test.mjs` pins it, and a mutation check removed the
  Modal mount and saw that test go red (9 pass / 1 fail), then restored green
  (10/10). A functional VoiceOver walk was not performed (no VoiceOver harness
  in this driver) — the containment claim rests on the attribute being unchanged
  plus the popup controls remaining the only exposed elements while open.

### AC3 — `npm run typecheck` clean and `CI=1 npm run test` green ✅

Run in this worktree at `11c98e2` after a fresh `npm ci`:

- `npm run typecheck` → exit 0.
- `CI=1 npm run test` → `# tests 159 / # pass 159 / # fail 0`.
- `tests/shell.test.mjs` in isolation → 10/10, including the new
  "the stepper scrim spans the window" pin (red under the mutation above).

## Test-gap check (after build)

Ledger (AC → asserting test):

| AC | unit | component/e2e | device |
|---|---|---|---|
| AC1 scrim reaches y=0 | none — geometry not unit-testable in the node suite | `tests/shell.test.mjs` pins the Modal mount (structural, mutation-checked red) | `scan-scrim.py` on EN + VI shots — the asserting evidence |
| AC2 card + containment | shell test pins 300pt card + `accessibilityViewIsModal` | XCUITest element asserts + frame dumps | pixel card-bbox comparison (above) |
| AC3 suites | — | — | tsc exit 0; 159/159 |

Edge cases hunted:

- **Languages** — EN + VI both scanned (the scrim is language-independent, but
  the shots double as the AC's own EN+VI requirement).
- **Popup variants** — the captured steppers have no saved manual total (no
  Remove button). The hasManual variant renders one extra button inside the same
  card; the mount under test is identical. Not captured on-device — low.
- **Reduce Motion** — `animationType="none"` mounts instantly with no
  animation to suppress; the Modal wrapper adds no motion. Not re-driven — low.
- **Explain sheet interplay** — both popups are root-level Modals; the explain
  sheet (same pattern) already ships on main. Not re-driven — low.

No High gaps: the only rung able to assert screen geometry is the device scan,
and it is committed here (`scan-scrim.py` + shots) so the Reviewer can re-run
it. Medium/Low gaps above are noted, none blocking.
