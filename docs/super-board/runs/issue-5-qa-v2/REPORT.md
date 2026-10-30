# QA v2 — issue #5 📈 progress: show the latest seven local dates

Re-verification pass after Reviewer round-1 bounce (R1 VoiceOver-reachable manual buttons,
R2 double periods in row a11y sentences). Branch `issue-5-progress-seven-local-dates` @ `ec08efe`.
Built with the project's own Expo tooling (`CI=1 npx expo run:ios`, debug, iPhone 17 iOS 27.0
simulator), driven with `idb ui tap/swipe` + `idb ui describe-all`.

## Checks run

| Check | Command | Result |
|---|---|---|
| Unit suite | `npm test` (`node --experimental-strip-types --test tests/*.test.mjs`) | 24/24 pass |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | clean, exit 0 |
| Runtime a11y (en) | `idb ui describe-all` on Progress | 7 rows newest-first, 7 separate `AXButton "Add manual total — <date>"`, no `..` in any row label → `a11y-progress-en.json` |
| Runtime a11y (vi) | same, after in-app language switch | 7 rows, long vi labels, no `..` → `a11y-progress-vi.json` |
| Runtime a11y (vi · 390 pt) | same on iPhone 17e | 7 rows, no `..` → `a11y-progress-vi-narrow-17e.json` |
| Manual-entry alert | `idb ui tap` on "Add manual total — Today" | alert text verbatim "Manual entry for a date arrives in a later phase. Nothing was saved." + screenshot 02 |
| Larger text | `xcrun simctl ui booted content_size extra-extra-extra-large` / `accessibility-medium` | screenshots 04, 05 — all rows wrap, no clipping |
| Narrow width | iPhone 17e (390 pt), vi | screenshot 06 — labels wrap, no clipping |
| Scroll integrity | `idb ui swipe` to list end | screenshot 07 — rows 4–7 render |

## AC verification

- **AC1 seven local dates, newest first** — ✅ a11y order Today → Thu Oct 29 → … → Sat Oct 24 on
  iPhone 17 (en + vi) and iPhone 17e; unit pins month/year rollback
  (`tests/progress.test.mjs:12`); screenshots 01 + 07.
- **AC2 distinct slots; unavailable ≠ measurement** — ✅ every row renders `— bước/steps` em-dash
  total, goal line, source line; row a11y sentence announces "Your step total will appear…",
  never a number (`a11y-progress-*.json`); screenshot 01.
- **AC3 manual-entry affordance, save rules stay Phase 2** — ✅ per-row button tap opens the
  truthful alert (screenshot 02, dump text above); no persistence anywhere in the diff.
- **AC4 narrow widths + larger text + long vi labels** — ✅ screenshots 04 (XXL),
  05 (accessibility-medium), 06 (390 pt vi); `flexWrap: 'wrap'` + 48 pt target unit-pinned
  (`tests/progress.test.mjs:134`).

## R1 / R2 review-fix verification (runtime, not just unit)

- **R1 (VoiceOver-reachable manual buttons)** — the accessible group wraps only the three slot
  lines (`App.tsx:197-209`); the dump lists each row's button as a **sibling** `AXButton`
  element with a per-date label, 7 buttons for 7 rows, none flattened into a row group.
  Also pinned structurally by `tests/progress.test.mjs:75`.
- **R2 (single periods)** — every row label in all three dumps contains no `..`; the sentence
  normalizer is `src/progress.ts:45`. Pinned by `doesNotMatch(/\.\./)` in
  `tests/progress.test.mjs:51,58,66,72`.

## Test-gap check (issue-scoped)

Ledger (AC → unit / runtime): AC1 `tests/progress.test.mjs:12,117` + dumps; AC2 `:41,130` + dumps;
AC3 `:75,107,117` + alert dump; AC4 `:134` + screenshots. Edges pinned: month/year rollback,
zero-padding, late-evening local key, vi number format (8.000), unique React keys. Loaded-snapshot
UI state is n/a for this phase — the shell truthfully passes `{kind:'unavailable'}` (`App.tsx:179-181`);
the loaded path stays unit-tested (`:54-66`). The R1 source-regex test could pass while runtime
differs; the runtime a11y dumps captured here close that gap. **No High gaps.**

## Out-of-scope finding (filed as a bug card)

The **Today** screen's ring a11y label double-periods: `todayA11yLabel` at `src/today.ts:75-79`
concatenates `copy.stepsUnavailable` (ends ".") with `". "`, so VoiceOver reads
"…connected.. Daily goal: 8,000 steps." — observed in `a11y-today-double-period.json`,
screenshot 08. Same class as R2 but in `src/today.ts`, which came from merged #4 (PR #9) and is
untouched by this diff. Filed via `super-qa-file-bug.sh`; issue number in the QA handoff comment.
