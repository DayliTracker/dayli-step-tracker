# Smooth-art duck · SVG particle sources

Committed vector sources for the two PNG sprites the smooth duck ships:
`particle_star.png` and `particle_heart.png` in this directory. The duck
FRAMES no longer come from here (mascots#2): they are rendered by the
vendored smooth engine from `scripts/mascots/packs/smooth-duck.mjs` — the
prototype-matched pack vendored byte-exact from
`DayliTracker/mascots@0459293` (the post-#15 replacement art + the tween
cycles and manifest v2 lineage). The engine pack carries no
particle art, so these two sprites stay SVG-sourced.

## Provenance

Extracted verbatim from the prototype branch `prototype/textless-shell`,
file `prototype-merged-shell.html` at commit `5c274676c589421b04999f6a7a8cc3bd12763d7d`
("prototype: textless swipe shell v6 — smooth duck"), object `const DUCK`:
each entry is a URI-encoded `data:image/svg+xml` URL; the payloads were
percent-decoded once and saved unchanged (no edits, no re-styling). The
prototype's duck-frame SVGs retired with the #45 pack they produced; the
prototype branch remains their provenance.

| Source file | Prototype key | Shipped PNG |
|---|---|---|
| particle_heart.svg | `heart` | particle_heart.png |
| particle_star.svg | `star` | particle_star.png |

## Build

```
bash scripts/mascots/build-smooth-particles.sh
```

librsvg's `rsvg-convert`, version-pinned to **2.61.0** (this host:
`/opt/homebrew/bin/rsvg-convert`), with the pinned invocation documented in
the script header — `rsvg-convert -w 480 -h 480 <file>.svg -o <out>.png`.
Renders every SVG here to a 480px RGBA PNG with the sprite filename the app
requires (`components/pets.ts`). The corner-alpha contract (the retired
qlmanage rasterizer flattened corners to opaque white — PR #46 rebuild R1)
is pinned by `tests/smooth-frames.test.mjs`.

Rasterizer history: this pipeline originally rendered the whole pack
(frames + particles) as `scripts/mascots/build-smooth-frames.sh`; mascots#2
moved the frames to the engine and left the particles here.
