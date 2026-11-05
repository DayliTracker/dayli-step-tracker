# Smooth-art duck · SVG sources

Committed vector sources for every PNG the app ships in
`assets/mascots/duck/`. The smooth frames replace the pixel-grid pack; the
user directed the app look the same as the approved prototype (2026-11-05) —
that directive is the art verdict for this frame set (recorded on mascots
#39).

## Provenance

Extracted verbatim from the prototype branch `prototype/textless-shell`,
file `prototype-merged-shell.html` at commit `5c274676c589421b04999f6a7a8cc3bd12763d7d`
("prototype: textless swipe shell v6 — smooth duck"), object `const DUCK`:
each entry is a URI-encoded `data:image/svg+xml` URL; the payloads were
percent-decoded once and saved unchanged (no edits, no re-styling).

| Source file | Prototype key | Shipped PNG |
|---|---|---|
| duck_idle.svg | `idle` | duck_idle.png |
| duck_blink.svg | `blink` | duck_blink.png |
| duck_look.svg | `look` | duck_look.png |
| duck_happy.svg | `happy` | duck_happy.png |
| duck_surprised.svg | `surprised` | duck_surprised.png |
| duck_walk_a.svg | `walkA` | duck_walk_a.png |
| duck_walk_b.svg | `walkB` | duck_walk_b.png |
| particle_heart.svg | `heart` | particle_heart.png |
| particle_star.svg | `star` | particle_star.png |

Extraction command (for re-derivation from the prototype branch):

```
git show origin/prototype/textless-shell:prototype-merged-shell.html \
  | python3 -c "…percent-decode each DUCK entry's data URI…"
```

The committed build script does NOT re-extract — the SVGs above are the
source of truth; the prototype branch is provenance, not a build input.

## Build

```
bash scripts/mascots/build-smooth-frames.sh
```

macOS QuickLook rasterizer, pinned invocation documented in the script
header. Renders every SVG here to a 480px RGBA PNG with the same filename
the app requires (`components/pets.ts`), plus the contact sheet and the QA
evidence copy under `docs/mascots/duck/qa/`.
