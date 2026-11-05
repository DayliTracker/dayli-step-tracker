# QA v1 — issue #45 smooth-art duck frames (PR #46, head `2cc218d`)

Date: 2026-11-05/06 (+07) · Tester lane · device: iPhone 17 simulator, iOS 27.0

## Per-AC results

### AC1 — 7 contract frames + heart/star regenerate as smooth PNGs from committed SVG sources, same filenames ✅
- Provenance: extracted `const DUCK` data URIs from `prototype-merged-shell.html` at
  `5c274676c589421b04999f6a7a8cc3bd12763d7d` (branch `prototype/textless-shell`), percent-decoded
  once, compared bytes: all 9 committed SVGs **IDENTICAL** to the prototype payloads
  (idle, blink, look, happy, surprised, walkA, walkB, heart, star — 9/9).
- `sips -g pixelWidth` on all 9 shipped PNGs: 480×480 RGBA; contact sheet 1120 wide.
- Visual check of `assets/mascots/duck/duck_idle.png` + `contact_sheet.png`: smooth gradients,
  no pixel grid; mint scarf, warm-brown outline per the prototype.

### AC2 — regeneration reproducible from the script with a documented pinned rasterizer invocation ✅
- Pinned invocation documented in `scripts/mascots/build-smooth-frames.sh:14-26`
  (`qlmanage -t -s 480 -o <tmpdir> <file>.svg`).
- Ran `bash scripts/mascots/build-smooth-frames.sh` twice from a clean checkout:
  sha256 of all 10 outputs identical across committed / run 1 / run 2
  (e.g. `duck_idle.png 26f9dcc7…` in all three). `git status --porcelain` empty after both runs.

### AC3 — contact sheet + per-state QA screenshots under docs/mascots/duck/ ✅
- `docs/mascots/duck/qa/` holds `contact_sheet.png` + 10 per-frame PNGs; each byte-identical
  (`cmp`) to the shipped pack in `assets/mascots/duck/`.

### AC4 — duck renders smooth in the running app in every existing state, no PixelPet code change ✅ (5/6 states captured in-app; walk unreachable in-app, pre-existing)
- No component code changed: `git diff origin/main...HEAD --stat -- components/ src/ App.tsx index.ts`
  → empty (`component-diff-empty.txt`).
- Branch build installed on a clean simulator (iPhone 17), Metro serving the branch bundle
  (asset md5 served over HTTP = md5 of the committed PNG, `e6e3d4e5…`).
- Captured in-app (`ac4-*.png`): **idle**, **blink** (eyes closed), **look** (pupils aside),
  **celebrate** (happy frame at 1× of goal), **poke** (surprised frame + heart particle) — all smooth art.
- **Walk state is not triggerable through the current UI** — pre-existing data-model behavior,
  unchanged by this PR: the only progress changes happen on the Manual page
  (`App.tsx:218-228` renders one screen at a time, so Today unmounts on navigation), and a
  remounting Today initializes the mood below 1 as idle (`components/PixelPet.tsx:53`); the walk
  transition needs a rise while mounted (`components/PixelPet.tsx:74-85`). The same limitation is
  recorded in `docs/mascots/duck/qa/README.md` from the phase-1 adoption. The walk frames
  themselves are shipped and byte-verified (AC1/AC2) and render at engine level in the contact sheet.

### AC5 — npm run typecheck and npm test pass ✅
- `npm run typecheck` → exit 0, no output.
- `npm test` → **98/98 pass** (94 pre-existing + 4 new `tests/smooth-frames.test.mjs`).

## Test-gap check
- AC1/AC2 had no automated assertion at any rung (High), AC3's evidence copy was unpinned (Medium).
- Closed by `tests/smooth-frames.test.mjs`: pack completeness + 480px RGBA + pets.ts literal
  filenames + QA-copy byte identity + qlmanage byte-reproducibility (macOS-guarded skip).

## Environment note (not a product bug)
During QA, a parallel lane's `expo run:ios` (worktree `issue-28-qa-before`, Metro :8083) raced the
QA build on the shared booted simulator and its install+launch pointed the app at the wrong
bundler — the first two launch captures showed the old pixel pack from the wrong worktree's
bundle. Resolved by isolating QA on a second simulator with the branch build (app connected to
the branch Metro on :8081; verified via `lsof` + served-asset hash). Shared-simulator races
between parallel lanes can silently cross-serve bundles; QA lanes should prefer a dedicated device.
