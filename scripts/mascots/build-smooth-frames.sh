#!/usr/bin/env bash
# build-smooth-frames — rasterize the committed smooth-art duck SVG sources
# into the PNG frames the app ships (assets/mascots/duck/*.png).
#
#   bash scripts/mascots/build-smooth-frames.sh
#
# Sources:  assets/mascots/duck/svg/*.svg   (committed; the prototype's smooth
#           frames, extracted once — see svg/README.md for provenance)
# Outputs:  assets/mascots/duck/duck_*.png, particle_*.png  (~480px, same
#           filenames as before — PixelPet/components/pets.ts need no change)
#           assets/mascots/duck/contact_sheet.png            (review sheet)
#           docs/mascots/duck/qa/*.png                       (QA evidence copy)
#
# Pinned rasterizer (build-time only, never shipped):
#   librsvg's rsvg-convert — alpha-preserving by default; invoked as:
#     rsvg-convert -w 480 -h 480 <file>.svg -o <out>.png
#   Pinned version: 2.61.0 (librsvg; this host resolves it at
#   /opt/homebrew/bin/rsvg-convert — the script verifies the version below and
#   refuses to run against any other, so a rasterizer bump is a deliberate
#   re-pin of this header + the version constant, not a silent output change).
#   -w/-h  exact output size (frames and particles are square viewBoxes →
#          480x480 RGBA PNGs); -o writes the exact filename we ship.
#   librsvg composites onto a fully transparent background unless
#   --background-color is passed — the pack keeps the corner alpha the old
#   pixel pack had. (Rebuild R1, review round 1: the previous pinned macOS
#   QuickLook invocation `qlmanage -t -s 480` flattened the background-less
#   SVGs onto opaque white — every corner decoded rgba(255,255,255,255) — so
#   it is retired as this script's rasterizer. The corner-alpha contract is
#   pinned by tests/smooth-frames.test.mjs.)
#
# Regeneration contract: re-running this script from a clean checkout of the
# committed SVGs, with the pinned rasterizer version above, reproduces the
# shipped PNGs byte for byte.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SVG_DIR="$ROOT/assets/mascots/duck/svg"
OUT_DIR="$ROOT/assets/mascots/duck"
QA_DIR="$ROOT/docs/mascots/duck/qa"
FRAME_SIZE=480
SHEET_SIZE=1120   # sheet SVG is 520x520; rendered at 2.15x for review
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
  echo "regenerate the pack, and re-run the pack tests (tests/smooth-frames.test.mjs)" >&2
  exit 1
fi

[ -d "$SVG_DIR" ] || { echo "missing $SVG_DIR" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- 1. render every SVG source to a 480px PNG, named to the pack filename
for svg in "$SVG_DIR"/*.svg; do
  name="$(basename "$svg" .svg)"
  "$RSVG" -w "$FRAME_SIZE" -h "$FRAME_SIZE" "$svg" -o "$OUT_DIR/$name.png"
  echo "rendered $name.png"
done

# --- 2. contact sheet: 3x3 grid (frames 120 native, particles at 48 for
#        visibility) on a square canvas
SHEET="$TMP/contact_sheet.svg"
CELL=160
CANVAS=$((CELL * 3 + 40))   # 520x520, 20px margin
{
  echo '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520">'
  echo '<rect width="520" height="520" fill="#FBF3E4"/>'
  col=0; row=0
  for svg in "$SVG_DIR"/duck_*.svg; do
    x=$((col * CELL + 50)); y=$((row * CELL + 30))
    b64="$(base64 < "$svg" | tr -d '\n')"
    echo "<image x=\"$x\" y=\"$y\" width=\"120\" height=\"120\" href=\"data:image/svg+xml;base64,$b64\"/>"
    col=$((col + 1)); [ "$col" -eq 3 ] && { col=0; row=$((row + 1)); }
  done
  for svg in "$SVG_DIR"/particle_*.svg; do
    x=$((col * CELL + 76)); y=$((row * CELL + 56))
    b64="$(base64 < "$svg" | tr -d '\n')"
    echo "<image x=\"$x\" y=\"$y\" width=\"48\" height=\"48\" href=\"data:image/svg+xml;base64,$b64\"/>"
    col=$((col + 1)); [ "$col" -eq 3 ] && { col=0; row=$((row + 1)); }
  done
  echo '</svg>'
} > "$SHEET"
"$RSVG" -w "$SHEET_SIZE" -h "$SHEET_SIZE" "$SHEET" -o "$OUT_DIR/contact_sheet.png"
echo "rendered contact_sheet.png"

# --- 3. QA evidence copy (per-state + sheet) under docs/mascots/duck/qa/
mkdir -p "$QA_DIR"
for png in "$OUT_DIR"/duck_*.png "$OUT_DIR"/particle_*.png "$OUT_DIR"/contact_sheet.png; do
  cp "$png" "$QA_DIR/$(basename "$png")"
done
echo "qa evidence copied to ${QA_DIR#"$ROOT"/}"
