#!/usr/bin/env bash
# build-smooth-particles — rasterize the committed smooth-art particle SVG
# sources into the PNG sprites the smooth duck ships
# (assets/mascots/smooth-duck/particle_*.png).
#
#   bash scripts/mascots/build-smooth-particles.sh
#
# The duck FRAMES are no longer rendered here (mascots#2): they come from the
# vendored smooth engine —
#   node scripts/mascots/smooth-engine.mjs scripts/mascots/packs/smooth-duck.mjs \
#     --out assets/mascots/smooth-duck
# — and the engine's contact sheet + manifest.json are the pack's evidence.
# Only the two particles still render from committed SVG sources (below),
# because the engine pack carries no particle art.
#
# Sources:  assets/mascots/smooth-duck/svg/particle_*.svg   (committed; the
#           prototype's smooth particles — see svg/README.md for provenance)
# Outputs:  assets/mascots/smooth-duck/particle_*.png  (480px RGBA, byte-exact)
#
# Pinned rasterizer (build-time only, never shipped):
#   librsvg's rsvg-convert — alpha-preserving by default; invoked as:
#     rsvg-convert -w 480 -h 480 <file>.svg -o <out>.png
#   Pinned version: 2.61.0 (librsvg; this host resolves it at
#   /opt/homebrew/bin/rsvg-convert — the script verifies the version below and
#   refuses to run against any other, so a rasterizer bump is a deliberate
#   re-pin of this header + the version constant, not a silent output change).
#   librsvg composites onto a fully transparent background unless
#   --background-color is passed — the sprites keep the corner alpha the
#   engine frames have. (Rebuild R1, review round 1 of the #45 pack: the
#   previously pinned macOS QuickLook invocation `qlmanage -t -s 480`
#   flattened the background-less SVGs onto opaque white — every corner
#   decoded rgba(255,255,255,255) — so it is retired. The corner-alpha
#   contract is pinned by tests/smooth-frames.test.mjs.)
#
# Regeneration contract: re-running this script from a clean checkout of the
# committed SVGs, with the pinned rasterizer version above, reproduces the
# shipped PNGs byte for byte.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SVG_DIR="$ROOT/assets/mascots/smooth-duck/svg"
OUT_DIR="$ROOT/assets/mascots/smooth-duck"
FRAME_SIZE=480
RSVG_VERSION="2.61.0"

# --- resolve the pinned rasterizer, then pin-check its version
RSVG="$(command -v rsvg-convert 2>/dev/null || true)"
if [ -z "$RSVG" ] && [ -x /opt/homebrew/bin/rsvg-convert ]; then
  RSVG=/opt/homebrew/bin/rsvg-convert
fi
[ -n "$RSVG" ] || { echo "rsvg-convert not found — install librsvg (brew install librsvg)" >&2; exit 1; }
GOT_VERSION="$("$RSVG" --version | awk '{print $NF}')"
if [ "$GOT_VERSION" != "$RSVG_VERSION" ]; then
  echo "rasterizer version drift: found rsvg-convert $GOT_VERSION, pin is $RSVG_VERSION" >&2
  echo "re-pin deliberately: update RSVG_VERSION and the header invocation in this script," >&2
  echo "regenerate the sprites, and re-run the pack tests (tests/smooth-frames.test.mjs)" >&2
  exit 1
fi

[ -d "$SVG_DIR" ] || { echo "missing $SVG_DIR" >&2; exit 1; }

# --- render every particle SVG source to a 480px PNG, named to the sprite
for svg in "$SVG_DIR"/particle_*.svg; do
  name="$(basename "$svg" .svg)"
  "$RSVG" -w "$FRAME_SIZE" -h "$FRAME_SIZE" "$svg" -o "$OUT_DIR/$name.png"
  echo "rendered $name.png"
done
