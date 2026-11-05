# QA v1 evidence — issue #43 moods (PR #50 head `8697eac`)

Environment: iPhone 18 Pro simulator (iOS 27.0, UDID D1685295-…), Debug build from the
QA worktree at `8697eac` (native project copied from main, Pods reinstalled for
`expo-localization`), Metro serving the worktree's JS. Driver: XCUITest runner
(`QA-driver-MoodsQATests.swift`, this folder) driving gestures on-device; screenshots
taken by the runner at the moment each state should show (XCTAttachment, ~60-300ms
cadence bursts). Unit gates re-run in the worktree: `npm run typecheck` → 0 errors,
`npm test` → 117/117 pass.

| AC | Artifact(s) | What they show |
|---|---|---|
| AC1 sleep | `02-sleep-longpress.png` | after a 1.6s press the duck holds the blink face, dimmed (breathe-dim), z glyphs floating (z z Z) |
| AC1 wake | `03-wake-startle.png`, `03b-wake-idle.png` | a tap on the sleeper startles (surprised face) then settles idle — wake on any touch |
| AC1 self-wake | `04-sleep-again.png` → `05-selfwake-12s.png` | asleep again; 12.6s later idle, no z's — the ~12s self-wake |
| AC3 stroll | `06b-stroll-b/d/f.png` | hold at (201,180) — walk frame + "walk walk walk" stroll bubble + the duck displaced left, center-walking, returning: the screen-cross stroll ran |
| AC3 limits | `06-stroll-a..f.png` | hold at (201,495) (pill band) and below the pill: no stroll — see Finding F1 |
| AC5 nav | `08-swipe-from-sleep-navigates.png` | a decisive leftward swipe starting on the sleeping duck opens Settings — sleep never traps navigation |
| AC5 a11y | `a11y-tree-note.md` | the duck, z's, stars and heart are absent from the AX tree; the group label stays the single source |
| AC4 hop | `09-hop-a..f.png` | XCUITest doubleTap lands as two pokes (surprised + heart, "again! again!") — the synthesized pair gap exceeds the 300ms window on this host; hop not captured (see Finding F2) |
| AC2 dizzy | — | no public API synthesizes a 2-reversal drag; the private XCPointerEventPath route crashes the test runner on this SDK (`runner-crash-synthesized-event.ips`) — not captured (see Finding F2) |

## Findings

- **F1 (Gap, medium, non-blocking)** — the stroll long-hold only answers inside the
  touch-observing wrapper's frame, which spans its children only (≈ y146–555: the pet
  slot + pill band). A hold on the lower half of the home screen (the largest empty
  area, below the step pill) never strolls: App.tsx:493-498's wrapper has no style,
  so its bounds end at the pill; the accessible group above it has no onTouchStart.
  AC3's "holding home" is met only for the middle band.
- **F2 (Verification gap, tooling)** — wiggle-dizzy and the double-tap hop could not
  be driven on this host. Public XCUITest caps drags at one segment (one direction
  reversal = 1 flip; isWiggle needs 2) and its doubleTap's inter-tap gap exceeds the
  300ms window (observed: two pokes). The private XCPointerEventPath /
  XCSynthesizedEventRecord route (3-leg wiggle, 170ms-pair double-tap) crashes the
  runner's synthesize call on this SDK. Both behaviors stay covered by the unit pins
  (tests/moods.test.mjs: isWiggle/countFlips math, duck-touch gate, DOUBLE_TAP_MS,
  wobble ±12° and star/heart reuse) and by code read (PixelPet.tsx:324-343 wobble,
  :609 look frame, :628 star layer, :380-404 hop choreography, :479-487 double-tap
  branch). On-device human QA should confirm the feel of these two gestures.
