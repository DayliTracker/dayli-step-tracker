# Issue #20 — QA v2 test-gap ledger (rebuild diff `27d2605`)

Diff scope: App.tsx (+55/−11), src/localization.ts (+2), tests/shell.test.mjs,
tests/progress.test.mjs. The step-read adapter and resolver code are unchanged from the
QA v1 review (`docs/super-board/runs/issue-20-qa-v1/TEST-GAP.md`).

## Ledger — AC4's removal clause (the rebuilt clause)

| Rung | Asserting file:line | Status |
|---|---|---|
| unit — store API: create/edit/remove each of the seven dates, no residue | tests/manual-totals.test.mjs:104 | pinned |
| unit — removing an absent date leaves the record alone | tests/manual-totals.test.mjs:136 | pinned |
| unit — removing one date leaves neighbors untouched | tests/manual-totals.test.mjs:140 | pinned |
| unit — resolver: removal reveals the Health total | tests/health-steps.test.mjs:128 | pinned |
| unit — resolver: removal reveals the neutral no-data state | tests/health-steps.test.mjs:132 | pinned |
| unit — the confirmed-write contract the removal writes through (failing backend) | tests/manual-totals.test.mjs:170 | pinned |
| source-guard — the popup wires Remove to the store (`hasManual` gate, `removeManualTotal`, destructive color) | tests/shell.test.mjs:139 | pinned |
| source-guard — `manualRemove` copy required in both locales, distinct | tests/progress.test.mjs:115,123 | pinned |
| live — the handler driven end-to-end on the simulator (this pass) | docs/super-board/runs/issue-20-qa-v2/EVIDENCE.md | ✅ observed |

## Edge cases on the rebuilt path

| Edge | Verdict |
|---|---|
| Stored manual 0 (rest day) — is Remove offered? | Yes: `manualTotalForDate` returns 0 (valid), so `hasManual` is true — the stepper offers Remove for a rest day. **Observed live** (09-stepper-rest-day-remove-offered.png → 10). This is the exact witness QA v1 failed on. |
| Date with no manual total — is Remove hidden? | Yes: `hasManual: existing !== null` (App.tsx:795) — **observed live** (04-stepper-no-manual-no-remove.png). |
| Removing an absent/invalid date | Store returns the record unchanged (tests/manual-totals.test.mjs:136); the UI never reaches it — the button only renders when a valid total exists. |
| Failed storage write during removal | Same confirmed-write contract as Save: the previous record is kept and the reason is surfaced into the manual state's error (App.tsx:286). Pinned at the contract level (tests/manual-totals.test.mjs:170); the handler branch mirrors `applyManualTotal`'s reviewed shape. |
| Precedence after removal through a Health refresh | The resolver has no memory of a removed total — the store is the only source (tests/health-steps.test.mjs:128,:132). |

## Test the tests

- The shell pin (tests/shell.test.mjs:139) is a source-pattern guard, the repo's
  established shell-testing idiom (#44). It cannot fail on behavior — it fails on wiring
  drift. The behavioral load is carried by the store/resolver unit tests plus this pass's
  live drive; that combination is what makes AC4 testable at all three rungs.
- Surviving-mutant check on the guard: deleting the `{stepper.hasManual && (...)}` render
  would fail the source guard (pattern `{stepper\.hasManual && \(`) and was separately
  observed live (step 04: no Remove without a manual total).

## Gaps (not written)

- **Low** — race window: if the manual state drifts to not-ready between opening the
  stepper and pressing Remove, `applyManualRemoval` returns early and the popup closes
  without a write (App.tsx:265). Benign: nothing is removed or lost; rows re-render from
  the store. Not worth an async race harness.
- **Low** — no unit test drives `applyManualRemoval` itself (it is inline React in
  App.tsx; the repo tests the shell by source shape and the owners by behavior). The live
  drive covers the composed behavior; noted so a future refactor of the handler keeps the
  live check in mind.

No High gaps on the rebuild diff. AC1 / AC6's device-evidence halves remain outside this
host's reach (physical iPhone; F2 unchanged) — stated limits, not test gaps.
