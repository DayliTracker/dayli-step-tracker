# Mascot QA evidence · smooth duck (shipped) + pixel duck (fallback)

The app's mascot QA directory (mascots#2's Gate 3). Two packs ship:

- **Smooth duck** — the shipped default. The prototype-matched pack vendored
  byte-exact from `DayliTracker/mascots@0459293` (the post-#15 replacement
  art + the tween-cycles/manifest-v2 lineage,
  `scripts/mascots/packs/smooth-duck.mjs`), rendered by the vendored smooth
  engine (`scripts/mascots/smooth-engine.mjs`, pinned `@resvg/resvg-js`
  2.6.2) into `assets/mascots/smooth-duck/` — now manifest **v2**: the walk
  cycle ships 8 tween in-betweens the component plays at the manifest fps
  (mascots#19/#20). The engine's `manifest.json` and
  `contact_sheet.png` are the pack's evidence; the validator
  (`scripts/mascots/validate-smooth-frames.mjs`) gates the delivery
  (files · manifest · dimensions · alpha-in-silhouette · registration ·
  byte-for-byte determinism) and is pinned by `tests/smooth-frames.test.mjs`.
- **Pixel duck** — the switchable fallback. The original pack
  (`scripts/mascots/packs/duck.mjs`, byte-identical to mascots@516a5b7's)
  rendered by the zero-dependency pixel engine into
  `assets/mascots/pixel-duck/`, gated by
  `scripts/mascots/validate-frames.mjs` and pinned by
  `tests/pixel-frames.test.mjs`.

## Per-state captures (this directory)

`state-<mood>.png` files are in-app iOS-simulator captures of the SHIPPED
smooth duck playing each mood of the app's repertoire (`components/PixelPet.tsx`):
each is one observable Gate-3 state, committed to the branch as the QA
record. `tests/mascot-qa.test.mjs` pins the captured set.

Captured: `state-idle`, `state-walk`, `state-celebrate`, `state-poke`,
`state-sleep`, `state-hop`, `state-stroll`.

> **Stale on the motion-lineage rebuild (2026-11-11, mascots@0459293):** the
> committed `state-*.png` captures show the v1 (Gate-1) art. The rebuild
> re-vendored the post-#15 replacement art + manifest v2; re-capture on the
> new art is pending QA v2. The idb HID backend was unavailable during the
> rebuild ("dtuhidd connection invalidated"; no GUI Simulator for input
> injection), so moods could not be re-driven — recorded here rather than
> faked. The rebuild's own app-run evidence (new art rendering in-app) is
> under `docs/super-board/runs/issue-2-build-v2/`.

**Not captured — dizzy.** The wiggle verdict needs a multi-reversal drag on
the duck (`isWiggle`: ≥2 direction flips, whole excursion ≤140px,
`src/moods.ts`); the automation backends here (idb taps/swipes, single-stroke
gestures) cannot produce a compliant zigzag, and faking it with a screenshot
of another state would be a false record. The state plays in-app by hand
(wiggle the duck) — drive it manually when verifying on device.

The pre-mascots#2 evidence layout (per-frame byte-copies of the #45
prototype-SVG pack, `today-*.png` shell captures) is superseded: the #45
pack is retired from the app (git history keeps it), and the shell captures
moved under `pixel-archive/`-style provenance notes in the pack READMEs.
The pixel-era in-app shots and engine-lineage notes stay under
`pixel-archive/` (annotated as superseded there, including the walk-unreachable
limitation of the retired 4-state pixel engine generation).
