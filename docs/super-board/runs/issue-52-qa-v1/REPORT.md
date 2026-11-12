# QA v1 evidence — issue #52 stroll long-hold full-surface (PR #63 head `51a3b86`)

Environment: iPhone 18 Pro simulator (iOS 27.0, UDID D1685295-…, same device as the
issue-43 QA), Debug build `com.anonymous.dayli-step-tracker`, Metro serving the QA
worktree at `51a3b86` (872 modules bundled at launch). Touches synthesized with `idb ui`
(zero-displacement swipe = stationary hold; `idb ui tap --duration` was rejected as a
hold driver — see "Harness notes"). Screenshots taken by `xcrun simctl io screenshot`
during/after each gesture. Device frame 402×874 pt (1206×2622 px @3x).

## AC results

| AC | Command / gesture | Artifact(s) | Result |
|---|---|---|---|
| AC1 hold below pill strolls | `idb ui swipe 201 655 201 655 --duration 0.9` (0.9 s hold at (201,655), below the pill at y≈508) | `03-ac1-hold-v2-a/b/d/g.png` | **PASS** — "walk walk walk" stroll bubble, open-beak walk frame, duck displaced right → left → center-return, settled idle |
| AC1 side strip strolls | `idb ui swipe 32 437 32 437 --duration 0.9` (left edge) | `04-ac1-sidestrip-a/c.png` | **PASS** — stroll fired from the side strip too |
| AC2 hold on duck never strolls | `idb ui swipe 199 363 199 363 --duration 0.9` (duck body) | `05-ac2-duck-hold-a/b/d.png` | **PASS** — duck's own poke response ("hey! that tickles" + heart, startle face), no stroll bubble, no displacement |
| AC2 hold on pill never strolls | `idb ui swipe 184 509 184 509 --duration 0.9` (pill) | `06-ac2-pill-hold-a/c/d.png` | **PASS** — nothing happens; pill stays inert, duck centered idle |
| AC3 #42 swipe keeps behavior | `idb ui swipe 340 400 60 400 --duration 0.25` (dx = −280 ≤ −48, App.tsx:614) | `07-ac3-swipe-settings.png`, `09-ac3-back-today.png` | **PASS** — Settings opens; "Back to Today" header returns (duck: "home again!") |
| AC3 ScrollView keeps behavior | `idb ui swipe 201 120 201 560 --duration 0.5` (deliberate pull from the top) | `09b-ac3-pull-refresh-spinner.png` | **PASS** — RefreshControl fires ("Refreshing…" banner); the scroll move cancels the hold, no stroll during the pull |
| AC3 `npm run typecheck` | `npm run typecheck` in the QA worktree @ `51a3b86` | `typecheck.log` | **PASS** — `tsc --noEmit`, exit 0 |
| AC3 `npm test` | `npm install --no-audit --no-fund` then `npm test` | `test.log` | **PASS** — 158/158 (incl. the 3 new AC3 pins in `tests/moods.test.mjs:78-88`) |

## Harness notes (why some frames look odd)

- `02-ac1-hold-drift-a..h.png` — first attempt used `idb ui tap --duration 0.9`; on this
  SDK the synthesized touch **drifts downward**, so the ScrollView's RefreshControl fired
  instead of the hold ("Refreshing…" banner) and the >12 pt move cancelled the stroll
  (App.tsx:644-649). This is harness behavior, not an app regression; it also incidentally
  shows the move-cancel branch and the refresh control working. Retried with a
  zero-displacement swipe (`swipe x y x y`), which holds stationary — AC1 then passed.
- The residual "Refreshing…" banner in a few AC2 frames (`05-b/d`, `06-c`) is the same idb
  jitter nudging the ScrollView; it does not affect the no-stroll assertions.
- A rightward swipe (dx = +280) does not navigate (`08-ac3-swipe-right-no-nav.png`) —
  matches the pan's one-direction contract (`dx <= -48`, App.tsx:614).

## Test-gap ledger (issue-scoped, diff = App.tsx +17/−4, tests/moods.test.mjs +11)

- AC1 — unit: `tests/moods.test.mjs:78-88` (three new source pins: wrapper `flex: 1`,
  group `alignSelf: 'stretch', flexGrow: 1`, hero `flexGrow: 1`); behavioral/e2e: this
  sim run (below-pill + side strip). Pinned at both rungs.
- AC2 — unit: `tests/moods.test.mjs:64-70` (duck/pill opt-out pins, pre-existing);
  behavioral: `05-*`, `06-*` above. Pinned at both rungs.
- AC3 — unit: full suite (158) + typecheck; behavioral: `07-*`, `09b-*` above.
- Edge cases observed on-device: move-cancels-hold branch (App.tsx:647-648) fired during
  the drift rung and the deliberate pull; wake-on-touch fired on every hold.
- High gaps: none — every AC has an observable on-device test plus a unit pin.
- Test gaps not written (medium/low, non-blocking): no Android surface run (iOS sim
  only); stroll-during-active-scroll composition not exercised beyond the pull.

## Unit-gate note

`npm test` on a fresh worktree fails 1/158 (`tests/smooth-frames.test.mjs:220`,
`@resvg/resvg-js` unresolved) **before** `npm install` — the dependency is declared
(package.json:18) but was not installed in this worktree; the same single failure
reproduces on the base clone without install. After `npm install` the suite is
158/158. Not a regression of this PR (diff touches App.tsx + tests/moods.test.mjs only).
