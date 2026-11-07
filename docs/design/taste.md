# Taste and direction

Filled by the /ui-refine-loop grill for this run's target. Everything above the
target block stays neutral; per-target blocks live under **Direction**.

## Direction

### Home + Settings (EN + VI), light theme — `refine/home-settings`

**Goal.** A post-parity polish pass. The app already matches the prototype
(`prototype/textless-shell` v6 is the spec of record; parity passed
2026-11-06). Find and fix visual-quality problems — hierarchy, spacing,
typography, color, composition — that survive *inside* that look.

**Direction.** Same look, just cleaner. The prototype locks the design: cream
canvas, warm brown ink, mint accent, Nunito display + Lexend text, the duck
centred high on home, title-only settings rows, the in-screen stepper popup.
Do not introduce new visual concepts; refine what is there.

**Keep — hard rules for every fixer.**

- The prototype's look is the spec of record: never diverge from it to chase a
  rubric score. When the rubric and the prototype disagree, the prototype wins.
- Mascot art is locked: the duck's frames (`components/pets.ts` assets) never
  change. PixelPet's mood and gesture behavior (sleep, dizzy, stroll, hop,
  lead, arrive, poke hearts) is settled product behavior (#42/#43/#45) —
  no changes to what it does, only to how its slot is spaced if needed.
- Accessibility is locked: the Today group's single screen-reader label, the
  open-settings custom action, `accessibilityViewIsModal` on the popup, and
  every accessibility label are tested contracts. Visual-only changes.
- Light theme only — the product has no dark mode; do not add one.
- Both languages hold: `src/localization.ts` carries EN and VI; any spacing or
  type change must survive the longer VI lines (shots are taken in both).
- `src/tokens.ts` is the single source of truth: fixes adjust tokens or
  consume them; no new hardcoded literals where a token exists.

**Scope paths.** `App.tsx`, `components/ChatBubble.tsx`,
`components/PixelPet.tsx` (slot sizing/spacing only — see keep rules),
`src/tokens.ts`. Nothing else without a stated reason.
