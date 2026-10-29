# Phase 1: Foundation and experience

## Purpose

Turn the product requirements into an agreed, accessible UI/UX design and a
coherent app shell for the Today, Progress, and Settings experiences. This
phase focuses on navigation and presentation; local data rules and health
integration are implemented in later phases.

The screen-flow and visual-system handoff is documented in
[`phase-01-ux-design.md`](./phase-01-ux-design.md).

## Dependencies

- The project scaffold described as complete in Todo 2 of [`../plan.md`](../plan.md).
- Phase 1 and Phase 2 are independent after the scaffold and may proceed in
  parallel. Phase 3 may also proceed after Phase 2 without waiting for this
  phase, as specified by the source plan's dependency graph.

## Plan

1. Trace the required user journeys from the source plan:
   - Open Today and understand the current step total, goal, progress, and
     measurement source.
   - Move between Today and Progress.
   - Open Settings from either primary tab.
   - Inspect the most recent seven device-local dates and reach the manual
     total controls that Phase 2 will implement.
2. Inventory existing app entry points, navigation dependencies, fonts, and
   assets before choosing how to extend the scaffold.
3. Keep the scope to the two primary tabs and Settings access. Do not add
   onboarding complexity, streaks, reminders, rewards, individual walk/run
   logs, or other features excluded by the source plan.
4. Agree on the design artifacts and review them against the product rules
   before building the screen shell.

## Design

1. Map the user journeys and produce screen-flow diagrams for Today, Progress,
   and Settings entry points.
2. Specify wireframes and component-level behavior for:
   - **Today:** step total, default goal of 8,000, progress ring, source label,
     and an original pixel-art character.
   - **Progress:** seven device-local dates, daily total, that date's goal and
     source, and the space and interaction affordances for manual-entry
     controls.
   - **Settings:** a route reachable from both tabs, with clear destinations
     for goal, language, health access, and confirmed clear-data settings.
3. Define empty, loading, unavailable, and error presentation slots without
   conflating their meanings. Phase 3 supplies health-specific states; Phase 2
   supplies local-data and language behavior.
4. Define the visual system from the palette, typography, and rounded-card
   direction in the source plan. Treat any reference as inspiration, not as
   source artwork; create original layouts and original character art.
5. Check hierarchy, contrast, touch-target sizing, screen-reader labels, text
   scaling, and narrow-screen behavior. Review both English and Vietnamese
   strings for wrapping, clipping, and layout expansion.
6. Document how the progress ring is to communicate the specified behavior:
   clockwise fill, visually capped at the goal, while the exact step count and
   uncapped ratio remain available as text or accessible values.

## Implement

1. Add or refine navigation for the Today and Progress tabs and a Settings
   route accessible from both.
2. Build reusable visual primitives only where they support these screens;
   avoid a generalized component framework unrelated to the product.
3. Implement the screen shells and visual states against the approved design.
   Connect real local and health data in their owning phases rather than
   presenting placeholder values as live data.
4. Create original pixel-art character artwork and integrate it without
   replacing or altering unrelated app assets.
5. Keep content and labels ready for the bilingual behavior in Phase 2; do not
   bake English-only text into reusable screen components.

## Test

1. Verify that Today and Progress are reachable through the primary
   navigation and Settings is reachable from each.
2. Verify layout behavior at supported device sizes and larger text settings;
   check for clipped labels, inaccessible controls, and overlapping content.
3. Verify that the progress ring is clockwise and visually capped while
   accessible and visible values can still express the exact total and
   uncapped ratio.
4. Check contrast, focus/navigation order, screen-reader names and values, and
   touch-target usability for each interactive element.
5. Review the screens with representative short and long English and
   Vietnamese strings. Confirm that translated text can be injected by the
   localization layer added in Phase 2.
6. Record screenshots or equivalent review evidence for the agreed screen
   states. Do not use a screenshot alone as evidence for interaction or
   accessibility behavior.

## Deploy

1. Run the repository's existing checks and produce an installable iOS
   Simulator development build using the project's supported Expo workflow.
2. Verify navigation, layout, and asset loading in the iOS Simulator after
   the Phase 1 implementation tickets land.
3. Record build configuration or installation blockers for resolution; do not
   claim native health verification in this phase.
4. Do not publish a store release or create cloud infrastructure as part of
   this phase.

## Exit criteria

- The agreed screen-flow and UI/UX artifacts cover Today, Progress, and
  Settings access from both tabs.
- The screen shell implements the approved hierarchy and original visual
  direction without introducing excluded product features.
- Navigation, responsive layout, accessibility, and bilingual layout checks
  pass with recorded iOS Simulator evidence.
- The source plan's exact display and progress-ring rules are preserved.

## Risks and verification notes

- The source plan is the authority for product behavior. If a design decision
  appears to contradict it, resolve that contradiction before implementation.
- Phase 1 must not make fake values look like real Health or manual totals.
- Health permission prompts, live refresh, and platform health data are outside
  this phase and must be verified in Phase 3.
- Simulator checks in this phase do not establish live HealthKit coverage.
