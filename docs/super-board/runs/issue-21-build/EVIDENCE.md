# Issue #21 — builder evidence (verification matrix + readiness docs)

Executed 2026-11-12 at head `3a5948c` (origin/main, branch
`issue-21-phase-4-verification-matrix`).

## Environment

- Node v22.23.4, macOS arm64 (darwin 25.6.0), Xcode 27.2 (27B52).
- iPhone 18 Pro simulator, iOS 27.0 runtime, booted; development build via
  `npx expo prebuild --platform ios` then `npx expo run:ios` (Metro served
  the JS bundle; the app installed and launched from this branch's source).

## Automated checks (run in the worktree, logs committed here)

| Command | Result | Log |
|---|---|---|
| `npm ci --silent && npm run typecheck` (board config verify command) | exit 0, tsc clean | `verify-config-command.log` |
| `npm test` (full required suite) | **158/158 pass, 0 fail, 0 skipped** | `test-suite-2026-11-12.log` |

## Simulator evidence (development build from this branch)

| File | What it shows |
|---|---|
| `sim-01-home-en.png` | Dev build on iOS 27.0, English: textless home with the smooth duck, the day's first bubble line ("nice to see you"), and the truthful `—` no-data count slot — the granted state (decision record carried on this simulator from #19/#20 QA) with no Health data present. The system explain sheet correctly stays closed. |
| `sim-02-home-vi.png` | Same build after `AppleLanguages = vi` (app + global defaults) and relaunch: the bubble line renders in Vietnamese ("bạn thơm mùi bước chân") — the vi voice pool resolves on the dev build. |
| `sim-03-home-vi-ax5.png` | Same build at content size AX5 (`accessibility-extra-extra-extra-large`): Dynamic Type scales the bubble text; the decorative bubble renders the line's tail ("chân") inside the bubble box. |

Observation recorded honestly: at AX5 the decorative duck-voice bubble
clips its line to the last word. The bubble is the duck's voice — it is
decorative, ignores touches, and sits outside the accessibility order
(unit-verified: "the bubble ignores touches and stays out of the
accessibility order"); string-bearing controls keep AX5 geometry per the
committed dump checks ("largest text size (AX5) keeps buttons and geometry
inside bounds"). Recorded here so the on-device reviewer sees it; flagged
as an observation, not validated as a defect.

The home screen is textless by design, so locale-visible strings beyond the
bubble live on Settings/Progress and in accessibility labels; the VI
string-bearing screens on the dev build were photographed in #19/#20 QA
(`docs/super-board/runs/issue-19-qa-v1/vi-*.png`,
`docs/super-board/runs/issue-20-qa-v1/`).

## What simulator evidence cannot prove (not claimed here)

- Live HealthKit reads on hardware — AC 2 requires a physical iPhone;
  no physical device is attached to this run (`xcrun devicectl list
  devices` reports simulated devices only). The gate table lives in
  `docs/verification-matrix.md`.
- No touch automation on this host: Settings/Progress screens could not be
  navigated for fresh screenshots; their VI rendering evidence remains the
  #19/#20 QA captures plus the full VI string coverage in the unit suite.
- A populated Health read (the simulator has no Health step data), so the
  no-data state is what renders — which is itself the truthful-state
  evidence above.

## Simulator state left behind

Content size reset to `medium`, `AppleLanguages`/`AppleLocale` overrides
deleted from the app domain, global locale reset to `en`, app terminated.

## Repo-scan evidence

`git ls-files` at `3a5948c`: zero tracked files match
`server|backend|firebase|analytics|.sql`; `package.json` lists no
analytics/telemetry dependency. Grounds matrix row 16 and the App Privacy
draft in `docs/release-readiness.md`.
