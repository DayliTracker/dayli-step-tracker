# QA v2 — re-test of the round-1 rebuild (`e4e1fe8`)

Card: #14 (✨ [feature] mascot: bring the animated PixelPet into the shell) · PR #33
Tester: super-board Tester lane, 2026-10-31 · evidence for `[qa] [report] ✅ passing · v2`

## Commands run

```
npm ci --silent                          # exit 0
npm run typecheck                        # exit 0
npm test                                 # exit 0 — 39/39
npx expo run:ios --configuration Release \
  --device 77EC52AC-8FB5-4CE2-B248-A27A071541EE --no-bundler   # exit 0
xcrun simctl launch 77EC52AC-8FB5-4CE2-B248-A27A071541EE \
  com.anonymous.dayli-step-tracker                            # pid 93189
idb ui tap 192 649 --udid 77EC52AC-8FB5-4CE2-B248-A27A071541EE # poke
idb ui describe-all --udid 77EC52AC-8FB5-4CE2-B248-A27A071541EE > a11y-tree.json
```

Device: iPhone 17 simulator, iOS 27.0 (same device as QA v1). Build: Release of `e4e1fe8`
("🐛 [fix] mascot: hold the walk mood and trim the pet registry").

## Per-AC results

| AC | Result | Evidence |
|---|---|---|
| AC1 animated PixelPet (idle bob and blink, celebrate at goal, poke reaction) | ✅ | `ac1-idle-pixelpet.png` (idle), `ac1-blink.png` (mid-blink, closed-eye frame caught via 35-frame screenshot burst), `ac1-poke-heart.png` (surprised O-eyes + pink heart), `ac1-poke-resolved.png` (back to idle). Celebrate is unreachable on-device by design — the truthful phase-1 shell keeps progress 0 (`App.tsx:115-122`); it is wired through the capped progress (`tests/today.test.mjs:208`) and pinned by the mood-machine drive harness (`tests/today.test.mjs:122-176`): walk on rise, celebrate at goal, exit on fall, held progress holds |
| AC2 duck hidden from the a11y tree; ring summary label unchanged | ✅ | `a11y-tree.json`: 12 elements, no duck and no poke control; ring label one sentence — "Your step total will appear when step data is connected. Daily goal: 8,000 steps." — identical to QA v1 |
| AC3 step total, goal, source label not obscured in any state | ✅ | idle and poke shots show all three labels fully clear; the poke heart rises inside the slot headroom above the pet (headroom pinned by `tests/today.test.mjs:188`) |
| AC4 typecheck + tests pass; simulator evidence embedded on the PR | ✅ | typecheck exit 0, 39/39 tests at `e4e1fe8`; screenshots embedded in the QA v2 PR/issue comments and the PR Before \| After block |

## Test gaps (not written)

- The walk burst's WALK_MS settle timer is pinned by a source regex (`tests/today.test.mjs:182`),
  not behaviorally driven — Low, engine-side; the mood-entry/exit paths around it are driven.
