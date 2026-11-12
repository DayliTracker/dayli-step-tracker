# QA v1 evidence — issue #56 footprints nudge overshoots the prototype baseline (PR #67 head `7c950fa`)

Environment: iPhone 18 Pro simulator (iOS 27.0, UDID `D1685295-6302-4015-B352-561ECA30D998`, the
same device as the issue-43/52/55 QA runs), Debug build `com.anonymous.dayli-step-tracker`,
Metro serving the QA worktree at `7c950fa` — fresh bundle at launch: `iOS Bundled 350ms index.ts
(839 modules)`. Screenshots via `xcrun simctl io <UDID> screenshot` (1206×2622 @3x, points =
px/3). State changes driven with `idb ui tap/swipe` in **point** coordinates: Settings date-row
stepper (+ ×3 = 300, Save total), Language → Tiếng Việt, Clear app data → Xóa dữ liệu (resets
the language preference with the rest of the local documents — the VI empty state was captured
after a second clear + language re-selection).

## Scan method

Ink mask = luminance < 150 on RGB (ink `colors.text #5B4634`, lum ≈ 74; canvas/card > 230).
Connected components (scipy `ndimage.label`), components grouped by horizontal bbox gap;
in the pill band the last group is the shoe-print mark, the group before it is the count text
(digits or em dash). A region's **ink-bottom** = the max row containing any ink pixel of the
group. All shots scanned with the same script and thresholds (`scan-ink.py`, committed here;
pill band = components with y1 ≥ 0.5 × H, which excludes the duck entirely).

Prototype baseline: `prototype-merged-shell.html` (textless-shell v6, commit `5c27467`) rendered
headless in Chrome at phone width — 402×874 viewport, DPR 3 (1206×2622, directly comparable in
pt), Google Fonts (Lexend/Nunito) loaded before capture, bezel/badge stripped so the scan sees
only screen ink. 300 state produced by appending `S.dateSteps[todayKey()] = 300; render();`
(deterministic; the pill's own `addSteps()` uses a random increment).

## Pixel scans (app @ `7c950fa`, nudge removed)

| Shot | count ink-bottom | mark ink-bottom | gap (mark − count) |
|---|---|---|---|
| `02-home-300-en.png` | 1560 px = **520.0 pt** | 1561 px = **520.33 pt** | **+1 px = 0.33 pt** |
| `03-home-300-vi.png` | 1560 px = 520.0 pt | 1561 px = 520.33 pt | **+1 px = 0.33 pt** |
| `01-home-empty-en.png` | 1535 px = 511.67 pt (dash) | 1561 px = 520.33 pt | +26 px = 8.67 pt |
| `04-home-empty-vi.png` | 1535 px = 511.67 pt (dash) | 1561 px = 520.33 pt | +26 px = 8.67 pt |

Prototype v6 re-render (spec of record): 300 state — digits 1545 px = 515.0 pt, mark 1553 px =
517.67 pt, gap **+8 px = 2.67 pt** (files: `proto-v6-300-phone-width-3x.png`,
`proto-v6-empty-phone-width-3x.png`). Empty state — dash ink-bottom 1519 px = 506.33 pt, mark
1553 px = 517.67 pt, gap +34 px = 11.33 pt.

Before-state cross-check (the premise): the refine loop's committed nudge-state shot
`docs/ui-refine/home-settings/after-home-300-en.png` scans digits 1567 px = 522.33 pt vs mark
1578 px = 526.0 pt = **+11 px = 3.67 pt** — reproducing the issue's closing-check numbers
(522 vs 525.7; the 0.3 pt difference is one antialiased row at the scan threshold). The
overshoot this PR removes is real on the pre-fix build.

## AC results

| AC | Evidence | Result |
|---|---|---|
| AC1 — fresh home-300 shot: mark ink-bottom within ~1.5 pt of the digits' ink-bottom | `02-home-300-en.png`, `03-home-300-vi.png`, scans above | **PASS** — mark rests **0.33 pt** below the digits' ink-bottom (EN and VI identical). Builder's claim ~0.7 pt, measured 0.33 pt — same placement class; the 3.7 pt overshoot is gone (before-state cross-check above). |
| AC2 — same relationship on the "—" empty state, EN + VI | `01-home-empty-en.png`, `04-home-empty-vi.png`, scans above | **PASS** — the mark's ink-bottom is **1561 px in all four shots**: it does not move when the count renders "—" instead of digits, and not between languages — exactly the prototype's own behaviour (mark at 1553 px in both its states). The mark-vs-dash gap (8.67 pt) matches the prototype's empty-state relationship (11.33 pt; the em dash is a high glyph — the prototype's own pill has no ≤1.5 pt mark-to-dash relationship either). |
| AC3 — `npm run typecheck` clean, `CI=1 npm run test` green | `typecheck.log` (exit 0), `test.log` | **PASS** — `tsc --noEmit` exit 0; suite **158/158 pass, 0 fail**. |

Note on the AC2 reading: a literal "mark within ~1.5 pt of the dash's ink-bottom" is not
satisfiable by any implementation consistent with the Fix section, and the spec of record
contradicts it — the prototype's empty state has the mark 11.33 pt below the dash's ink-bottom.
"Same relationship" therefore reads as: the baseline placement established by AC1 also holds on
the empty state (the mark keeps its position when the count glyph changes) — measured
state-invariant at 1561 px, EN + VI.

## Test-gap ledger (issue-scoped, diff = App.tsx one style line + comment, no test files)

- AC1/AC2 — behavioral: the four on-device scans above (both states × both languages).
  Unit: none possible for glyph ink placement — the suite pins the pill's *wiring*
  (`shoe-print` present, textless hero — `tests/today.test.mjs:221-249`) but nothing pins the
  `s.footprint` transform: a regression re-adding `translateY: spacing.xs` would pass the whole
  suite. **Medium** gap: the only guard is this device scan. A source-regex test pinning
  `footprint: {}` would be brittle (the AC is a pixel relationship, not a style literal) and is
  deliberately not written.
- AC3 — covered: full suite + typecheck run in the QA worktree at the reviewed head.

## Harness notes

- `idb ui tap/swipe` take **points**, not pixels — an early pixel-coordinate tap (1110, 2437)
  exited 0 and silently hit nothing; all navigation above uses pt.
- The VI "Quay lại Cài đặt"/"Quay lại Hôm nay" header buttons are narrower than the EN ones —
  the EN back-tap coordinate (247, 110 pt) lands left of the VI button's edge (x ≈ 248-312 pt);
  VI navigation used (280, 110) / (228, 109) pt.
- Clearing app data resets the language preference (`LOCAL_DATA_KEYS` includes
  `PREFERENCES_KEY`, `src/clear-data.ts`) and re-arms the explain-before-request Health flow
  (dismissed with "Not now"); the VI empty state was captured after re-selecting Tiếng Việt.
- The simulator's Dynamic Island renders as a black blob at the top of some shots (system
  overlay, y ≈ 60 px) — far above the pill band, no effect on any scan.
