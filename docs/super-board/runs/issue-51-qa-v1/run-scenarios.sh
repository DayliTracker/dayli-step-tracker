#!/usr/bin/env bash
# Issue #51 QA harness — runs the REAL .claude/bin/super-board-preflight.sh
# (branch fix at the worktree root) and the origin/main baseline against a
# stubbed `gh` serving canned issue/PR bodies. No GitHub writes, no network:
# PATH is prefixed with stub-bin/gh, which reads fixtures/ only.
#
# Rerun from the worktree root:  bash docs/super-board/runs/issue-51-qa-v1/run-scenarios.sh
set -uo pipefail
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WT=$(cd "$HERE/../../../.." && pwd)
FIXED="$WT/.claude/bin/super-board-preflight.sh"
BASE="$HERE/baseline/super-board-preflight.sh"
REPO="DayliTracker/dayli-step-tracker"
OUT="$HERE/outputs"; mkdir -p "$OUT"

# Baseline: the pre-fix script from origin/main, plus its sibling read helper.
mkdir -p "$HERE/baseline"
git -C "$WT" show origin/main:.claude/bin/super-board-preflight.sh > "$HERE/baseline/super-board-preflight.sh"
cp "$WT/.claude/bin/super-board-github-read.py" "$HERE/baseline/super-board-github-read.py"

run() { # run <label> <script> <fixture-dir> [args...]
  local label="$1" script="$2" fix="$3"; shift 3
  SB_STUB_FIXTURES="$fix" PATH="$HERE/stub-bin:$PATH" \
    bash "$script" --repo "$REPO" "$@" \
    > "$OUT/$label.json" 2> "$OUT/$label.stderr"
  echo "$?" > "$OUT/$label.exit"
}

# --- AC1: two Ready cards both naming root-level App.tsx ---
run ac1-two-peer-fixed    "$FIXED"  "$HERE/fixtures/ac1" --issues 60,61 --inflight "$HERE/fixtures/ac1/inflight.json"
run ac1-two-peer-baseline "$BASE"   "$HERE/fixtures/ac1" --issues 60,61 --inflight "$HERE/fixtures/ac1/inflight.json"
run ac1b-single-fixed     "$FIXED"  "$HERE/fixtures/ac1" --issues 60   --inflight "$HERE/fixtures/ac1/inflight.json"

# --- AC2a: open-PR overlap on a slashed path (existing case) ---
run ac2a-open-pr-fixed    "$FIXED"  "$HERE/fixtures/ac2a" --issues 62 --inflight "$HERE/fixtures/ac2a/inflight.json"
run ac2a-open-pr-baseline "$BASE"   "$HERE/fixtures/ac2a" --issues 62 --inflight "$HERE/fixtures/ac2a/inflight.json"

# --- AC2a-files: same overlap via --files (CLI contract intact) ---
run ac2a-files-mode       "$FIXED"  "$HERE/fixtures/ac2a-files" --issues 62 --files "src/api/stream.ts" --inflight "$HERE/fixtures/ac2a-files/inflight.json"

# --- AC2b: two Ready peers on a slashed path (existing peer case) ---
run ac2b-two-peer-fixed   "$FIXED"  "$HERE/fixtures/ac2b" --issues 63,64 --inflight "$HERE/fixtures/ac2b/inflight.json"
run ac2b-two-peer-baseline "$BASE"  "$HERE/fixtures/ac2b" --issues 63,64 --inflight "$HERE/fixtures/ac2b/inflight.json"

# --- AC2c: dot-prefixed path overlap (regression probe) ---
run ac2c-dot-path-fixed   "$FIXED"  "$HERE/fixtures/ac2c" --issues 65 --inflight "$HERE/fixtures/ac2c/inflight.json"

# --- AC3 (noise probe): two peers sharing only prose "e.g." — known trade-off ---
run ac3-noise-e-g          "$FIXED"  "$HERE/fixtures/ac3-noise" --issues 66,67 --inflight "$HERE/fixtures/ac3-noise/inflight.json"

# --- CLI contract: usage errors still exit 64 ---
PATH="$HERE/stub-bin:$PATH" bash "$FIXED" > "$OUT/usage-noargs.json" 2>&1
echo "$?" > "$OUT/usage-noargs.exit"
PATH="$HERE/stub-bin:$PATH" bash "$FIXED" --repo "$REPO" --issues abc > "$OUT/usage-bad-issues.json" 2>&1
echo "$?" > "$OUT/usage-bad-issues.exit"

# --- paths() characterization: what the def captures, fixed vs baseline ---
extract_def() { sed -n '/def paths:/s/^ *//p' "$1"; }
mkdir -p "$HERE/gen"
{ extract_def "$FIXED";  echo; echo '{input: ., captured: ({body: .} | paths)}'; } > "$HERE/gen/probe-fixed.jq"
{ extract_def "$BASE";   echo; echo '{input: ., captured: ({body: .} | paths)}'; } > "$HERE/gen/probe-baseline.jq"
jq -Rc -f "$HERE/gen/probe-fixed.jq"    "$HERE/corpus.txt" > "$OUT/paths-probe-fixed.json"
jq -Rc -f "$HERE/gen/probe-baseline.jq" "$HERE/corpus.txt" > "$OUT/paths-probe-baseline.json"

# --- assertions ---
: > "$OUT/assertions.txt"
assert() { # assert <desc> <file> <jq-expr> <expected-json>
  local desc="$1" file="$2" expr="$3" want="$4" got
  got=$(jq -c "$expr" "$file" 2>&1)
  if [ "$got" = "$want" ]; then echo "PASS  $desc" >> "$OUT/assertions.txt"
  else echo "FAIL  $desc · got=$got · want=$want" >> "$OUT/assertions.txt"; fi
}
O="$OUT"
assert "AC1 fixed: #60 (lower) proceeds"                    "$O/ac1-two-peer-fixed.json"    '.["60"].verdict'                                        '"proceed"'
assert "AC1 fixed: #61 sequences"                           "$O/ac1-two-peer-fixed.json"    '.["61"].verdict'                                        '"sequence"'
assert "AC1 fixed: #61 blockedBy #60"                       "$O/ac1-two-peer-fixed.json"    '.["61"].blockedBy'                                      '[60]'
assert "AC1 fixed: #61 evidence names App.tsx from BOTH bodies" "$O/ac1-two-peer-fixed.json" '.["61"].evidence'                                     '["#60 touches App.tsx"]'
assert "AC1 fixed: output keys exactly 60,61"               "$O/ac1-two-peer-fixed.json"    'keys'                                                   '["60","61"]'
assert "AC1 baseline: #61 does NOT sequence (bug reproduced)" "$O/ac1-two-peer-baseline.json" '.["61"].verdict'                                      '"proceed"'
assert "AC1b fixed: bare filename alone does not hold #60"  "$O/ac1b-single-fixed.json"     '.["60"].verdict'                                        '"proceed"'
assert "AC2a fixed: #62 sequences on open-PR overlap"       "$O/ac2a-open-pr-fixed.json"    '.["62"].verdict'                                        '"sequence"'
assert "AC2a fixed: evidence names src/api/stream.ts"       "$O/ac2a-open-pr-fixed.json"    '.["62"].evidence'                                       '["open PR #70 touches src/api/stream.ts"]'
assert "AC2a fixed: conflictWith PR 70, blockedBy empty"    "$O/ac2a-open-pr-fixed.json"    '[.["62"].conflictWith, .["62"].blockedBy]'              '[[70],[]]'
assert "AC2a baseline: pre-fix behavior identical (sequence)" "$O/ac2a-open-pr-baseline.json" '.["62"].verdict'                                      '"sequence"'
assert "AC2a-files: --files mode still sequences"           "$O/ac2a-files-mode.json"       '.["62"].verdict'                                        '"sequence"'
assert "AC2b fixed: #63 (lower) proceeds"                   "$O/ac2b-two-peer-fixed.json"   '.["63"].verdict'                                        '"proceed"'
assert "AC2b fixed: #64 sequences behind #63"               "$O/ac2b-two-peer-fixed.json"   '[.["64"].verdict, .["64"].blockedBy, .["64"].evidence]' '["sequence",[63],["#63 touches src/api/stream.ts"]]'
assert "AC2b baseline: pre-fix behavior identical"          "$O/ac2b-two-peer-baseline.json" '[.["63"].verdict, .["64"].verdict]'                    '["proceed","sequence"]'
assert "AC2c fixed: dot-prefixed path overlap keeps the leading dot" "$O/ac2c-dot-path-fixed.json" '.["65"].evidence'                                  '["open PR #71 touches .claude/bin/super-board-preflight.sh"]'
assert "AC3 noise: shared prose e.g. spuriously sequences #67 (documented trade-off)" "$O/ac3-noise-e-g.json" '[.["67"].verdict, .["67"].blockedBy, .["67"].evidence]' '["sequence",[66],["#66 touches e.g"]]'
assert "CLI: no args exits 64"                              "$O/usage-noargs.exit"          '.'                                                      '64'
assert "CLI: --issues abc exits 64"                         "$O/usage-bad-issues.exit"      '.'                                                      '64'

grep -c '^PASS' "$OUT/assertions.txt" > "$OUT/pass-count.txt" || true
echo "--- assertions ($(cat "$OUT/pass-count.txt") passed) ---"
cat "$OUT/assertions.txt"
