# Smooth-art duck pack · QA evidence

Per-frame PNGs + contact sheet rendered from the committed SVG sources by
`scripts/mascots/duck`'s build script (`scripts/mascots/build-smooth-frames.sh`,
pinned librsvg `rsvg-convert` 2.61.0). Each file here is a byte-copy (`cmp`)
of the shipped pack in `assets/mascots/duck/`; the pack tests pin that identity
(`tests/smooth-frames.test.mjs`) along with the transparency contract — every
frame and particle keeps fully transparent corners, the property the retired
QuickLook rasterizer flattened to white (PR #46 rebuild R1).

In-app per-state captures (idle, blink, look, celebrate, poke on device or
simulator) live under `docs/super-board/runs/issue-45-qa-v*/`.

The pre-smooth pixel-era in-app shots from the phase-1 adoption are archived,
annotated as superseded, under `pixel-archive/` — including the engine-lineage
notes on the walk-unreachable limitation (`pixel-archive/README.md`).
