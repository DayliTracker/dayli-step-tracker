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
#   macOS QuickLook, invoked as:
#     qlmanage -t -s 480 -o <tmpdir> <file>.svg
#   -t  produce one thumbnail per input
#   -s 480  fit the longest edge to 480px (frames and particles are square
#           viewBoxes → 480x480 RGBA PNGs)
#   -o <tmpdir>  write <file>.svg.png next to nothing we ship
#   qlmanage names output "<basename>.svg.png"; this script renames it to the
#   pack filename. macOS-only by design (the repo targets iOS first); the
#   mascots-repo production engine (#38) supersedes this script later.
#
# Regeneration contract: re-running this script from a clean checkout of the
# committed SVGs reproduces the shipped PNGs with the pinned invocation above.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SVG_DIR="$ROOT/assets/mascots/duck/svg"
OUT_DIR="$ROOT/assets/mascots/duck"
QA_DIR="$ROOT/docs/mascots/duck/qa"
SHEET_SIZE=1120   # sheet SVG is 520x520; -s 1120 renders it ~2.2x for review

command -v qlmanage >/dev/null 2>&1 || { echo "qlmanage not found — macOS only" >&2; exit 1; }
[ -d "$SVG_DIR" ] || { echo "missing $SVG_DIR" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- 1. render every SVG source to a 480px PNG, renamed to the pack filename
for svg in "$SVG_DIR"/*.svg; do
  name="$(basename "$svg" .svg)"
  qlmanage -t -s 480 -o "$TMP" "$svg" >/dev/null 2>&1
  mv "$TMP/$name.svg.png" "$OUT_DIR/$name.png"
  echo "rendered $name.png"
done

# --- 2. contact sheet: 3x3 grid (frames 120 native, particles at 48 for
#        visibility) on a square canvas — qlmanage pads non-square sheets
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
qlmanage -t -s "$SHEET_SIZE" -o "$TMP" "$SHEET" >/dev/null 2>&1
mv "$TMP/contact_sheet.svg.png" "$OUT_DIR/contact_sheet.png"
echo "rendered contact_sheet.png"

# --- 3. QA evidence copy (per-state + sheet) under docs/mascots/duck/qa/
mkdir -p "$QA_DIR"
for png in "$OUT_DIR"/duck_*.png "$OUT_DIR"/particle_*.png "$OUT_DIR"/contact_sheet.png; do
  cp "$png" "$QA_DIR/$(basename "$png")"
done
echo "qa evidence copied to ${QA_DIR#"$ROOT"/}"
