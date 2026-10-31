# 0001 — No UI framework: hand-rolled navigation reducer and segment-built ring

- **Status:** Accepted
- **Date:** 2026-10-30
- **Scope:** all client UI work (phases 1–4)

## Context

Phase 1 built the app shell with Expo, React Native, and TypeScript only.
`package.json` depends on exactly four packages (`expo`, `expo-status-bar`,
`react`, `react-native`); no component framework, navigation library, or SVG
library was added. The shell made three library-shaped decisions in code:

- **Navigation** is a pure reducer: `navigate(state, action)` over a
  `Screen` union of six screens (`src/navigation.ts:1`), covering the two
  primary tabs, Settings, and its three destinations (goal, language, health).
  No `expo-router`, no `react-navigation`.
- **The Today progress ring** is built from a fixed ring of `RING_SEGMENTS`
  rotated `View` segments (`src/today.ts:4`), each positioned with a rotate +
  translate transform and lit clockwise from 12 o'clock (`App.tsx:138`).
  No `react-native-svg`.
- **UI primitives** are React Native core `View`/`Text` with StyleSheet
  styles. The duck mascot is a runtime pixel grid of `View`s swapped on goal
  reach (`App.tsx:155`), not an image or Lottie asset.

Typography still needs the standard font set. `expo-font` is planned as the
only UI-adjacent dependency for that work; it is not installed yet.

Later phases (2–4) will keep choosing between adding a library and extending
the reducer, the segments, or the pixel grid. Without a written decision,
each lane can relitigate the choice or quietly contradict it.

## Decision

1. **No component framework.** UI is built from React Native core primitives
   and app-owned styles. Adding any component framework (tamagui, gluestack,
   NativeBase, UI Kitten, …) requires a new ADR first.
2. **Navigation stays a hand-rolled reducer.** New screens extend the
   `Screen` union and add a case to `navigate()` (`src/navigation.ts`).
   Navigation libraries stay out.
3. **The ring stays segment-built.** Progress display extends the segment
   mechanics (`src/today.ts`, `App.tsx` `Ring`). SVG-based rendering stays
   out.
4. **`expo-font` is the only planned UI-adjacent dependency**, added when the
   standard typography work lands. Any dependency beyond it goes through a
   new ADR.

## Consequences

**Positive**

- The dependency surface stays four packages; no framework upgrade churn and
  no library-driven breaking changes across Expo SDK bumps.
- The reducer is pure TypeScript: navigation behaviour is unit-testable with
  `node --test` (`tests/*.test.mjs`) without a device or simulator.
- Rendering, animation, and accessibility behaviour are fully owned by this
  repo, so audit findings get fixed here, not upstream.

**Negative**

- Every new screen is manual work: extend the `Screen` union, add reducer
  cases, wire the back stack by hand.
- Gestures and animation beyond transforms must be hand-rolled with the
  React Native `Animated` API.
- Complex visuals (charts beyond the capped segment fill) have no library
  fallback today; they are revisit triggers below, not silent adds.
- Fonts stay system fonts until the `expo-font` typography work lands.

## Revisit triggers

This is not an open-ended ban. Reopen this decision — with a superseding ADR,
never a silent add — when any of these becomes true:

1. **Gesture-driven navigation.** A flow needs swipe-back stacks,
   shared-element transitions, or deep links that the reducer cannot express
   without reimplementing `react-navigation`.
2. **Complex charts.** A surface needs visuals the segment ring cannot
   express — multi-series lines, axes, or point counts that make 48+ rotated
   views unusable. Candidate then: `react-native-svg` (or a chart library on
   top of it).
3. **A second mascot renderer.** A mascot needs frame-sequenced animation
   timing, Lottie, or per-frame image assets that the runtime pixel grid
   (`App.tsx` `DuckArt`) cannot share.
