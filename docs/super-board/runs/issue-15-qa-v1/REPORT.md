# QA report — issue #15 · v1

- Branch: `issue-15-adr-record-no-ui-framework` @ `ef33c13ced6d55c723e5d742f88be00b763b24e5`
- PR: #23 (draft, docs-only: `docs/adr/0001-no-ui-framework.md`, +83)
- Type: documentation — no UI/visual ACs, so no screenshots; evidence is the check logs in this folder.

## Verdict: PASS — 3/3 ACs

| AC | Result | Proof |
|---|---|---|
| 1. `docs/adr/0001-no-ui-framework.md` exists with context, decision, and consequences | ✅ | `test -f` passes; `## Context` :7, `## Decision` :33, `## Consequences` :48 (checks.log) |
| 2. Names explicit revisit triggers rather than an open-ended ban | ✅ | "not an open-ended ban" :71; three numbered triggers — gesture-driven navigation :74, complex charts :77, second mascot renderer :81 (checks.log) |
| 3. The `docs/adr/` pointer in AGENTS.md resolves to a real document | ✅ | AGENTS.md:9 → `docs/adr/`; branch adds `docs/adr/0001-no-ui-framework.md` (checks.log) |

## ADR factual claims vs code (all resolve)

| Claim in ADR | Where verified |
|---|---|
| `Screen` union of six screens, `navigate(state, action)` reducer | `src/navigation.ts:1-14` — union = today/progress/settings/goal/language/health = 6 |
| `RING_SEGMENTS` rotated `View` segments | `src/today.ts:4` — `export const RING_SEGMENTS = 48;` (exact line) |
| Lit clockwise from 12 o'clock | `App.tsx:138` — `function Ring({ lit }...)` (exact line), rotate + translateY, `index < lit` |
| Duck mascot is runtime pixel grid | `App.tsx:155` — `function DuckArt({ cheer }...)` (exact line) |
| Exactly four packages, no UI framework | `package.json` deps = expo, expo-status-bar, react, react-native (checks-citations.log) |
| `expo-font` planned, not installed | absent from `package.json`, `src/`, `App.tsx` |

## Gaps

- No High gaps. Medium/Low (not written): the repo has no markdown lint, so ADR content checks are manual (commands recorded in `checks.log`); `npm ci && npm run typecheck` validates the tree at merge time and covers no part of this docs-only diff.
