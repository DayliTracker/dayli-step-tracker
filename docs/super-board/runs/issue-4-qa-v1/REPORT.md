# QA report — issue #4 v1 · PR #9 · head `2255ca1`

Tester: super-board Tester lane · 2026-10-30 · device: iPhone 17 (iOS 27.0) simulator, iPhone 17e for narrow width.

## Commands run

| Check | Command | Result |
|---|---|---|
| Builder suite (the `Local tests:` command) | `npm test` | 16/16 pass (12 builder + 4 new QA) |
| Typecheck | `npm run typecheck` | clean, exit 0 |
| Device build | `npx expo run:ios --configuration Release --device "iPhone 17"` | built, installed, launched |
| Accessibility | `idb ui describe-all` (dump: `a11y-today-en-unavailable.json`) | Today card exposes goal line; duck + ring internals hidden from a11y tree |

## Per-AC proof

1. **Presents total, goal, progress, source when available** — PASS. On-device the shell truthfully renders `unavailable` (Phase 1 has no data owner): goal `8,000 steps` and source-unavailable line visible in `01-today-en-unavailable.png`. The loaded path is proven at unit rung: `tests/today.test.mjs:60` asserts the a11y label carries exact count, goal, uncapped ratio, and source; `tests/today.test.mjs:95` pins the App wiring (`litSegments`, `sourceHealth`/`sourceManual`, `goalReached`).
2. **Ring clockwise, caps at goal; count + ratio to sighted and AT users** — PASS. `litSegments` cap tests (`tests/today.test.mjs:13`, new `tests/today-qa.test.mjs:21` pins 7999 → 47 segments, 8000 → 48); clockwise angles `tests/today.test.mjs:23` plus rotate-transform wiring; uncapped ratio text `tests/today.test.mjs:32`; a11y label keeps `1.5× of goal` (`tests/today.test.mjs:60`). Ring renders dark with `—` on device, correct for an unavailable snapshot.
3. **Four states distinguishable, no implied permission denial** — PASS at unit rung: `tests/today.test.mjs:48` (distinct copy EN + VI, no `permission|denied|quyền|từ chối`), `:76` (every state's a11y label keeps the goal). On-device only `unavailable` is reachable in Phase 1, which is the truthful state; copy captured in screenshots 01/02.
4. **Original duck art, no copied/replaced assets** — PASS. Duck renders on device in every screenshot (idle pose); grid/palette/pose tests `tests/today.test.mjs:82`; cheer-swap wiring `:95`; diff touches 5 code files only, zero binary assets added or replaced.
5. **EN + VI, larger text, narrow widths** — PASS. `02` Vietnamese (`8.000 bước`, long copy wraps), `03` XXXL, `03b` AX5 accessibility size (title/tabs wrap, nothing overlaps, ScrollView scrolls), `04` iPhone 17e narrow device. Locale switch driven through real taps via idb (Settings → Ngôn ngữ → Tiếng Việt).

## Mutation checks (red-first proof for new tests)

- Dropped `Number.isFinite` guard in `clampRatio` → 1 new test red. Restored → 16/16.
- `goalReached` `>=` → `>` → 2 tests red (new vi goal-reached + builder's). Restored → 16/16.
- First draft of the clamp test itself failed (asserted `clampRatio(Infinity) === 1`); the code's contract — every non-finite input clamps to 0, `src/today.ts:20` — is deliberate and safe, so the test was aligned to it, not the code.

## Test gaps (not written)

- Medium: `loading`/`empty`/`error` states cannot render on-device in Phase 1 (no data owner); their distinctness is unit-proven only. Rises to visual-verifiable once Phases 2–3 land.
- Medium: no render-rung test of the loaded Today card (no `react-test-renderer` in the project); source-regex wiring tests are the current component rung.
- Low: `tests/today.test.mjs:74` first regex alternative (`Source: Thủ công`) is dead — vi `sourceLabel` is `Nguồn`.
- Low: `formatNumber(NaN)` would render `NaN` in the count if a future producer passed non-finite steps.
