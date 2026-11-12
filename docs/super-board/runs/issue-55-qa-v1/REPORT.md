# QA v1 evidence — issue #55 screen slide honors Reduce Motion (PR #65 head `7025d2a`)

Environment: iPhone 18 Pro simulator (iOS 27.0, UDID D1685295-…, same device as the
issue-43/issue-52 QA runs), Debug build `com.anonymous.dayli-step-tracker`, Metro serving
the QA worktree at `7025d2a` (741 modules bundled at launch). Transitions triggered with
`idb ui swipe 340 400 60 400 --duration 0.25` (forward, dx = −280 ≤ −48, the same gesture
as the issue-52 QA) and `idb ui tap 247 110` ("Back to Today", back). Each transition was
captured with `xcrun simctl io recordVideo` and decoded frame-by-frame (30 fps) with an
AVFoundation extractor (`extract.swift`, in /tmp — not committed). Screen position was
measured per frame by template-matching the settled screen against the transition frame
(luminance SSD over a horizontal shift scan, 2 px steps, 240 px range). Points = px/3
(device 1206×2622 @3x).

Reduce Motion toggle: `xcrun simctl spawn <UDID> defaults write com.apple.Accessibility
ReduceMotionEnabled -bool YES|NO`; readback verified (`0` before the RM-off run, `1`
before the RM-on run). In-app verification that the OS answer reached the app: the duck's
perpetual loops (`PixelPet` reads the same `AccessibilityInfo` API) ran with RM off and
froze with RM on — see Sanity below.

## AC results

| AC | Command / gesture | Artifact(s) | Result |
|---|---|---|---|
| AC1 RM on → fade only, no slide (home→settings) | RM pref `1`, duck frozen, swipe left | `02-rmon-fwd-0pt-33pct.png`, `02-rmon-fwd-0pt-67pct.png`, `qa55-rmon-fwd.mp4` | **PASS** — measured horizontal shift = **0 pt at every frame** (30 fps scan, 03.47–03.67 s) while opacity climbs 0.19 → 0.33 → 0.50 → 0.67 → 0.82 → 1.00. Pure fade, zero offset. |
| AC1 RM on → fade only (settings→home) | RM pref `1`, tap "Back to Today" | `04-rmon-back-0pt-fade20pct.png`, `04-rmon-back-0pt-fade37pct.png`, `qa55-rmon-back.mp4` | **PASS** — progress-bar template match: dx = **0 pt at every frame** (02.57–03.20 s) while the fade completes (template SSD 82 → 0). |
| AC2 RM off → 70 px/300 ms slide unchanged (home→settings) | RM pref `0`, duck bobbing, swipe left | `01-rmoff-fwd-27pt/16pt/9pt/4pt/1pt.png`, `qa55-rmoff-fwd.mp4` | **PASS** — incoming Settings slides from the right: shift 27 → 16 → 9 → 4 → 1 → 0 pt across consecutive 33 ms frames while fading in (contrast 0.19 → 1.00). Decay fits ease-out cubic from 70 pt over 300 ms (`SLIDE_OFFSET`/`SLIDE_MS`/easing untouched, App.tsx:72-73,509-517). |
| AC2 RM off → slide unchanged (settings→home) | RM pref `0`, tap "Back to Today" | `03-rmoff-back-47pt/31pt/18pt/10pt.png`, `qa55-rmoff-back.mp4` | **PASS** — incoming Today slides from the left: progress bar dx −47 → −31 → −18 → −10 → −4 → 0 pt while fading (slideInLeft direction). |
| AC3 `npm run typecheck` | `npm ci` then `npm run typecheck` in the QA worktree @ `7025d2a` | `typecheck.log` | **PASS** — `tsc --noEmit`, exit 0. |
| AC3 `CI=1 npm test` | `CI=1 npm test` (full suite) | `test.log` | **PASS** — **158/158, 0 fail**. The AC's `124/124` count is stale: sibling-card test merges already on main grew the suite to 158 before this PR (builder's claim, confirmed here — the whole suite passes). |
| AC3 a11y labels byte-identical | label-expression inventory diff, base `760a136` vs head `7025d2a` | this report § a11y, `a11y-settings-head.json`, `a11y-today-head.json` | **PASS** — 23 label expressions (`accessibilityLabel`/`accessibilityActions`/`label={copy.*}`/`accessibilityValue`/`aria-label`) extracted from App.tsx on both revisions: **identical lists**; `src/localization.ts` and `src/a11y-text.ts` **byte-identical** (SHA-256 match); the diff touches only App.tsx (import line + ScreenEnter, which renders no accessibility props). Live cross-check on the head build: Settings exposes 20 labels ("Settings", "Back to Today", all rows/day entries) from those same strings. |

## Sanity: the OS answer actually reached the app

- RM off: duck region (px 280-640 × 600-1060) changed across two screenshots 1.2 s apart —
  max Δ212, 4 739 px changed (`05-sanity-rmoff-duck-bob-a/b.png`) → perpetual loops running.
- RM on: same pair — **max Δ0, 0 px changed** (`05-sanity-rmmon-duck-frozen-a/b.png`) →
  loops frozen. `PixelPet` gates on the same `isReduceMotionEnabled` +
  `reduceMotionChanged` pair the fix uses, so ScreenEnter sees the same answer.

## Harness notes

- The RM-on back capture's late frames (02.80–03.13 s) show the duck mid-**arrival
  waddle** ("back to business" bubble, duck walking in from the left — `petRef.arrive()`,
  pre-existing home-arrival animation, App.tsx). `04-rmon-back-0pt-duck-waddle-only.png`
  shows the duck displaced while the progress bar/footprints sit at settled x — the screen
  itself does not move; a whole-band template match on those frames tracks the duck, which
  is why the progress-bar-only measurement is authoritative for the back direction.
- The earliest slide frames (offset 27–70 pt) ride at opacity < 0.2 and are near-invisible
  in the recording; the 27 pt frame is the first with enough contrast to template-match.
  The measured decay still pins the ease-out-cubic-from-70 pt curve (three consecutive
  frames on the (1−t)³ trajectory).
- `idb ui tap/swipe` needed a companion restart after sim boot (`pkill -f idb_companion`,
  then re-list targets) — first two taps errored with "dtuhidd connection invalidated".

## Test-gap ledger (issue-scoped, diff = App.tsx +45/−10, no test files)

- AC1 — behavioral: the two RM-on captures above (both directions). Unit: none — no test
  pins ScreenEnter's Reduce Motion gate (the suite pins shell/nav contracts by source
  regex in `tests/shell.test.mjs`, but nothing asserts `isReduceMotionEnabled` +
  `reduceMotionChanged` + the `reduceMotion ? [] : [offset timing]` shape in ScreenEnter).
- AC2 — behavioral: the two RM-off captures above. Unit: none (same gap).
- AC3 — unit: full suite 158/158 + tsc 0 + label-inventory diff (this report).
- High gaps: none — every AC has an observable on-device test; the behavior itself is
  proven in both RM states and both directions.
- Test gaps not written (medium/low, non-blocking): (1) no unit pin for the RM gate —
  a `shell.test.mjs`-style source pin would catch a future unconditional-slide
  regression; (2) RM flip mid-entrance (the `played` guard + offset snap, App.tsx:507-524)
  not exercised on-device — would need a defaults-write racing the 300 ms window;
  (3) `isReduceMotionEnabled` rejection path (falls open to slide, App.tsx:492) not
  forceable on the sim; (4) goal/language screens use the same ScreenEnter with the same
  dir values — covered by the component-level proof, not separately captured.
