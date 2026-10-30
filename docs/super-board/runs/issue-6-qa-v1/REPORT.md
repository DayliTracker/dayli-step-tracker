# QA report — issue #6 · phase-1 accessibility and device layouts · v1

- Branch: `issue-6-phase-1-verify-accessibility-and-device-layouts` @ `c1a3699` (== `origin/main`)
- Build: Expo SDK 58 / RN 0.88 debug dev build via `npm exec expo run:ios --configuration Debug`, Metro attached
- Devices: iPhone 17 sim (402×874, iOS 27.0), iPhone 17e sim (390×844, iOS 27.0)
- Method: real `idb ui tap` navigation + `idb ui describe-all` accessibility dumps + `xcrun simctl io` screenshots. Screen-reader names/values, ring semantics, contrast, and touch targets were verified from dumps, computed ratios, and code — not from screenshots.

## Verdict per acceptance criterion

| AC | Result | Evidence |
|---|---|---|
| 1. Navigation + Settings from both tabs verified (or blockers documented) | ✅ pass | Real taps: Today → Settings → back → tab Progress → Settings → back → Language → vi → back ×2. Origin-aware back labels (`Back to Today` / `Quay lại Tiến độ`) flip correctly; tab Selected traits flip; every step has dump + screenshot (01–09). No blockers. |
| 2. Narrow layouts + larger text with short/long en+vi strings | ✅ pass | en (shorter) and vi (longer) at medium; vi at AX5 (`accessibility-extra-extra-extra-large`); iPhone 17e (390pt) at medium + AX5 (dumps/screenshots 07–15). Geometric checker: no horizontal clipping, no text overlap, nothing above screen top, in any state. |
| 3. Screen-reader names/values, ring semantics, contrast, touch targets | ✅ pass with 2 findings | Dumps: all controls carry labels + roles; ring group hides decorative center (`—`/`steps` not in AX tree) and carries count/goal/ratio/source text; language rows expose radio `Selected` state; tabs expose `Selected`. Contrast: all 21 rendered text pairs + lit ring segment pass WCAG 2.1 AA (table below). Touch targets: one finding — header action renders 43.33×52 (width < 44 HIG minimum) → bug #24. Ring a11y label contains the known `..` double period → bug #11 (confirmed present in dumps 01/09/13, both locales). |
| 4. Evidence covers agreed states; placeholders never presented as live totals | ✅ pass | The shell truthfully renders the `unavailable` snapshot: `— steps`, "will appear when step data is connected", per-row "— bước", source "not available in this shell". Manual-entry and clear-data alerts state nothing was saved/deleted (16/17 + dumps). No live Health or manual totals exist in this build and none are claimed. |
| 5. No HealthKit / release-readiness claims from Simulator evidence | ✅ pass | This report claims nothing about live HealthKit, physical-device behavior, or release readiness. Physical-iPhone HealthKit verification remains in Phases 3–4. |

## Findings

1. **Header action touch target 43.33×52** (width < 44pt HIG minimum at default/medium text) — filed as **bug #24** (priority low). Height 52 passes; AX text sizes scale it past 44 (78.3×60 at AX5); shows on 402pt and 390pt widths, both locales. Style fix: `minWidth: 44` (App.tsx:322).
2. **Today ring a11y label double period** — already filed as **bug #11** (OPEN, untouched by this card's scope); confirmed on-device in this run's dumps (01/09/13), both locales.
3. Non-blocking note: Metro LogBox dev banner ("Open debugger to view warnings") overlaps the tab bar in debug builds only (RN `statusBarStyle` deprecation warning on iOS 27); it is dev tooling, not app UI, and absent from the a11y tree of captured states.

## Contrast (computed, tests/contrast.test.mjs)

All 21 text pairs pass WCAG 2.1 AA: minimum measured 4.63:1 (eyebrow/date/intro/disclosure on root, min 4.5:1); body pairs 5.03–8.71:1; large-text pairs 6.91–8.71:1 (min 3:1). Lit ring segment on card 3.19:1 (non-text 3:1 pass); unlit ring track 1.32:1 — decorative, status always carried by text (summary + a11y label).

## Contention incident

A zombie worker of stopped run `dwfrun-8cdf7500` ran this same card in parallel (22:36–22:56 +07); the orchestrator killed it and its `qa6-narrow-ax` simulator. Its files were quarantined under `foreign/` (not used as evidence); every capture in the interference window was re-verified — dumps re-scanned (no LogBox banner, no foreign elements), screenshots visually checked against dumps, geometry re-checked, suite re-run.

## Local tests

`npm test` → 37/37 pass (24 pre-existing + 6 contrast + 7 a11y-dump evidence tests) · `npm run typecheck` clean · `node scripts/qa-a11y-check.mjs` on all 17 dumps (43pt floor, 6 dumps fail at 44pt floor only on the header-action finding → bug #24).
