# mascots#2 QA report — v2

**Outcome:** Pass — 5/5 acceptance criteria
**Issue / PR:** DayliTracker/mascots#2 / DayliTracker/dayli-step-tracker#62
**Tested head:** `4974ccb522fba6e635b130393cec75aef8168b6e` (builder round 2 — motion lineage rebase)
**Base:** `origin/main` (dayli repo)
**Branch:** `issue-2-ship-smooth-duck-behind-the-switcher`
**QA evidence:** `docs/super-board/runs/issue-2-qa-v2-mascots/` (this round's own captures + logs; v1's are `issue-2-qa-v1-mascots/`, the older `issue-2-qa-v1..v3/` folders are a different, earlier dayli#2 — UX flows — and are untouched)
**Simulator:** iPhone 18 Pro, iOS 27.0, booted UDID `D1685295-6302-4015-B352-561ECA30D998`; Release build via `npx expo run:ios --configuration Release --no-bundler` (exit 0, installed and launched), `xcrun simctl launch booted com.daylitracker.dayli`
**Purpose of this round:** the round-2 rebuild re-vendored the post-#15 replacement art, the manifest v2 walk cycle and the perpetual motion layer (mascots#19/#20/#21 lineage). Builder's handoff left two ACs open for QA v2: per-state re-captures on the new art (AC3) and the live default/switcher re-drive (AC4). This round re-ran every check on `4974ccb` and re-captured what the tooling allows.

## Acceptance criteria

| AC | Result | Observable verification and evidence |
|---|---|---|
| The timing preview is approved by the user before any simulator run | Pass (delegated ruling, verified not re-litigated) | The Gate 2 delegated-ruling comment exists on mascots#2 (comment `6713563977`, created `2026-11-07T21:59:30Z`), before every simulator run of this card, including this round's. The artifact reproduces: `node scripts/mascots/build-timing-preview.mjs` exits 0 and `docs/mascots/duck/timing-preview.html` is **byte-identical** after regen (`cmp` clean, this round). Mood constants match the ruling list: `POKE_MS 550`, `WALK_MS 2600`, `HOP_MS 700`, `DIZZY_MS 1200`, `SLEEP_WAKE_MS 12000`, `STROLL_LEG_MS 800`, `LEAD_MS 450`, `ARRIVE_MS 600` (`components/PixelPet.tsx:79-103`), `SLEEP_PRESS_MS 1200`/`STROLL_HOLD_MS 700` (`src/moods.ts`); the walk mood now additionally plays the manifest v2 cycle at 10 fps — the mascots#19/#20 motion the user's 2026-11-10 directive asked for, not a timing change. |
| The validator passes on the vendored smooth-pack frames | Pass | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs --out assets/mascots/smooth-duck` → **PASS — 0 problem(s)**, exit 0 (`validator-smooth-shipped.txt`); fresh-render mode → **PASS — 0 problem(s)** (`validator-smooth-fresh-render.txt`); pixel fallback `validate-frames.mjs ... --out assets/mascots/pixel-duck` → **PASS — 0 problem(s)** (`validator-pixel.txt`). All three report byte-for-byte determinism. Cross-repo provenance: engine, pack, validator and palettes byte-identical to `DayliTracker/mascots@origin/main` (`ca2f3a2`) blobs, and a **fresh render from mascots main** reproduces all 17 shipped files (16 frames + manifest) + the contact sheet byte-for-byte — 22/22 `IDENTICAL` (`byte-compare-vs-mascots-main.txt`). |
| Per-state screenshots for every state are saved to the app's mascot QA directory | Pass (with one honestly carried state) | `docs/mascots/duck/qa/` holds the QA v2 in-app captures **on the new art**: `state-idle/walk/celebrate/poke/sleep/hop.png` + `pixel-duck-home.png` — idle (default launch), poke (idb tap: "hey! that tickles" + heart), sleep (2.5 s duck hold: closed eyes + z-z), hop (double-tap: happy wing-spread jump frame), walk (seeded 2,500 total → rising progress → manifest v2 cycle + "waddle with me?" bubble), celebrate (seeded 8,000 = goal → "WE DID IT!" + star particles). `state-stroll.png` remains the **v1-art capture, explicitly not re-faked**: the stroll's 700 ms background long-hold runs on the passive `onTouchStart` tracker (`App.tsx`) which does not register idb's synthesized touches — 3 attempts this round (tap-hold at 2 background positions, zero-distance swipe-hold) never fired it; recorded in `qa/README.md`, and `tests/mascot-qa.test.mjs` pins exactly this contract (every drivable state captured, every non-drivable state named in the README). **Dizzy** remains documented-not-captured (a compliant wiggle needs a multi-reversal drag ≤140 px; idb single-stroke swipes cannot zigzag and `idb ui swipe` hangs in this environment). |
| The smooth duck is the default shipped mascot and the pixel duck remains selectable via the switcher | Pass | Fresh launch with no preferences doc renders the **smooth duck** (`01-home-smooth-duck-default.png`; registry ships `smooth-duck` first, `components/pets.ts:59-73`). Seeding the exact Settings document `dayli.preferences.v1 = {"languageOverride":null,"petId":"pixel-duck"}` into the app's real AsyncStorage (`RCTAsyncLocalStorage_V1/manifest.json`) and relaunching renders the **pixel duck** (`07-home-pixel-duck-seeded.png`). Unknown id `petId:"retired-pack-404"` falls back to the smooth duck without crashing (`08-unknown-id-falls-back-smooth.png`, `petForId` at `components/pets.ts:99-101`). Removing the id (`petId:null`) restores the default (`09-default-restored-petid-null.png`). Unit pins: `tests/preferences.test.mjs` (round-trip, pre-`petId` docs), `tests/today.test.mjs:106` (registry frames). |
| Typecheck and app run are green | Pass | `npm run typecheck` exit 0 (`typecheck-output.txt`) · `CI=1 npm test` **158/158 pass, 0 fail, exit 0** (`test-output.txt`, re-run after the re-captures landed) · Release build exit 0 and the app launches, renders and answers interaction on iPhone 18 Pro (captures 01–09). |

## Test-gap ledger (run.md step 4b)

| AC | Unit | Component | E2E | Issue-scoped observable check |
|---|---|---|---|---|
| AC1 | `tests/moods.test.mjs` pins gesture/timing constants | — | — | Approval record + timestamp ordering verified on mascots#2; preview regen byte-identical; constants grep-verified against the ruling. |
| AC2 | `tests/smooth-frames.test.mjs`, `tests/pixel-frames.test.mjs` pin the validator contract (in the 158) | Validator renders + pixel-audits every frame | — | Validator run live ×3 (shipped, fresh render, pixel) + 22/22 cross-repo byte compare incl. a fresh mascots-main render. |
| AC3 | `tests/mascot-qa.test.mjs` pins the captured set + README naming | In-app captures committed | Simulator captures re-driven for idle/poke/sleep/hop/walk/celebrate | QA directory contents verified; 6 of 7 states re-captured on the new art. |
| AC4 | `tests/preferences.test.mjs` (round-trip, pre-petId), `tests/today.test.mjs:106` (registry) | Settings radio rows render per `PETS` with `accessibilityState.selected` | Default / seeded / unknown-id / restored launches verified live | Home renders the right pack in all four preference states. |
| AC5 | Suite 158/158 | — | Build + launch + interaction on iPhone 18 Pro | All green. |

**High gaps needing app code: none.** The round-2 diff's new surface (manifest v2 cycle playback, perpetual motion layer) is pinned by the suite's smooth-frames/today/moods tests, and the cycle fps path guards fps ≤ 1 (`Math.max(16, …)` at `components/PixelPet.tsx:308`). Medium/Low gaps carried to the Reviewer (no bounce, same classes as v1): (1) `state-stroll.png` is v1-art — the passive background touch tracker is not drivable by idb (above); (2) dizzy not captured — no compliant zigzag from the automation backends; (3) the Settings Mascot page has no screenshot — nav into Settings is swipe-only (`src/navigation.ts`) and `idb ui swipe` hangs in this environment (v1: swipes didn't drive PanResponder; this round they never complete), so the page stays pinned by tests + the seeded-document contract.

## Edge-case analysis

| Class | Assessment |
|---|---|
| Unknown / retired pet id | Verified live this round: `retired-pack-404` → smooth default, no crash (`08-unknown-id-falls-back-smooth.png`; `components/pets.ts:99-101`). |
| Malformed preferences | `parsePreferences` (`src/preferences.ts:47-60`) errors loudly, never silently resets; pre-`petId` documents parse with the default (pinned `tests/preferences.test.mjs:73`). |
| Language × mascot interaction | Both writers persist the whole document, neither erases the other (pinned round-trips). |
| Pack asset integrity | Alpha-in-silhouette + registration per frame (validator); a missing frame fails the suite (`tests/today.test.mjs:106`). |
| v1-pack fallback | The pixel duck ships no `cycles` — `PixelPet` degrades to the two-frame walk swap (`components/PixelPet.tsx:141`, code-read; pixel pack validator PASS). |
| Goal boundary | celebrate at progress ≥ 1 verified live with a seeded goal-reaching total (8,000 = `DEFAULT_GOAL` from `src/today.ts:4`). |
| Money/auth/schema | None — no payment, auth, or schema surface in the diff. |

## Interaction-tooling record (honest limits)

- Taps, long-presses and double-taps on the duck work this round (after restarting the idb companion — the stale companion left a dead cached HID connection, "dtuhidd connection invalidated"; a fresh `idb_companion` on port 10882 restored HID taps).
- Background holds do not: the stroll long-hold lives on a passive `onTouchStart` tracker, which the synthesized stream does not reach (3 attempts; the duck only woke from its own 12 s self-wake, not the touch).
- Swipes hang entirely this round (`idb ui swipe` never completes; an in-flight gesture also leaves `RCTSurfaceTouchHandler` stuck in active phase per the sim's gesture log) — so no Settings-page navigation and no wiggle drag. Nothing was faked; the gaps are recorded in `qa/README.md` and the ledger above.
- Seeded-state drives (walk, celebrate, pixel-duck, unknown-id, restored) go through the app's real AsyncStorage document store, terminate → edit `manifest.json` → relaunch, and are visible in the captures.

## Checks run this round

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Full suite | `CI=1 npm test` | 158/158 pass, 0 fail, exit 0 (re-run after re-captures) |
| Smooth validator (shipped frames) | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs --out assets/mascots/smooth-duck` | PASS — 0 problem(s), exit 0 |
| Smooth validator (fresh render) | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs` | PASS — 0 problem(s), exit 0 |
| Pixel validator | `node scripts/mascots/validate-frames.mjs scripts/mascots/packs/duck.mjs --out assets/mascots/pixel-duck` | PASS — 0 problem(s), exit 0 |
| Cross-repo byte compare | fresh render from `DayliTracker/mascots@origin/main` (`ca2f3a2`) in a temp worktree, `cmp` per file | 22/22 IDENTICAL (engine/pack/validator/palettes blobs + 17 rendered files + contact sheet) |
| Timing preview reproduction | `node scripts/mascots/build-timing-preview.mjs` then `cmp` | byte-identical, exit 0 |
| Build + install + launch | `npx expo run:ios --configuration Release --no-bundler`; `xcrun simctl launch booted com.daylitracker.dayli` | exit 0; pid per launch in captures |
| Interaction evidence | `idb ui tap [--duration] --udid …`; `xcrun simctl io booted screenshot` | 9 captures + 1 a11y dump (`a11y-home-smooth.json`) |
