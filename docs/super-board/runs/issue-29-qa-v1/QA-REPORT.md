# Issue #29 QA report — v1

**Outcome:** Pass — 5/5 acceptance criteria
**PR:** [#48](https://github.com/DayliTracker/dayli-step-tracker/pull/48)
**Reviewed head:** `185436e154231f95e4739fb7b0b37430f8730efa`
**Base:** `origin/main` at `dbe1d3f` (PR #46 merged)
**Branch:** `issue-29-mascot-daily-speech-bubble-and-messages`
**Device evidence:** iPhone 18 Pro simulator, iOS 27.0, `com.anonymous.dayli-step-tracker` Release build (xcodebuild `-destination 'generic/platform=iOS Simulator'`) from this head; screenshots + idb accessibility dump in this folder. Interactions via `idb ui tap/text/key`; the AX dump is independently checked by `scripts/qa-a11y-check.mjs` (PASS, `a11y-check-output.txt`). The 2026-10-31/issue-17 host drift did not reproduce: `xcrun simctl` responded normally, no shim needed.

## Acceptance criteria

| AC | Result | Observable evidence |
|---|---|---|
| The bubble shows an idle line every ~18–25s, holds ~4s, fades; the pick is date-deterministic for the first line, random after. | Pass | On device: with no manual total, the day's first line appears after the 2s settle and is **exactly the pure function's pick for 2026-11-06** in both locales — vi `dateIdleLine` = "thấy bạn vui quá" (`03-vi-date-deterministic-first-line`), en = "nice to see you" (`11-en-date-deterministic-first-line`); both computed on the host with the same function (`node --experimental-strip-types`, output in this report's session log). The line is gone by `04-faded-after-4s-hold` (hold 4s + 350ms fade). Later lines are random draws: vi nudge "chân tui sẵn sàng" (`06-second-idle-line-random`), en nudge "steps won't count themselves" mid-fade (`10-en-idle-line-mid-fade`). Unit: determinism + pool membership `tests/bubble.test.mjs:57-70,72-83`; hold/cadence constants `tests/bubble.test.mjs:137-148`. |
| Poke, walk, celebrate, dizzy, and stroll each surface their event line; #42's lead/greeting reuse the same pools. | Pass (dizzy/stroll/lead/homecome at unit level, as the PR's AC block states) | On device: poke → "ơi!" with the surprised hop + heart (`05-poke-event-line`); celebrate → cheer pool in vi "bạn number one" (`08-celebrate-cheer-line`) and en "best human ever" (`09-en-cheer-after-locale-switch`), "WE DID IT!" during the AX-dump capture (`02b-ax-dump-moment-line-visible`). Unit: every event category picks inside its pool incl. dizzy/stroll/lead/homecome `tests/bubble.test.mjs:72-83`; the engine fires poke from the handler and walk/celebrate once per mood entry, with a bumped nonce so repeats speak `tests/bubble.test.mjs:120-135`; `bubbleLines` is #42's reuse surface. Walk's on-device limits are an observation below, not an AC failure. |
| Pools are complete in en and vi; no line duplicates UI copy. | Pass | Unit: all 9 categories × both locales have the prototype-v4 pool sizes, non-empty, no repeats, verbatim wording, and no line equals any UI copy string `tests/bubble.test.mjs:24-55`. On device: vi and en lines from the cute/nudge/poke/cheer pools (files above), and the Settings→Language switch feeds the bubble live (`09`, `11`). |
| The bubble ignores touches and is hidden from the a11y tree as decoration; the duck tap target is labeled. | Pass | On device: `idb ui describe-all` while the bubble was fully visible ("WE DID IT!", `02b-ax-dump-moment-line-visible.png` proves the window) returns only 4 elements — Application, the Today group label, the two tabs — **no bubble text in the tree** (`02-ax-tree-while-bubble-visible.json`); repo checker `scripts/qa-a11y-check.mjs` → PASS (`a11y-check-output.txt`). A tap where the duck sits poked it (`05`), and the duck's Pressable carries `accessibilityRole="button"` + the bilingual `petPoke` label (code-pinned: `components/PixelPet.tsx:313-320`, `App.tsx` passes `copy.petPoke`; asserted by `tests/bubble.test.mjs:108-118`). The home slot intentionally hides itself and the poke control from VoiceOver so the group label stays the single screen-reader source (pinned by `tests/today.test.mjs`). Unit: `pointerEvents="none"`, `accessible={false}`, both platform flags, and no Pressable inside the bubble `tests/bubble.test.mjs:85-93`. |
| `npm run typecheck` and `npm test` pass. | Pass | Rerun in the QA worktree on this head: `npm run typecheck` exit 0 (`typecheck-output.txt`); `npm test` 108/108 pass, node v22.14.0 (`test-output.txt`). |

## Test-gap check (after build)

Every AC maps to unit + device evidence above; no High gap that needs app code changed. Remaining gaps (not written, not blocking):

- **Medium:** the 18–25s chatter cadence is sample-verified on device (idle lines captured ~21s and ~36s apart across two sessions), not stopwatch-verified; the exact cadence is pinned at unit level (`tests/bubble.test.mjs:140-141`).
- **Medium:** walk's on-device path is unreachable in this phase shell — see observation. The idle→walk transition and its event are pinned at unit level (`tests/bubble.test.mjs:127` for the hook, `tests/today.test.mjs` for the mood machine), so no test was added.
- **Low:** the poke tap that reached the duck lands below the bubble's dock, so touch-through *under the bubble itself* is asserted at unit level (`pointerEvents="none"`, `tests/bubble.test.mjs:85-88`) rather than produced on device; the AX dump showing the bubble absent from the tree corroborates it as decoration.

## Observations (not AC failures)

- **Walk event on device:** with a seeded manual total of 1.000 (progress 0.125), a relaunch spoke the date-deterministic idle line, not a walk line (`07-walk-observation-date-line-spoke`). Reason: the app loads manual totals before the Today screen mounts, so `progress` never rises while Today is mounted — the initial mood is computed from the loaded progress and `prevProgress` initializes to it, so no idle→walk transition exists to fire. Edits happen on other screens, and returning remounts Today the same way. This matches the issue-17 phase-shell limitation class ("no step source; on-device they render the truthful shell"). The walk pool + event wiring are unit-pinned; when a live step source lands (phase 3) the transition becomes reachable.
- Celebrate fires on every Today mount while progress ≥ 1 (mood initializes to 'celebrate', and the mount effect fires the event) — observed across three separate launches; consistent with "mood entries fire once per transition".
- The Dynamic Island overlaps the status bar in `10-en-idle-line-mid-fade` and `11` — a simulator compositing artifact of the capture, not app UI.

## Verification limits

No HealthKit/step-source exists in this phase; walk/celebrate progress states were produced by the app's own manual-total editor (its only step source). Dizzy/stroll triggers land with #43 and lead/homecome with #42 — their pools and the event-line surfacing are unit-level until then, exactly as the PR's AC block states.
