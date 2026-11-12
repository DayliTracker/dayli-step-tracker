# Issue #21 — QA verification report (v1)

Executed 2026-11-12 by the super-board Tester at PR #64 head `fcffe88`
(docs-only diff vs `origin/main`, verified with
`git diff origin/main...HEAD --name-only` — no app code changed, so the
builder's committed unit evidence transfers; it was re-run here anyway).

## Checks run at this head (this run, this host)

| Command | Result |
|---|---|
| `npm ci --silent && npm run typecheck` | npm ci exit 0 · typecheck exit 0 (`verify-and-typecheck.log`) |
| `npm test` | **158/158 pass, 0 fail, 0 skipped** (`test-suite-fcffe88.log`) |
| `git ls-files \| grep -E 'server\|backend\|firebase\|analytics\|\.sql'` | zero app files match (matrix row 16 re-verified; docs/ excluded by hand) |
| `package.json` dependency scan | no analytics/telemetry/network-client dependencies (supports the "sends nothing to a server" claim) |
| `xcrun devicectl list devices` | simulated devices only — no physical iPhone attached (AC2's premise holds; gate stays PENDING) |
| plan.md "Agreed product scope" vs matrix rows | exactly 16 scope bullets ↔ 16 matrix rows, 1:1 in order |
| cited-test spot check | 14 exact test names cited in `docs/verification-matrix.md` each appear once and pass in this run's TAP |

## AC verdicts

- **AC1 ✅** — every one of plan.md's 16 in-scope scope bullets maps to matrix
  row 1–16 with check/target/result/evidence; a11y/localization rows sit in
  their own table; physical rows are recorded PENDING (the
  "recorded, explicitly accepted limitation" branch of the AC, not a claim).
- **AC2 ✅ (as recorded)** — the physical-iPhone gate exists with PASS
  criteria (`docs/verification-matrix.md` "Physical-iPhone HealthKit gate —
  PENDING") and `docs/release-readiness.md` marks readiness **NOT READY**;
  readiness is never marked complete, which is what the AC conditions on.
- **AC3 ✅** — all five cross-phase invariant test names pass in this run's
  158/158 TAP at the PR head; simulator dev-build evidence committed by the
  builder covers the UI class these rules render through; on-hardware
  confirmation rides the physical gate.
- **AC4 ✅** — `npm ci`, `npm run typecheck`, `npm test` run clean here;
  `npm start` = `expo start` exists in `package.json` (long-running server,
  not executed); the README's native commands match the verified workflow
  recorded at `docs/healthkit-native-setup.md:80-82` (iOS 16.4 floor, :10).
  No invented commands found.
- **AC5 ✅ (with recorded limitation)** — AX5 + VI screenshots are committed
  dev-build screens; a11y-label and AX5-geometry unit tests pass here; the
  AX5 bubble clipping is recorded honestly as an observation
  (`issue-21-build/EVIDENCE.md:28-35`); VoiceOver/Dynamic Type on hardware is
  the PENDING gate consistent with the NOT READY verdict.
- **AC6 ✅** — all four claim classes (background refresh, cloud backup,
  data recovery, health-data storage) are stated as absences in the
  `docs/release-readiness.md` drafts, each backed by a passing test or the
  repo scan above.

## Test gaps (not written)

- Low: `npm start` and the native `expo run:ios` rebuild were not re-executed
  by QA (long-running server / Xcode build); the builder's committed
  `prebuild.log` and SIM screenshots cover them.

## Verdict

**PASS** — all six ACs verified; card moves QA → Review.
