# QA report — issue #11 (QA v1)

**Card:** 🐛 Bug /today — VoiceOver reads a doubled period in the Today ring summary label
**PR:** #22 · branch `issue-11-today-a11y-double-period` · head `b6ccb614740b6c858de045dd4a39772b9f6c0ba9`
**Worktree:** `.claude/worktrees/issue-11-qa/` · base `origin/main` @ `c1a3699`

## Verdict: ✅ PASS — 3/3 AC

## Test plan (one observable test per AC)

| AC | Observable test | Result |
|---|---|---|
| AC1 — ring a11y label has no `..` for all 5 kinds × en/vi | unit: `npm test` → `a11y label never doubles a period in any snapshot kind or locale` (`tests/today.test.mjs:82-103`); runtime: Release build on iPhone 17 (iOS 27.0), `idb ui describe-all` AXLabel of the ring card | ✅ |
| AC2 — unit test pins the single-period invariant | the test above exists on the branch and asserts `doesNotMatch(/\.\./)` for loading/empty/unavailable/error/loaded in en and vi, plus regression pins | ✅ |
| AC3 — `npm test` + `npm run typecheck` green | ran both in the QA worktree at `b6ccb61` | ✅ |

## Commands run and output

```
$ npm ci --silent                       # exit 0
$ npm test                              # exit 0 — 25/25 pass, 0 fail
  ok 23 - a11y label never doubles a period in any snapshot kind or locale
$ npm run typecheck                     # exit 0 — tsc --noEmit clean
$ CI=1 npx expo run:ios --configuration Release \
    --device 77EC52AC-8FB5-4CE2-B248-A27A071541EE --no-bundler \
    -o /tmp/issue-11-qa-v1-build        # exit 0 — 0 errors, 2 warnings
$ xcrun simctl launch 77EC52AC-… com.anonymous.dayli-step-tracker   # pid 11473
$ idb ui describe-all --udid 77EC52AC-…
```

Runtime a11y label of the ring card (en locale, Phase 1 `unavailable` snapshot):

```
"Your step total will appear when step data is connected. Daily goal: 8,000 steps."
```

Single period after "connected" — the pre-fix build produced
`…connected.. Daily goal: 8,000 steps.` on this same element, so the runtime
label content itself proves the fixed binary is what ran.

## Fix under test (read, not assumed)

`src/today.ts:76-79` — `sentence()` strips all trailing periods per slot
(`replace(/\.+$/u)`), keeps a slot's own `!`/`?`/`…` terminator, else appends
exactly one `.`. All five snapshot branches route every slot through it
(`src/today.ts:80-98`). Copy confirmed in `src/localization.ts`: en/vi
`todayLoading` end in `…`, `goalReached` ends in `!`, the other slots end in
`.` — all three terminator classes are exercised by the shipped copy.

## Test-gap ledger (issue-scoped)

| AC | unit | component | e2e/runtime |
|---|---|---|---|
| AC1 | `tests/today.test.mjs:82-103` (5 kinds × 2 locales, doesNotMatch `..`) + regression pin `connected\. Daily goal: 8,000 steps\.$` (:99-100) + `…`-slot pin (:101-102) | none (label consumed via `accessibilityLabel`, `App.tsx:106`) | en `unavailable` on simulator (`a11y-today-single-period-en.json`) |
| AC2 | the test itself, verified present and failing-capable (see mutants below) | — | — |
| AC3 | `npm test` 25/25 + `tsc --noEmit` clean, both run at `b6ccb61` | — | — |

Mutant check (can the test fail?): dropping the `replace` → `connected..` caught
by the `..` assertion and the :100 pin; dropping the `[!?…]` branch → `….` caught
by :102; dropping the appended `.` → missing sentence end caught by :100's `$`
anchor. `tests/today-qa.test.mjs:36` (`Hoàn thành mục tiêu!`) confirms the `!`
terminator survives the normalizer — no test pinned the old buggy output.

Test gaps not written (all Low, none block):
- Runtime a11y evidence covers the `unavailable` kind only — Phase 1 shell
  hard-codes it (`App.tsx:91`); the other four kinds are unit-covered.
- Runtime locale is en only: the Release bundle did not pick up a
  defaults-plist vi override; vi is unit-covered for all five kinds
  (`tests/today.test.mjs:90-98`).
- `sentence('')` returning a lone `.` is unreachable (`.filter(Boolean)` runs
  before `.map(sentence)`, `src/today.ts:97`) but not pinned.

## Evidence files

- `today-unavailable-en-fixed.png` — iPhone 17 (iOS 27.0) screenshot, Today screen
- `a11y-today-single-period-en.json` — full `idb ui describe-all` dump
- `expo-build.log` — Expo Release build log (0 errors)

## Re-run verification (2026-10-31, QA re-dispatch)

The first QA worker committed the evidence above but exited before posting its
report or moving the card. The re-dispatched Tester re-ran every check itself at
branch tip `778209d` (code identical to `b6ccb61`; the evidence commit touches
docs only). Verdict unchanged: ✅ PASS — 3/3 AC.

```
$ npm test              # exit 0 — 25/25 pass, 0 fail
$ npm run typecheck     # exit 0 — tsc --noEmit clean
$ sed mutant: sentence() strip dropped → test 7 'a11y label never doubles a
  period…' goes red (pass 8 / fail 1) → reverted, clean
$ CI=1 npx expo run:ios --configuration Release \
    --device 77EC52AC-8FB5-4CE2-B248-A27A071541EE --no-bundler \
    -o /tmp/issue-11-qa-v2-build        # exit 0 — 0 errors, 2 warnings
$ xcrun simctl launch 77EC52AC-… com.anonymous.dayli-step-tracker   # pid 77299
$ idb ui describe-all --udid 77EC52AC-…
$ xcrun simctl io 77EC52AC-… screenshot today-unavailable-en-rerun.png
```

Re-run ring label, verbatim from the fresh `idb ui describe-all` dump of the
newly built Release binary:

```
"Your step total will appear when step data is connected. Daily goal: 8,000 steps."
```

Mutant check (the shipped test can fail): reverting only the `sentence()` strip
(`src/today.ts:77`) makes the invariant test fail — `not ok 7`, 8 pass / 1 fail
— then restored. The screenshot shows the fixed Today screen rendering.

Additional evidence files from the re-run:

- `today-unavailable-en-rerun.png` — re-captured Today screen
- `a11y-today-single-period-en-rerun.json` — re-captured `idb ui describe-all` dump
- `expo-build-rerun.log` — re-run Expo Release build log (0 errors, 2 warnings)
