# mascots#2 QA report — v1

**Outcome:** Pass — 5/5 acceptance criteria
**Issue / PR:** DayliTracker/mascots#2 / DayliTracker/dayli-step-tracker#62
**Tested head:** `616a737657e1189f88413017bf477306dafdaa68`
**Base:** branch cut at `4e101c5`; `origin/main` has since moved to `5989985` (#20's merge — the merge gate owns the rebase; App.tsx is touched by both)
**Branch:** `issue-2-ship-smooth-duck-behind-the-switcher`
**QA evidence:** `docs/super-board/runs/issue-2-qa-v1-mascots/` (this round's own captures; the older `issue-2-qa-v1..v3/` folders are a different, earlier dayli#2 — UX flows — and are untouched)
**Simulator:** iPhone 18 Pro, iOS 27.0, booted UDID `D1685295-6302-4015-B352-561ECA30D998`; Release build via `npx expo run:ios --configuration Release --no-bundler` (Build Succeeded, 0 errors), installed and launched with `xcrun simctl launch booted com.daylitracker.dayli`

## Acceptance criteria

| AC | Result | Observable verification and evidence |
|---|---|---|
| The timing preview is approved by the user before any simulator run | Pass (delegated ruling, verified not re-litigated) | The Gate 2 delegated-ruling comment exists on mascots#2 (comment `6713563977`, created `2026-11-07T21:59:30Z`), BEFORE the commit carrying the simulator captures (`616a737`, `2026-11-07T22:13:26Z`) and the PR (opened `22:22:24Z`). The ruling cites the run's standing user directive and the mascots#3 Gate 1 precedent. The artifact reproduces: `node scripts/mascots/build-timing-preview.mjs` regenerates `docs/mascots/duck/timing-preview.html` byte-for-byte (`git diff` empty after regen, 353666 bytes, 7 frames embedded). Per the wave brief the Gate 1 verdict (mascots#3) is recorded and not re-litigated; QA verifies the approval record and its ordering, nothing more. |
| The validator passes on the vendored smooth-pack frames | Pass | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs --out assets/mascots/smooth-duck` → **PASS — 0 problem(s)** (files · manifest · 512 canvas · alpha-in-silhouette · registration · determinism re-render byte-for-byte); fresh-render mode also PASS (`validator-smooth-fresh-render.txt`). Vendoring provenance: `scripts/mascots/packs/smooth-duck.mjs`, `scripts/mascots/smooth-engine.mjs`, and `assets/mascots/smooth-duck/contact_sheet.png` are **byte-identical** to `DayliTracker/mascots@516a5b7` (`skills/mascot/scripts/packs/smooth-duck.mjs`, its engine, `docs/demo/smooth-duck-contact-sheet.png`) — `byte-compare-vs-mascots-516a5b7.txt`. The pixel fallback validator also PASSes (`validator-pixel.txt`). |
| Per-state screenshots for every state are saved to the app's mascot QA directory | Pass | `docs/mascots/duck/qa/` holds committed in-app captures `state-idle/walk/celebrate/poke/sleep/hop/stroll.png` + `pixel-duck-home.png` (verified on the branch). The 8th mood, dizzy, is **documented, not faked**: the wiggle verdict needs a multi-reversal drag no CLI backend can synthesize (`docs/mascots/duck/qa/README.md`), and `tests/mascot-qa.test.mjs` pins exactly this contract — every drivable state captured, every non-drivable state named in the README. QA reproduced moods live: poke (`04-duck-poke-tap.png`), sleep (`05-duck-sleep-hold.png`) captured fresh this round. |
| The smooth duck is the default shipped mascot and the pixel duck remains selectable via the switcher | Pass | Default: fresh launch (no preferences doc) renders the **smooth duck** (`01-home-smooth-duck-default.png`); registry ships `smooth-duck` first (`components/pets.ts:59-73`, `DEFAULT_PET_ID = PETS[0].id`). Switcher persistence contract verified end-to-end through the app's real AsyncStorage: seeding `dayli.preferences.v1 = {"petId":"pixel-duck"}` (the exact document the Settings radio rows write via `savePreferences`) and relaunching renders the **pixel duck** (`07-home-pixel-duck-seeded.png`); removing the key restores the smooth default (`09-default-restored-stroll-hold.png`). Bonus safety check: `petId:"retired-pack-404"` falls back to the smooth duck without crashing (`08-unknown-id-falls-back-smooth.png`), matching `petForId` (`components/pets.ts:76-78`). UI pins: `tests/today.test.mjs:106-134` (both packs' frames mount in the registry), `tests/preferences.test.mjs:73` (choice survives restart; pre-`petId` docs parse). |
| Typecheck and app run are green | Pass | `npm ci --silent` exit 0 · `npm run typecheck` exit 0 (`typecheck-output.txt`) · `CI=1 npm test` **144/144 pass, 0 fail** (`test-output.txt`) · Release build succeeded (0 errors) and the app launches, renders, and answers interaction on the simulator (captures `01`–`09`). |

## Test-gap ledger (run.md step 4b)

| AC | Unit | Component | E2E | Issue-scoped observable check |
|---|---|---|---|---|
| AC1 | N/A — a human/approval gate, not code | N/A | N/A | Approval record + timestamp ordering verified on mascots#2. |
| AC2 | `tests/smooth-frames.test.mjs`, `tests/pixel-frames.test.mjs` pin the validator contract | Validator renders + pixel-audits every frame | N/A | Validator run live, twice (shipped frames + fresh render), plus cross-repo byte compare. |
| AC3 | `tests/mascot-qa.test.mjs` pins the captured set + README naming | In-app captures committed | Simulator captures re-driven for poke/sleep | QA directory contents verified; fresh live captures added. |
| AC4 | `tests/preferences.test.mjs` (round-trip, pre-petId), `tests/today.test.mjs:106` (registry) | Settings radio rows render per `PETS` with `accessibilityState.selected` | Default / seeded / unknown-id launches verified live | Home renders the right pack in all three preference states. |
| AC5 | Suite 144/144 | — | Build + launch + interaction on iPhone 18 Pro | All green. |

**High gaps needing app code: none.** Medium/Low (carried to the Reviewer, no bounce): (1) the Settings Mascot page has no screenshot — the nav into Settings is swipe-only (`src/navigation.ts`: home's swipe is the sighted path) and idb cannot synthesize a drag, so the page is pinned by tests rather than driven live; (2) the dizzy mood is likewise not CLI-drivable (documented in `docs/mascots/duck/qa/README.md`); (3) the wiggle-swipe's navigation branch (`App.tsx:532-541`) is covered by unit tests on `isWiggle`/`countFlips` but not by a live end-to-end drag for the same tooling reason.

## Edge-case analysis

| Class | Assessment |
|---|---|
| Unknown / retired pet id | Verified live: falls back to the smooth default, no crash (`08-unknown-id-falls-back-smooth.png`; `components/pets.ts:76-78`). |
| Malformed preferences | `parsePreferences` (`src/preferences.ts:47-60`) errors loudly, never silently resets; pre-`petId` documents parse with the default (pinned `tests/preferences.test.mjs:73`). |
| Language × mascot interaction | Both writers persist the whole document (`App.tsx` `savePreferences` calls), so neither erases the other (pinned `tests/preferences.test.mjs` round-trips). |
| Pack asset integrity | Alpha-in-silhouette + registration checks per frame (validator); a pack missing a frame fails the suite (`tests/today.test.mjs:106`). |
| Mood traps | "Moods never trap nav" (`App.tsx:517`): a decisive swipe from the duck still navigates; unit-pinned, live drag blocked by tooling (above). |
| Money/auth/schema | None — no payment, auth, or schema surface in the diff. |

## Interaction-tooling record (honest limits)

- Taps and long-presses work: poke (`04`), sleep (`05`) driven and captured live.
- Drags do not: three swipe attempts (`02` 0.35 s, `03` 0.5 s, `06` 1.2 s, all leftward ≥ 280 pt, correctly inside the `dx <= -48` contract of `App.tsx:539`) never opened Settings — idb's synthesized touch stream does not drive RN's PanResponder here. The plugin UI backend is also unavailable (`idb_companion` missing). Nothing was faked; the Settings page + switcher are verified through the persistence contract + test pins instead.

## Checks run this round

| Check | Command | Result |
|---|---|---|
| Vendored pack validator (shipped frames) | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs --out assets/mascots/smooth-duck` | PASS, exit 0 |
| Vendored pack validator (fresh render) | `node scripts/mascots/validate-smooth-frames.mjs scripts/mascots/packs/smooth-duck.mjs` | PASS, exit 0 |
| Pixel fallback validator | `node scripts/mascots/validate-frames.mjs scripts/mascots/packs/duck.mjs --out assets/mascots/pixel-duck` | PASS, exit 0 |
| Cross-repo byte compare | `cmp` pack/engine/contact-sheet vs `DayliTracker/mascots@516a5b7` | identical, exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Full suite | `CI=1 npm test` | 144/144, exit 0 |
| Timing preview reproduction | `node scripts/mascots/build-timing-preview.mjs` then `git diff` | byte-identical, clean |
| Build + install + launch | `npx expo run:ios --configuration Release --no-bundler`; `xcrun simctl launch booted com.daylitracker.dayli` | Build Succeeded, 0 errors; pid 53755 |
| Interaction evidence | `idb ui tap/swipe --udid D1685295-…`; `xcrun simctl io booted screenshot` | 9 captures + 2 a11y dumps |
