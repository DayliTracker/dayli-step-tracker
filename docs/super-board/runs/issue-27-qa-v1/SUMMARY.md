# QA evidence — issue #27 v1 · head 53b0f43 (+ QA test commit)

Card: ♻️ [refactor] a11y-labels — one shared a11y sentence-normalizer.
Environment: node v22.14.0, macOS arm64. No screenshots: every AC on this card
is code/test-level (a11y label strings); nothing rendered changes, so there is
no visual state to capture (run.md: non-visual ACs skip the screenshot block).

## Checks run
| Check | Command | Result |
|---|---|---|
| Branch suite | `npm test` (worktree @ 53b0f43) | 32/32 pass |
| Typecheck | `npm run typecheck` | clean, exit 0 |
| Baseline suite | `npm test` (origin/main @ 977d28c extract) | 28/28 pass — AC2's "25/25" is stale; no pre-existing test broke |
| Byte-identical labels | dump-labels.mjs across both revisions | 48/48 identical (`labels-diff.txt` empty diff) |
| Normalizer census | `grep -rnF 'replace(/' src/ App.tsx tests/` | only `src/a11y-text.ts:9` |
| Red-first mutation A | always-append `sentenceSlot` variant | 6 red incl. both new QA tests |
| Red-first mutation B | renamed private copy in progress.ts | red — only the QA tree-scan test |

## AC ledger
| AC | Unit | Component/builder | e2e |
|---|---|---|---|
| AC1 one normalizer, both import it | a11y-text.test.mjs:27 + a11y-labels-qa.test.mjs (tree scan) | grep census: single `replace(/` in src | n/a (static) |
| AC2 existing tests green | 32/32 + typecheck (above); main baseline 28/28 | — | — |
| AC3 no doubled terminator, both builders | a11y-text.test.mjs:14 | today: today.test.mjs:82 + a11y-labels-qa.test.mjs:12,34 · progress: progress.test.mjs:75 | — |

## Test gaps (not written) — Low
- `sentenceSlot('Goal! ')` (terminator followed by trailing whitespace) appends
  a second terminator: "Goal! .". No live copy ends in whitespace (both locales
  checked in src/localization.ts) and the invariant sentence is about period
  runs, so this is a latent cosmetic edge only. If copy ever gains such a
  string, trim before testing the terminator.
- `?`-ending slots are not exercised through `todayA11yLabel` because no live
  Today copy ends in `?`; the unit tests cover `?` and the progress builder
  test pins `?` through a builder (progress.test.mjs:88).
