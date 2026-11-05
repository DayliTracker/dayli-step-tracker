# issue-42-qa-v1 — evidence notes

Branch `issue-42-nav-tabs-out-swipe` @ `a537159`, PR #49, device iPhone 18 Pro
simulator (iOS, 402×874pt). App built with the project's own Expo tooling
(`npx expo run:ios`, Debug) and driven with `idb ui tap/swipe` +
`idb ui describe-all`; frames extracted from `xcrun simctl io booted recordVideo`
with `tools/extract-frames.swift` (AVFoundation).

## Per-AC evidence

- AC1 no tab bar / no `select-tab` / Tabs gone — `ac1-home-clean.png`
  (no bottom bar, no header gear); a11y dump lists no tab elements;
  `tests/shell.test.mjs:19-24` pins the absence (`doesNotMatch` on both
  sources; the reducer returns undefined for the old action). Base
  `origin/main` (2bfc160) still carries `Tabs` + `select-tab`
  (App.tsx:252,716-728, src/navigation.ts:2-8) — see before/after pair below.
- AC2 swipe-left → duck walk-frame exit → Settings — `ac2-mid-lead-duck-dash.png`
  (duck mid-dash off the LEFT edge, bubble "settings time!" — a `lead` pool
  line, src/localization.ts:140), `ac2-settings-arrived.png` (Settings settled).
- AC2 busy duck never blocks — recording `ac2a-busy-duck-recording.mov`;
  frames: `ac2a-busy-duck-poked.png` (t=1.40s: surprised + heart + "hey! that
  tickles" — duck busy, POKE_MS=550), `ac2a-busy-duck-still-busy.png` (t=1.60s),
  `ac2a-busy-duck-instant-nav.png` (t=1.80s: Settings sliding in — no lead dash,
  no lead line), `ac2a-busy-duck-settled.png` (t=2.00s). Navigation fired inside
  the poke window: `lead()` refused (PixelPet.tsx:353-354 `mood !== 'idle' ||
  poked`), so `openSettingsFromHome` used the 0ms path (App.tsx:169-172).
- AC3 back → arrival waddle — `ac3-home-returned.png` (home + "home again!"
  homecome line, src/localization.ts:141; the line fires inside `arrive()`,
  PixelPet.tsx:368-372, 120ms after the screen settles, App.tsx:175-179).
- AC4 no gear; header actions ≥44pt — home renders no header at all
  (`ac1-home-clean.png`); every Settings button measured from
  `a11y-settings.json`: smallest 332×48pt, back control 126.7×52pt — 0 under 44.
- AC5 typecheck + tests — `npm run typecheck` exit 0; `npm test` 110/110
  (both run on this worktree at `a537159`).
- AC6 before/after on the PR — embedded there from this folder, pinned to the
  commit that added them.

## Screen-reader path

`a11y-home-opensettings-action.json`: home's group exposes
`custom_actions: ["Open Settings"]` with the today-summary label — the swipe is
an extra affordance, never the only path (App.tsx:413-419). Settings' back is a
labeled button ("Back to Today", frame 126.7×52pt; tests/shell.test.mjs pins
`action={back} label={back}`).
