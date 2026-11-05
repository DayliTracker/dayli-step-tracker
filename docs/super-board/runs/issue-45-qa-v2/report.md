# QA v2 — issue #45 smooth-art duck frames (PR #46, head `bb7bc95`)

Date: 2026-11-06 (+07) · Tester lane · rebuild re-run after review bounce round 1 (R1–R4)
Device: iPhone 17 simulator (77EC52AC), iOS 27.0, app installed from a **Release** build of this
worktree (`npx expo run:ios --configuration Release --no-bundler --device 77EC52AC…`) — the JS
bundle and all 9 pack PNGs are embedded in the .app, so no Metro server can cross-serve another
lane's pack (v1's environment note). Dedicated simulator; the issue-28 lane's build kept its own
device and Metro ports (8081/8082), untouched.

## Review-bounce re-verification (R1–R3)

### R1 — rasterizer re-pin + corner alpha (blocker) ✅ fixed
- `scripts/mascots/build-smooth-frames.sh:14-33` documents the pinned librsvg invocation and
  history; `:42` pins `RSVG_VERSION="2.61.0"`; `:44-56` resolves the binary and **refuses to run**
  on any other version. Host: `/opt/homebrew/bin/rsvg-convert --version` → `rsvg-convert version 2.61.0`.
- Ran `bash scripts/mascots/build-smooth-frames.sh` **twice**: both runs byte-identical to the
  committed pack (`shasum -a 256` of all 10 outputs equal before/after — 10/10, including the sheet).
- Independent corner decode (own PNG decoder, all four corners of all 9 frames/particles):
  every corner decodes **rgba(0,0,0,0)**, 480×480, 8-bit RGBA non-interlaced — the old pixel pack's
  transparency contract, restored (v1 shipped `rgba(255,255,255,255)` on all corners).
- The corner-alpha contract is pinned in the suite (`tests/smooth-frames.test.mjs:136-150`,
  `:171-208` byte-repro under the version guard) — `npm test` runs it green at this head.

### R2 — stale pixel-era QA evidence ✅ fixed
- `docs/mascots/duck/qa/pixel-archive/` holds the four pixel-era in-app shots (`idle/poke/celebrate/walk.png`,
  from `e285831`) with a README that marks them **ARCHIVED — superseded** by the smooth pack and
  points at the current evidence.
- `docs/mascots/duck/qa/README.md` rewritten for the smooth pack: byte-copy contract, the R1
  transparency note, and a pointer to the pixel archive.

### R3 — v1 report head/test-count mismatch ✅ fixed
- `docs/super-board/runs/issue-45-qa-v1/report.md:1` now pins head `74ee9ef`; the rebuild
  annotation (`:5-20`) records the original false pairing (`2cc218d` claimed 98/98 while the 4 new
  tests landed in `d67e5ec`) and marks the AC2/AC4 rows superseded by the rebuild.
- Verified the corrected pairing holds: at `74ee9ef` the suite is the 4-test `smooth-frames` file
  plus the 94 pre-existing tests (98); at this head `bb7bc95` the corner-alpha test brings it to 99.

## Per-AC results (rebuild head `bb7bc95`)

### AC1 — 7 contract frames + heart/star regenerate as smooth PNGs from committed SVG sources, same filenames ✅ (carried from v1, re-verified)
- 9 SVGs committed under `assets/mascots/duck/svg/`; shipped PNGs 480×480 RGBA, same filenames;
  `components/pets.ts` literal requires pinned by the suite. Embedded check: all **9** PNGs inside
  the built `DayliStepTracker.app/assets/assets/mascots/duck/` are byte-identical (sha256) to the
  worktree pack — the app binary itself carries the transparency-fixed frames (`contact_sheet.png`
  is a review artifact, correctly not embedded).

### AC2 — regeneration reproducible from the script with a documented pinned rasterizer invocation ✅
- Two regen runs byte-identical to committed outputs (10/10 sha256) under the version check
  (`RSVG_VERSION="2.61.0"`; run refuses on drift). See R1 above.

### AC3 — contact sheet + per-state QA screenshots under `docs/mascots/duck/` ✅ (carried, R2 re-check)
- `docs/mascots/duck/qa/` holds the sheet + 10 per-frame byte-copies (suite-pinned); pixel-era
  shots archived with README (R2). This folder (`runs/issue-45-qa-v2/`) adds the in-app captures.

### AC4 — the duck renders smooth in the running app in every existing state, no PixelPet code change ✅ (re-verified against the transparency-fixed pack — R4 discipline)
- **No component code change:** `git diff origin/main...HEAD --stat -- components/ src/ App.tsx index.ts` → empty.
- **In-app captures this run** (Release build, embedded pack): idle, blink (eyes closed), look
  (pupils aside), celebrate (happy frame + star particles at 1× of goal), poke (surprised frame +
  hop via `idb ui tap` on the duck). `ac4-*.png` here.
- **Transparency proof in-app (the R4 check):** sampled a 4-point ring just outside the duck's
  silhouette in `ac4-idle.png` — decodes **(255,253,248)**, exactly the Today card surface sampled
  far from the duck. The same ring in v1's `ac4-idle.png` decodes **(255,255,255)** pure white on
  all four points — the flattened white rectangle is gone. Duck bbox identical in both
  (x 426–779), so this is a clean A/B.
- **Walk state not triggerable in-app — pre-existing data-model limit, carried from v1**
  (reviewer round 1 verified the claim true and unchanged). Positive in-app demo this run:
  seeded a manual total of 4,000 (0.5× of goal) and relaunched — Today remounts into the **idle**
  frame (`ac4-walk-unreachable-remount-idle.png`), never walk, because the only progress changes
  happen while Today is unmounted (`App.tsx:283-301` one-screen navigation) and a remounting Today
  initializes its mood from the current reading (`components/PixelPet.tsx:53`, transition at
  `:74-85` needs a rise while mounted). The walk frames ship and are byte-verified (AC1/AC2).

### AC5 — npm run typecheck and npm test pass ✅
- `npm run typecheck` → exit 0. `npm test` → **99/99 pass, 0 skipped** (94 pre-existing + 4 QA-v1
  regression tests + the new corner-alpha pin) at head `bb7bc95`.

## Findings

| ID | Class | Where | Finding | Status |
|---|---|---|---|---|
| F1 | Pre-existing limit (carried from v1) | `App.tsx:283-301`, `components/PixelPet.tsx:53,74-85` | Walk state unreachable through the UI (progress only changes while Today is unmounted; remount initializes below-1 as idle). Verified again in-app v2 with a remount-idle capture. Frames shipped + byte-verified; engine-level rendering visible on the contact sheet. | documented, not PR-blocking |
| F2 | Pre-existing engine quirk (new observation this run) | `components/PixelPet.tsx:296-320` | The poke **heart particle** was not observable in-app in the Release build across ~50 captures (surprised face + hop render; heart absent, incl. tight-loop shots at +360/+780 ms and a pink-pixel scan of every frame; the engine's celebrate **star** particles from the same pack render fine). v1's Debug-build capture (`runs/issue-45-qa-v1/ac4-poke-surprised-heart.png`) shows the heart rendering. Component code is byte-identical to main, so this is not a PR regression and this PR must not touch PixelPet (AC4's own constraint). Logged for the engine lineage (mascots #38) to chase in a Debug-vs-Release pass. | documented, not PR-blocking |

## Test-gap check
AC1–AC3/AC5 map to the suite (filenames, 480px RGBA, corner alpha, QA-copy identity, byte repro,
pets.ts requires). AC4's in-app rendering has no automated rung — it is a visual/simulator
evidence check by nature; the pack contract tests + this folder's captures cover it. F2 would
have been caught earlier only by an in-app particle assertion, which needs a Debug-build harness —
noted for the engine card, not this PR.

## Environment
- Metro: not used (Release build, embedded bundle). Port 8081/8082 belonged to the issue-28 lane
  (their `expo run:ios --configuration Release`), left untouched.
- `idb` HID taps: duck-area taps land; taps near screen edges (tab bar, header) did not register
  in this session — data entry for celebrate was instead seeded via the AsyncStorage document
  (`RCTAsyncLocalStorage_V1/manifest.json`, `dayli.manual-totals.v1` = `{"totals":{"2026-11-06":8000}}`),
  the same read path the app uses for manual totals. Simulator data reset afterwards.
- Simulator app data cleared at the end of the run (no leftover seeded totals).
