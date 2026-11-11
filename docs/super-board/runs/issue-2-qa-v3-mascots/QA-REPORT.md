# mascots#2 QA report — v3

**Outcome:** Pass — 5/5 acceptance criteria (R1 fix verified; nothing re-opened)
**Issue / PR:** DayliTracker/mascots#2 / DayliTracker/dayli-step-tracker#62
**Tested head:** `a9717ae1b15ce176f73454ad63ed504eb7d22ed2` (builder round 3 — R1 fix)
**Base:** `origin/main` (dayli repo, `32ced8f` — the branch's merge-base is main's head)
**Branch:** `issue-2-ship-smooth-duck-behind-the-switcher`
**QA evidence:** `docs/super-board/runs/issue-2-qa-v3-mascots/` (this round's logs + report). v1/v2 evidence (`issue-2-qa-v1-mascots/`, `issue-2-qa-v2-mascots/`) stands unchanged; the older `issue-2-qa-v1..v3/` folders are a different, earlier dayli#2 — UX flows — untouched.
**Purpose of this round:** verify the round-3 rebuild. The round-3 delta is exactly two files (both vendored copies of `scripts/mascots/validate-frames.mjs`, +40/−12 — `git diff --stat c5567db..a9717ae`), fixing review R1 (stale pixel-validator vendor). No runtime, component or asset file changed since the QA-v2 head `c5567db`, so v2's visual and live-drive evidence carries; this round re-runs every executable check at the new head and re-proves the R1 fix byte-for-byte and behaviorally.

## Acceptance criteria

| AC | Result | Observable verification and evidence |
|---|---|---|
| The timing preview is approved by the user before any simulator run | Pass (delegated ruling, verified not re-litigated) | The Gate 2 delegated-ruling comment exists on mascots#2 (comment `6713563977`, created `2026-11-07T21:59:30Z`), before every simulator run of this card. The artifact reproduces this round: `node scripts/mascots/build-timing-preview.mjs` exit 0 and `docs/mascots/duck/timing-preview.html` byte-identical after regen (sha256 compared pre/post). Constants re-read this round and matching the ruling: `WALK_MS 2600`, `POKE_MS 550`, `LEAD_MS 450`, `ARRIVE_MS 600` (`components/PixelPet.tsx:79-82`), `SLEEP_PRESS_MS 1200`, `STROLL_HOLD_MS 700` (`src/moods.ts:9,14`); the perpetual-motion constants (`BREATH_*`, `SWAY_*`, `WEIGHT_*`, `components/PixelPet.tsx:83-91`) are the mascots#21 layer, not a timing change. |
| The validator passes on the vendored smooth-pack frames | Pass | Re-run at `a9717ae`, all exit 0 / **PASS — 0 problem(s)**: smooth shipped (`validator-smooth-shipped.txt`), smooth fresh-render with the fallback firing (`validator-smooth-fresh-render.txt`), pixel shipped (`validator-pixel-shipped.txt`), pixel bare-run fresh-checkout fallback (`validator-pixel-fallback.txt` — first line "no frames in … packs — validating a fresh render of the pack"). Cross-repo provenance re-checked this round: all 7 vendored blobs (`engine.mjs`, `smooth-engine.mjs`, `validate-frames.mjs`, `validate-smooth-frames.mjs`, `packs/duck.mjs`, `packs/smooth-duck.mjs`, `palettes.json`) `cmp`-**IDENTICAL** to `DayliTracker/mascots@ca2f3a2` (`byte-compare-blobs-vs-mascots-ca2f3a2.txt`); the 22/22 fresh-render compare (assets) is v2's evidence at unchanged assets. |
| Per-state screenshots for every state are saved to the app's mascot QA directory | Pass (with the same honestly carried limits as v2 — R2, non-blocking) | `docs/mascots/duck/qa/` holds 7 in-app state captures + `pixel-duck-home.png`; QA v2 re-captured 6 states + pixel home on the motion-lineage art @ `c5567db`. This round verified the files are on the branch and nothing in the round-3 delta can change rendering (2-file diff, both dev-time validator scripts). `state-stroll.png` remains v1-art and dizzy stays documented-not-captured — the same honest, recorded idb tooling limits (`docs/mascots/duck/qa/README.md`), pinned by `tests/mascot-qa.test.mjs`. |
| The smooth duck is the default shipped mascot and the pixel duck remains selectable via the switcher | Pass | Code re-read at `a9717ae`: `PETS[0]` = `smooth-duck` (with `cycles`), `PETS[1]` = `pixel-duck` (`components/pets.ts:81-94`); `DEFAULT_PET_ID = PETS[0].id` and `petForId` resolves unknown/missing ids to `PETS[0]` (`components/pets.ts:96-99`). Live-drive evidence stands from QA v2 @ `c5567db` (fresh launch → smooth default; seeded `pixel-duck` → pixel; `retired-pack-404` → smooth fallback; `petId:null` → default restored — captures 01/07/08/09) — the round-3 delta adds no app code, so that evidence describes this head's runtime. |
| Typecheck and app run are green | Pass (typecheck + suite re-run this round; build/launch evidence carried) | `npm run typecheck` exit 0 (`typecheck-output.txt`) · `CI=1 npm test` **158 pass / 0 fail, exit 0** (`test-output.txt`) — both re-run at `a9717ae` in a fresh worktree with a clean `npm ci`. The two changed files are dev-time validator scripts (no app-source reference: `grep` over `components/ src/ App.tsx index.ts` finds none), so the Release-build + live-launch evidence from v2 @ `c5567db` describes this head's shipped behavior. |

## R1 fix verification (round-3 delta)

| Check | Result |
|---|---|
| `cmp` vendored `scripts/mascots/validate-frames.mjs` vs `mascots@ca2f3a2:skills/mascot/scripts/validate-frames.mjs` | IDENTICAL (sha256 `9511d3cf006da096c06f8a75db22625ca32c9072f2faf845c74574b868f73150`) |
| `cmp` vendored `.agents/skills/mascot/scripts/validate-frames.mjs` vs the same source | IDENTICAL (same sha256) |
| Fresh-checkout fallback present in the vendored copy | Yes — header comment lines 5-6, `no frames in …` log line 78, temp-render + compare at lines 167-171 |
| Behavioral: bare `node scripts/mascots/validate-frames.mjs scripts/mascots/packs/duck.mjs` (no `--out`) | fallback fires, **PASS — 0 problem(s)**, exit 0 |

R1's defect (validator byte-matched pre-`a9ab92d` mascots and lacked the fallback) is gone: the vendored copies now byte-match `ca2f3a2` and the fallback runs and passes. R1 is ✅ fixed.

## Test gaps (not written)

No new gaps this round. Carried from v2 (unchanged classes, non-blocking): stroll capture is v1-art (passive `onTouchStart` not drivable by idb), dizzy not captured (no compliant zigzag backend), Settings Mascot page has no screenshot (swipe-only nav; `idb ui swipe` hangs) — all recorded in `docs/mascots/duck/qa/README.md` and pinned by `tests/mascot-qa.test.mjs`.

## Simulator note (honest scope)

No simulator re-drive this round: `git diff --name-only c5567db..a9717ae` shows the only changes are `scripts/mascots/validate-frames.mjs` and `.agents/skills/mascot/scripts/validate-frames.mjs` — QA-time tooling, not bundled app code — so a re-drive would re-verify code identical to what v2 drove live. The suite, typecheck and all four validator modes were re-run at this head instead.

## Checks run this round

| Check | Command | Result |
|---|---|---|
| R1 byte-compare ×2 | `cmp` vendored validators vs `mascots@ca2f3a2` blob | IDENTICAL ×2 |
| Pixel validator (fresh-checkout fallback) | `node scripts/mascots/validate-frames.mjs scripts/mascots/packs/duck.mjs` | fallback fires · PASS — 0 problem(s) · exit 0 |
| Pixel validator (shipped) | `node scripts/mascots/validate-frames.mjs scripts/mascots/packs/duck.mjs --out assets/mascots/pixel-duck` | PASS — 0 problem(s) · exit 0 |
| Smooth validator (shipped) | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs --out assets/mascots/smooth-duck` | PASS — 0 problem(s) · exit 0 |
| Smooth validator (fresh render) | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs` | fallback fires · PASS — 0 problem(s) · exit 0 |
| Vendored blob compare (7 files) | `cmp` per file vs `mascots@ca2f3a2` | 7/7 IDENTICAL |
| Timing preview reproduction | `node scripts/mascots/build-timing-preview.mjs` + sha256 pre/post | byte-identical · exit 0 |
| Full suite | `CI=1 npm test` | 158 pass / 0 fail · exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
