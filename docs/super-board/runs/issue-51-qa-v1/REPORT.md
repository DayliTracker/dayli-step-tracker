# QA report · issue #51 · preflight file-overlap regex misses bare filenames

Branch `issue-51-preflight-file-overlap-bare-filenames` · head `35dea0d` · PR #61 (draft).
Change under test: `.claude/bin/super-board-preflight.sh:97` — the `paths` def's slash
group went from `(?:/[A-Za-z0-9_.-]+)+` to `(?:/[A-Za-z0-9_.-]+)*`, so bare filenames
match. One regex, CLI untouched (verified below).

## How this was tested

The real script runs end-to-end against a stubbed `gh` (`stub-bin/gh`) that serves
canned issue/PR bodies from `fixtures/`. `super-board-github-read.py` shells out to
`gh` from PATH, so `PATH=stub-bin:$PATH` redirects every read the script makes —
guard quota, `pr list`, `issue list`, `issue view` — with zero GitHub writes and no
network. `run-scenarios.sh` also extracts the pre-fix script from `origin/main`
(`baseline/`, regenerated at runtime) and runs the same scenarios against it, so
every verdict is shown fixed vs baseline. 19 assertions, all passing:
`outputs/assertions.txt`.

## AC1 — two-Ready-card wave both touching root-level `App.tsx` sequences the lower number

`outputs/ac1-two-peer-fixed.json` (`--issues 60,61`, both bodies name `App.tsx`,
unrelated titles, both Ready in `inflight.json`):

- `#60` → `proceed` · tag `clean`
- `#61` → `sequence` · tag `overlap` · `blockedBy [60]` · evidence `#60 touches App.tsx`

The evidence string is the intersection of both bodies' parsed path sets, so
`App.tsx` was captured as a candidate path from BOTH cards — the lower-numbered
card proceeds, the other is sequenced behind it. Baseline (`outputs/ac1-two-peer-baseline.json`):
both verdicts `proceed` — the bug reproduced: bare `App.tsx` escaped the parse and
no sequencing fired. `ac1b-single` shows a bare filename alone does not hold a card
(`#60` still `proceed`).

## AC2 — existing overlap cases still sequence

| Scenario | Fixed | Baseline |
|---|---|---|
| open PR #70 touches `src/api/stream.ts`, card names it | `sequence`, evidence `open PR #70 touches src/api/stream.ts`, `conflictWith [70]`, `blockedBy []` | identical |
| two peers both naming `src/api/stream.ts` | `#63 proceed`, `#64 sequence blockedBy [63]` | identical |
| same overlap reached via `--files src/api/stream.ts` | `sequence` (CLI contract intact) | n/a |
| dot-prefixed `.claude/bin/super-board-preflight.sh` vs PR file path | `sequence`, leading dot kept, exact match against the PR's file path | identical |

The dot-path row is the regression probe for the issue body's alternative wording
("anchor on word boundary"): a literal leading `\b` would strip the dot from
`.claude/...` tokens and break exact matching against PR file lists. The shipped
optional-slash fix keeps dot-prefixed paths byte-identical (`outputs/paths-probe-*.json`).

## Finding — new noise class, bounded (medium, does not block)

The loosened regex newly captures bare dotted non-file tokens:
`outputs/paths-probe-fixed.json` — `50.0.0` · `e.g` · `127.0.0.1` · `v2.0` from the
corpus; baseline captured none of them. Consequence, demonstrated in
`outputs/ac3-noise-e-g.json`: two Ready cards whose bodies share only prose "e.g."
sequence the higher one (`#67 sequence · blockedBy [66] · evidence "#66 touches e.g"`).
Impact is bounded: it needs the same noise token in two cards of one `--issues`
batch (or an open PR file list), the card is freed by the wave-start sweep when the
lower card closes, and the pre-flight agent reviews each verdict semantically before
acting. Tightening further (letter-leading extensions, `\b` anchors) was probed and
rejected — each variant trades this noise for harder failures (dot-prefixed path
mismatch, 1-char extensions like `.c`). Revisit only if a spurious sequence lands
on a real wave.

## Live integration runs (real repo, read-only)

- `outputs/live-ready-batch.json` — `--issues 2,14` on the real board: both `hold` ·
  tag `done` (PR #7 / PR #33 merged and close them). Script green end-to-end on real data.
- `outputs/live-self-51.json` — `--issues 51`: verdict `sequence` · tag `overlap` ·
  evidence `open PR #60 touches App.tsx` · `conflictWith [60]` · `blockedBy []`. Issue #51's
  own body names bare `App.tsx`; open PR #60 (`issue-20-phase-3-step-reads`) really does
  touch root-level `App.tsx` (checked via `gh pr view 60 --json files`). Before the fix
  this bare name was invisible to the parse — this is the exact Wave R gap the issue
  cites, now caught mechanically. Per the script's outcomes table, empty `blockedBy`
  routes to proceed-with-conflict-note, so the verdict does not park anything.

## CLI contract

- no args → exit 64 (`outputs/usage-noargs.exit`)
- `--issues abc` → exit 64 (`outputs/usage-bad-issues.exit`)
- `--files`, `--inflight`, `--threshold` parsing untouched (diff is one jq def + one comment)
- `bash -n` clean; all 9 scenario runs exit 0; every stderr capture empty

## Verdict

- AC1 ✅ — `outputs/ac1-two-peer-fixed.json` + baseline repro
- AC2 ✅ — `outputs/ac2*.json`

Rerun everything: `bash docs/super-board/runs/issue-51-qa-v1/run-scenarios.sh`
(from the worktree root; regenerates `baseline/` and `gen/`).
